import { useState, useEffect, useRef } from 'react';
import { db, isFirebaseConfigured } from '../config/firebase';
import { getQuestion, preloadQuestions } from '../data/questions';
import {
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';

export interface Player {
  id: string;
  name: string;
  score: number;
  skills: ('skipTurn' | 'changeQuestion' | 'customTargetQuestion')[];
  isReady: boolean;
  isPresent: boolean;
  avatar: string;
}

export interface RoomSettings {
  turnTimeLimit: number;       // in seconds, 0 = unlimited
  allowGiftingPoints: boolean;
  enabledSkills: {
    skipTurn: boolean;
    changeQuestion: boolean;
    customTargetQuestion: boolean;
  };
}

export interface TurnState {
  activePlayerId: string;
  typeSelected: 'truth_leve' | 'truth_picante' | 'dare_leve' | 'dare_picante' | 'custom' | null;
  content: string; // The text of the question or challenge
  customQuestionTargetId?: string; // Target of a custom question
  votes: {
    [playerId: string]: 'COMPLIED' | 'FAILED';
  };
  startedAt: number;
}

export interface Room {
  id: string;
  createdAt: number | any; // Allows serverTimestamp()
  creatorId: string;
  status: 'LOBBY' | 'SELECTING' | 'WAITING_RESPONSE' | 'VOTING' | 'FINISHED';
  settings: RoomSettings;
  players: {
    [playerId: string]: Player;
  };
  playerOrder: string[];
  currentTurnIdx: number;
  currentTurn: TurnState | null;
  // Queued custom questions for players: { [targetPlayerId]: customQuestionText }
  customQueuedQuestions?: {
    [playerId: string]: {
      senderName: string;
      text: string;
    };
  };
}

export const SKILL_COSTS = {
  skipTurn: 30,
  changeQuestion: 20,
  customTargetQuestion: 50
};

// Generate a random 6-letter room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a unique ID for the local player
function generatePlayerId(): string {
  return 'p_' + Math.random().toString(36).substr(2, 9);
}

// BroadcastChannel for syncing tabs when Firebase is not configured
const mockChannel = typeof window !== 'undefined' ? new BroadcastChannel('verdad_o_reto_sync') : null;

export function useGameRoom(roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Persist playerId in sessionStorage so it survives page reloads
  const [playerId] = useState<string>(() => {
    const saved = sessionStorage.getItem('vor_player_id');
    if (saved) return saved;
    const newId = generatePlayerId();
    sessionStorage.setItem('vor_player_id', newId);
    return newId;
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    return sessionStorage.getItem('vor_player_name') || '';
  });

  // Track the room state using a ref for real-time listener handlers to avoid stale closures
  const roomRef = useRef<Room | null>(null);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Save name helper
  const savePlayerName = (name: string) => {
    setPlayerName(name);
    sessionStorage.setItem('vor_player_name', name);
  };

  // --- REAL-TIME LISTENER ---
  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      return;
    }

    setLoading(true);
    setError(null);

    if (isFirebaseConfigured && db) {
      // Preload questions once (no onSnapshot listener to save reads)
      preloadQuestions(db);

      // Firebase Mode: Listen to Firestore document updates
      const docRef = doc(db, 'rooms', roomId);
      const unsubscribe = onSnapshot(docRef, 
        (snapshot) => {
          if (snapshot.exists()) {
            setRoom(snapshot.data() as Room);
          } else {
            setError('La sala de juego no existe.');
            setRoom(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error("Firestore error: ", err);
          setError('Error al conectar con la sala.');
          setLoading(false);
        }
      );

      return () => {
        unsubscribe();
      };
    } else {
      // Mock Mode: Read initial room from LocalStorage and listen to BroadcastChannel
      const loadLocalRoom = () => {
        const savedRooms = localStorage.getItem('vor_mock_rooms');
        if (savedRooms) {
          const roomsMap = JSON.parse(savedRooms);
          if (roomsMap[roomId]) {
            setRoom(roomsMap[roomId]);
          } else {
            setError('La sala de juego no existe localmente.');
            setRoom(null);
          }
        } else {
          setError('No hay salas de juego creadas.');
          setRoom(null);
        }
        setLoading(false);
      };

      loadLocalRoom();

      // Listen to tab synchronization broadcasts
      const handleBroadcast = (event: MessageEvent) => {
        const message = event.data;
        if (message && message.roomId === roomId) {
          if (message.type === 'UPDATE') {
            setRoom(message.room);
          } else if (message.type === 'DELETE') {
            setRoom(null);
            setError('La sala fue eliminada.');
          }
        }
      };

      if (mockChannel) {
        mockChannel.addEventListener('message', handleBroadcast);
      }

      return () => {
        if (mockChannel) {
          mockChannel.removeEventListener('message', handleBroadcast);
        }
      };
    }
  }, [roomId]);

  // --- ATOMIC STATE MUTATOR ---
  // Helper to safely mutate the room state via transactions to avoid race conditions 
  // when millions of players are playing concurrently.
  const mutateRoomState = async (updater: (currentRoom: Room) => Room | null) => {
    if (!roomId) return;
    
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, 'rooms', roomId);
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(docRef);
        if (!sfDoc.exists()) throw new Error("La sala no existe.");
        
        const currentRoom = sfDoc.data() as Room;
        const newRoom = updater(currentRoom);
        if (newRoom) {
          transaction.set(docRef, newRoom);
        }
      });
    } else {
      // Save locally (simulating atomic update by locking to synchronous execution)
      const savedRooms = localStorage.getItem('vor_mock_rooms');
      const roomsMap = savedRooms ? JSON.parse(savedRooms) : {};
      const currentRoom = roomsMap[roomId];
      if (!currentRoom) throw new Error("La sala no existe localmente.");
      
      const newRoom = updater(currentRoom);
      if (newRoom) {
        roomsMap[newRoom.id] = newRoom;
        localStorage.setItem('vor_mock_rooms', JSON.stringify(roomsMap));
        setRoom(newRoom);

        // Broadcast to other tabs
        if (mockChannel) {
          mockChannel.postMessage({
            type: 'UPDATE',
            roomId: newRoom.id,
            room: newRoom
          });
        }
      }
    }
  };

  // --- ACTIONS ---

  // 1. Create a Game Room
  const createRoom = async (creatorName: string, settings: RoomSettings, avatar: string) => {
    savePlayerName(creatorName);

    let code = '';
    let isUnique = false;
    
    // Collision checker loop for scaling to millions
    while (!isUnique) {
      code = generateRoomCode();
      if (isFirebaseConfigured && db) {
        const docRef = doc(db, 'rooms', code);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) {
          isUnique = true;
        }
      } else {
        const savedRooms = localStorage.getItem('vor_mock_rooms');
        const roomsMap = savedRooms ? JSON.parse(savedRooms) : {};
        if (!roomsMap[code]) {
          isUnique = true;
        }
      }
    }

    const newRoom: Room = {
      id: code,
      createdAt: isFirebaseConfigured ? serverTimestamp() : Date.now(),
      creatorId: playerId,
      status: 'LOBBY',
      settings,
      players: {
        [playerId]: {
          id: playerId,
          name: creatorName,
          score: 0,
          skills: [],
          isReady: true, // Creator is automatically ready
          isPresent: true,
          avatar
        }
      },
      playerOrder: [playerId],
      currentTurnIdx: 0,
      currentTurn: null,
      customQueuedQuestions: {}
    };

    if (isFirebaseConfigured && db) {
      const docRef = doc(db, 'rooms', code);
      await setDoc(docRef, newRoom);
    } else {
      const savedRooms = localStorage.getItem('vor_mock_rooms');
      const roomsMap = savedRooms ? JSON.parse(savedRooms) : {};
      roomsMap[code] = newRoom;
      localStorage.setItem('vor_mock_rooms', JSON.stringify(roomsMap));
    }
    
    return code;
  };

  // 2. Join an Existing Room
  const joinRoom = async (targetRoomId: string, name: string, avatar: string) => {
    const cleanedId = targetRoomId.toUpperCase().trim();
    savePlayerName(name);

    let fetchedRoom: Room | null = null;

    if (isFirebaseConfigured && db) {
      const docRef = doc(db, 'rooms', cleanedId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        fetchedRoom = snapshot.data() as Room;
      }
    } else {
      const savedRooms = localStorage.getItem('vor_mock_rooms');
      const roomsMap = savedRooms ? JSON.parse(savedRooms) : {};
      if (roomsMap[cleanedId]) {
        fetchedRoom = roomsMap[cleanedId];
      }
    }

    if (!fetchedRoom) {
      if (!isFirebaseConfigured) {
        throw new Error('La sala no existe. En Modo Demo Local, asegúrate de estar usando el mismo navegador (pestañas normales, no incógnito) ya que las salas locales se guardan en el LocalStorage y no se comparten entre navegadores o dispositivos.');
      }
      throw new Error('La sala no existe o el código es incorrecto.');
    }

    if (isFirebaseConfigured && db) {
       const docRef = doc(db, 'rooms', cleanedId);
       await runTransaction(db, async (transaction) => {
         const sfDoc = await transaction.get(docRef);
         if (!sfDoc.exists()) throw new Error("La sala no existe.");
         const r = sfDoc.data() as Room;
         
         const updatedPlayers = {
            ...r.players,
            [playerId]: {
              id: playerId,
              name,
              score: r.players[playerId]?.score || 0,
              skills: r.players[playerId]?.skills || [],
              isReady: playerId === r.creatorId,
              isPresent: true,
              avatar
            }
          };
          const updatedOrder = r.playerOrder.includes(playerId)
            ? r.playerOrder
            : [...r.playerOrder, playerId];
          
          transaction.set(docRef, {
             ...r,
             players: updatedPlayers,
             playerOrder: updatedOrder
          });
       });
    } else {
      const savedRooms = localStorage.getItem('vor_mock_rooms');
      const roomsMap = savedRooms ? JSON.parse(savedRooms) : {};
      const r = roomsMap[cleanedId];
      const updatedPlayers = {
        ...r.players,
        [playerId]: {
          id: playerId,
          name,
          score: r.players[playerId]?.score || 0,
          skills: r.players[playerId]?.skills || [],
          isReady: playerId === r.creatorId,
          isPresent: true,
          avatar
        }
      };
      const updatedOrder = r.playerOrder.includes(playerId)
        ? r.playerOrder
        : [...r.playerOrder, playerId];
      
      const updatedRoom = {
         ...r,
         players: updatedPlayers,
         playerOrder: updatedOrder
      };
      roomsMap[cleanedId] = updatedRoom;
      localStorage.setItem('vor_mock_rooms', JSON.stringify(roomsMap));
    }
    
    return cleanedId;
  };

  // 3. Toggle Player Ready State
  const toggleReady = async () => {
    await mutateRoomState((current) => {
      const currentReady = current.players[playerId]?.isReady || false;
      return {
        ...current,
        players: {
          ...current.players,
          [playerId]: {
            ...current.players[playerId],
            isReady: !currentReady
          }
        }
      };
    });
  };

  // 4. Start the Game (only creator)
  const startGame = async () => {
    await mutateRoomState((current) => {
      if (playerId !== current.creatorId) return null;
      
      const shuffledOrder = [...current.playerOrder].sort(() => Math.random() - 0.5);
      return {
        ...current,
        status: 'SELECTING',
        playerOrder: shuffledOrder,
        currentTurnIdx: 0,
        currentTurn: {
          activePlayerId: shuffledOrder[0],
          typeSelected: null,
          content: '',
          votes: {},
          startedAt: Date.now()
        }
      };
    });
  };

  // 5. Select Truth or Dare category
  const selectCategory = async (type: 'truth_leve' | 'truth_picante' | 'dare_leve' | 'dare_picante') => {
    // Generate the question content beforehand to keep the transaction fast and sync
    let questionContent: string;
    let categoryType: 'truth_leve' | 'truth_picante' | 'dare_leve' | 'dare_picante' | 'custom' = type;

    // We check locally first to see if custom
    const queuedQuestion = room?.customQueuedQuestions?.[playerId];
    if (queuedQuestion) {
      questionContent = `[Pregunta Personalizada Anónima]: ${queuedQuestion.text}`;
      categoryType = 'custom';
    } else {
      const [action, level] = type.split('_') as ['truth' | 'dare', 'leve' | 'picante'];
      questionContent = await getQuestion(db, action, level);
    }

    await mutateRoomState((current) => {
      if (!current.currentTurn) return null;
      if (playerId !== current.currentTurn.activePlayerId) return null;
      
      const updatedQueued = { ...current.customQueuedQuestions };
      if (categoryType === 'custom') {
         delete updatedQueued[playerId];
      }

      return {
        ...current,
        status: 'WAITING_RESPONSE',
        customQueuedQuestions: updatedQueued,
        currentTurn: {
          ...current.currentTurn,
          typeSelected: categoryType,
          content: questionContent,
          startedAt: Date.now()
        }
      };
    });
  };

  // 6. Active Player declares they responded or did the dare
  const submitResponse = async () => {
    await mutateRoomState((current) => {
      if (!current.currentTurn) return null;
      if (playerId !== current.currentTurn.activePlayerId) return null;

      return {
        ...current,
        status: 'VOTING',
        currentTurn: {
          ...current.currentTurn,
          votes: {}
        }
      };
    });
  };

  // 7. Players qualify the response (Success / Fail)
  const castVote = async (vote: 'COMPLIED' | 'FAILED') => {
    await mutateRoomState((current) => {
      if (!current.currentTurn) return null;
      if (playerId === current.currentTurn.activePlayerId) return null;

      const updatedVotes = {
        ...current.currentTurn.votes,
        [playerId]: vote
      };

      return {
        ...current,
        currentTurn: {
          ...current.currentTurn,
          votes: updatedVotes
        }
      };
    });
  };

  // 8. Move to the Next Turn (triggered after voting closes)
  const nextTurn = async () => {
    await mutateRoomState((current) => {
      if (!current.currentTurn) return null;

      const activePlayerId = current.currentTurn.activePlayerId;
      const activePlayer = current.players[activePlayerId];
      
      const votesList = Object.values(current.currentTurn.votes);
      const positiveVotes = votesList.filter(v => v === 'COMPLIED').length;
      
      const totalVoters = current.playerOrder.length - 1;
      const isSuccess = positiveVotes > 0 && positiveVotes >= Math.ceil(totalVoters / 2);

      let scoreAwarded = 0;
      if (isSuccess && current.currentTurn.typeSelected) {
        const type = current.currentTurn.typeSelected;
        if (type.endsWith('leve')) {
          scoreAwarded = 10;
        } else if (type.endsWith('picante') || type === 'custom') {
          scoreAwarded = 20;
        }
      }

      const updatedPlayers = {
        ...current.players,
        [activePlayerId]: {
          ...activePlayer,
          score: activePlayer.score + scoreAwarded
        }
      };

      const nextIdx = (current.currentTurnIdx + 1) % current.playerOrder.length;
      const nextPlayerId = current.playerOrder[nextIdx];

      return {
        ...current,
        status: 'SELECTING',
        players: updatedPlayers,
        currentTurnIdx: nextIdx,
        currentTurn: {
          activePlayerId: nextPlayerId,
          typeSelected: null,
          content: '',
          votes: {},
          startedAt: Date.now()
        }
      };
    });
  };

  // 9. Buy a skill from the shop (Costs dynamically based on skill type)
  const buySkill = async (skill: 'skipTurn' | 'changeQuestion' | 'customTargetQuestion') => {
    await mutateRoomState((current) => {
      const player = current.players[playerId];
      const cost = SKILL_COSTS[skill];
      if (!player || player.score < cost) return null;

      const updatedPlayers = {
        ...current.players,
        [playerId]: {
          ...player,
          score: player.score - cost,
          skills: [...player.skills, skill]
        }
      };

      return {
        ...current,
        players: updatedPlayers
      };
    });
  };

  // 10. Use a skill during turn
  const triggerSkill = async (
    skill: 'skipTurn' | 'changeQuestion' | 'customTargetQuestion',
    targetPlayerId?: string,
    customText?: string
  ) => {
    // Generate new question beforehand to avoid doing it inside the transaction
    let newQuestionContent = '';
    if (skill === 'changeQuestion' && room?.currentTurn?.typeSelected && room.currentTurn.typeSelected !== 'custom') {
       const type = room.currentTurn.typeSelected;
       const [action, level] = type.split('_') as ['truth' | 'dare', 'leve' | 'picante'];
       newQuestionContent = await getQuestion(db, action, level);
    }

    await mutateRoomState((current) => {
      if (!current.currentTurn) return null;

      const player = current.players[playerId];
      if (!player || !player.skills.includes(skill)) return null;

      const skillIdx = player.skills.indexOf(skill);
      const updatedSkills = [...player.skills];
      updatedSkills.splice(skillIdx, 1);

      const updatedPlayers = {
        ...current.players,
        [playerId]: {
          ...player,
          skills: updatedSkills
        }
      };

      let nextState: Room = {
        ...current,
        players: updatedPlayers
      };

      if (skill === 'skipTurn') {
        const nextIdx = (current.currentTurnIdx + 1) % current.playerOrder.length;
        const nextPlayerId = current.playerOrder[nextIdx];
        
        nextState = {
          ...nextState,
          status: 'SELECTING',
          currentTurnIdx: nextIdx,
          currentTurn: {
            activePlayerId: nextPlayerId,
            typeSelected: null,
            content: '',
            votes: {},
            startedAt: Date.now()
          }
        };
      } else if (skill === 'changeQuestion') {
        if (!current.currentTurn.typeSelected || current.currentTurn.typeSelected === 'custom') return null;
        
        nextState = {
          ...nextState,
          currentTurn: {
            ...current.currentTurn,
            content: newQuestionContent,
            votes: {},
            startedAt: Date.now()
          }
        };
      } else if (skill === 'customTargetQuestion' && targetPlayerId && customText) {
        const updatedQueued = {
          ...current.customQueuedQuestions,
          [targetPlayerId]: {
            senderName: 'Anónimo',
            text: customText
          }
        };

        nextState = {
          ...nextState,
          customQueuedQuestions: updatedQueued
        };
      }

      return nextState;
    });
  };

  // 11. Gift points to another player
  const giftPoints = async (toPlayerId: string, amount: number) => {
    await mutateRoomState((current) => {
      if (!current.settings.allowGiftingPoints) return null;
      
      const sender = current.players[playerId];
      const receiver = current.players[toPlayerId];
      if (!sender || !receiver || sender.score < amount || amount <= 0) return null;

      const updatedPlayers = {
        ...current.players,
        [playerId]: {
          ...sender,
          score: sender.score - amount
        },
        [toPlayerId]: {
          ...receiver,
          score: receiver.score + amount
        }
      };

      return {
        ...current,
        players: updatedPlayers
      };
    });
  };

  return {
    room,
    playerId,
    playerName,
    loading,
    error,
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    selectCategory,
    submitResponse,
    castVote,
    nextTurn,
    buySkill,
    triggerSkill,
    giftPoints,
  };
}
