import { useState, useEffect, useRef } from 'react';
import { db, isFirebaseConfigured } from '../config/firebase';
import { getRandomItem } from '../data/questions';
import {
  doc,
  setDoc,
  onSnapshot,
  getDoc
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
  createdAt: number;
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

// Generate a random 4-letter room code (e.g. "FR8A")
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
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
      const timeout = setTimeout(() => setRoom(null), 0);
      return () => clearTimeout(timeout);
    }

    const stateTimeout = setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);

    if (isFirebaseConfigured && db) {
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
        clearTimeout(stateTimeout);
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
        clearTimeout(stateTimeout);
        if (mockChannel) {
          mockChannel.removeEventListener('message', handleBroadcast);
        }
      };
    }
  }, [roomId]);

  // --- STATE MUTATOR WRAPPER ---
  // Helper to commit changes to either Firestore or BroadcastChannel + LocalStorage
  const updateRoomState = async (updatedRoom: Room) => {
    if (isFirebaseConfigured && db) {
      const docRef = doc(db, 'rooms', updatedRoom.id);
      await setDoc(docRef, updatedRoom);
    } else {
      // Save locally
      const savedRooms = localStorage.getItem('vor_mock_rooms');
      const roomsMap = savedRooms ? JSON.parse(savedRooms) : {};
      roomsMap[updatedRoom.id] = updatedRoom;
      localStorage.setItem('vor_mock_rooms', JSON.stringify(roomsMap));

      // Update state locally
      setRoom(updatedRoom);

      // Broadcast to other tabs
      if (mockChannel) {
        mockChannel.postMessage({
          type: 'UPDATE',
          roomId: updatedRoom.id,
          room: updatedRoom
        });
      }
    }
  };

  // --- ACTIONS ---

  // 1. Create a Game Room
  const createRoom = async (creatorName: string, settings: RoomSettings, avatar: string) => {
    const code = generateRoomCode();
    savePlayerName(creatorName);

    const newRoom: Room = {
      id: code,
      createdAt: Date.now(),
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

    await updateRoomState(newRoom);
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
      throw new Error('La sala no existe o el código es incorrecto.');
    }

    const updatedPlayers = {
      ...fetchedRoom.players,
      [playerId]: {
        id: playerId,
        name,
        score: fetchedRoom.players[playerId]?.score || 0,
        skills: fetchedRoom.players[playerId]?.skills || [],
        isReady: playerId === fetchedRoom.creatorId, // creator ready, others false
        isPresent: true,
        avatar
      }
    };

    const updatedOrder = fetchedRoom.playerOrder.includes(playerId)
      ? fetchedRoom.playerOrder
      : [...fetchedRoom.playerOrder, playerId];

    const updatedRoom: Room = {
      ...fetchedRoom,
      players: updatedPlayers,
      playerOrder: updatedOrder
    };

    await updateRoomState(updatedRoom);
    return cleanedId;
  };

  // 3. Toggle Player Ready State
  const toggleReady = async () => {
    if (!room) return;

    const currentReady = room.players[playerId]?.isReady || false;
    const updatedRoom: Room = {
      ...room,
      players: {
        ...room.players,
        [playerId]: {
          ...room.players[playerId],
          isReady: !currentReady
        }
      }
    };

    await updateRoomState(updatedRoom);
  };

  // 4. Start the Game (only creator)
  const startGame = async () => {
    if (!room || playerId !== room.creatorId) return;

    // Shuffle turn order randomly
    const shuffledOrder = [...room.playerOrder].sort(() => Math.random() - 0.5);

    const updatedRoom: Room = {
      ...room,
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

    await updateRoomState(updatedRoom);
  };

  // 5. Select Truth or Dare category
  const selectCategory = async (type: 'truth_leve' | 'truth_picante' | 'dare_leve' | 'dare_picante') => {
    if (!room || !room.currentTurn) return;
    if (playerId !== room.currentTurn.activePlayerId) return; // verify active player

    let questionContent: string;
    let categoryType: 'truth_leve' | 'truth_picante' | 'dare_leve' | 'dare_picante' | 'custom' = type;

    // Check if there is a custom question queued for this player
    const queuedQuestion = room.customQueuedQuestions?.[playerId];
    if (queuedQuestion) {
      questionContent = `[Pregunta Personalizada de ${queuedQuestion.senderName}]: ${queuedQuestion.text}`;
      categoryType = 'custom';
    } else {
      // Pull standard question from database
      const [action, level] = type.split('_') as ['truth' | 'dare', 'leve' | 'picante'];
      questionContent = getRandomItem(action, level);
    }

    // Clean custom question if used
    const updatedQueued = { ...room.customQueuedQuestions };
    delete updatedQueued[playerId];

    const updatedRoom: Room = {
      ...room,
      status: 'WAITING_RESPONSE',
      customQueuedQuestions: updatedQueued,
      currentTurn: {
        ...room.currentTurn,
        typeSelected: categoryType,
        content: questionContent,
        startedAt: Date.now()
      }
    };

    await updateRoomState(updatedRoom);
  };

  // 6. Active Player declares they responded or did the dare
  const submitResponse = async () => {
    if (!room || !room.currentTurn) return;
    if (playerId !== room.currentTurn.activePlayerId) return;

    const updatedRoom: Room = {
      ...room,
      status: 'VOTING',
      currentTurn: {
        ...room.currentTurn,
        votes: {} // reset votes
      }
    };

    await updateRoomState(updatedRoom);
  };

  // 7. Players qualify the response (Success / Fail)
  const castVote = async (vote: 'COMPLIED' | 'FAILED') => {
    if (!room || !room.currentTurn) return;
    if (playerId === room.currentTurn.activePlayerId) return; // active player cannot vote

    const updatedVotes = {
      ...room.currentTurn.votes,
      [playerId]: vote
    };

    const updatedRoom: Room = {
      ...room,
      currentTurn: {
        ...room.currentTurn,
        votes: updatedVotes
      }
    };

    await updateRoomState(updatedRoom);
  };

  // 8. Move to the Next Turn (triggered after voting closes)
  const nextTurn = async () => {
    if (!room || !room.currentTurn) return;

    // Calculate score earned in current turn
    const activePlayerId = room.currentTurn.activePlayerId;
    const activePlayer = room.players[activePlayerId];
    
    // Determine if turn succeeded (majority of positive votes)
    const votesList = Object.values(room.currentTurn.votes);
    const positiveVotes = votesList.filter(v => v === 'COMPLIED').length;
    
    // Voters are all players except the active player
    const totalVoters = room.playerOrder.length - 1;
    const isSuccess = positiveVotes > 0 && positiveVotes >= Math.ceil(totalVoters / 2);

    let scoreAwarded = 0;
    if (isSuccess && room.currentTurn.typeSelected) {
      const type = room.currentTurn.typeSelected;
      if (type.endsWith('leve')) {
        scoreAwarded = 10;
      } else if (type.endsWith('picante') || type === 'custom') {
        scoreAwarded = 20;
      }
    }

    // Update active player's score
    const updatedPlayers = {
      ...room.players,
      [activePlayerId]: {
        ...activePlayer,
        score: activePlayer.score + scoreAwarded
      }
    };

    // Calculate next turn index
    const nextIdx = (room.currentTurnIdx + 1) % room.playerOrder.length;
    const nextPlayerId = room.playerOrder[nextIdx];

    const updatedRoom: Room = {
      ...room,
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

    await updateRoomState(updatedRoom);
  };

  // 9. Buy a skill from the shop (Costs 50 pts)
  const buySkill = async (skill: 'skipTurn' | 'changeQuestion' | 'customTargetQuestion') => {
    if (!room) return;
    const player = room.players[playerId];
    if (!player || player.score < 50) return;

    const updatedPlayers = {
      ...room.players,
      [playerId]: {
        ...player,
        score: player.score - 50,
        skills: [...player.skills, skill]
      }
    };

    const updatedRoom: Room = {
      ...room,
      players: updatedPlayers
    };

    await updateRoomState(updatedRoom);
  };

  // 10. Use a skill during turn
  const triggerSkill = async (
    skill: 'skipTurn' | 'changeQuestion' | 'customTargetQuestion',
    targetPlayerId?: string,
    customText?: string
  ) => {
    if (!room || !room.currentTurn) return;

    const player = room.players[playerId];
    if (!player || !player.skills.includes(skill)) return;

    // Remove the skill from the player's inventory
    const skillIdx = player.skills.indexOf(skill);
    const updatedSkills = [...player.skills];
    updatedSkills.splice(skillIdx, 1);

    const updatedPlayers = {
      ...room.players,
      [playerId]: {
        ...player,
        skills: updatedSkills
      }
    };

    let updatedRoom: Room = {
      ...room,
      players: updatedPlayers
    };

    if (skill === 'skipTurn') {
      // Instantly advance to the next player's turn
      const nextIdx = (room.currentTurnIdx + 1) % room.playerOrder.length;
      const nextPlayerId = room.playerOrder[nextIdx];
      
      updatedRoom = {
        ...updatedRoom,
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
      // Reroll a new question of the same category
      if (!room.currentTurn.typeSelected || room.currentTurn.typeSelected === 'custom') return;
      
      const type = room.currentTurn.typeSelected;
      const [action, level] = type.split('_') as ['truth' | 'dare', 'leve' | 'picante'];
      const newQuestionContent = getRandomItem(action, level);

      updatedRoom = {
        ...updatedRoom,
        currentTurn: {
          ...room.currentTurn,
          content: newQuestionContent,
          votes: {},
          startedAt: Date.now()
        }
      };
    } else if (skill === 'customTargetQuestion' && targetPlayerId && customText) {
      // Queue a custom question for the target player
      const updatedQueued = {
        ...room.customQueuedQuestions,
        [targetPlayerId]: {
          senderName: player.name,
          text: customText
        }
      };

      updatedRoom = {
        ...updatedRoom,
        customQueuedQuestions: updatedQueued
      };
    }

    await updateRoomState(updatedRoom);
  };

  // 11. Gift points to another player
  const giftPoints = async (toPlayerId: string, amount: number) => {
    if (!room || !room.settings.allowGiftingPoints) return;
    
    const sender = room.players[playerId];
    const receiver = room.players[toPlayerId];
    if (!sender || !receiver || sender.score < amount || amount <= 0) return;

    const updatedPlayers = {
      ...room.players,
      [playerId]: {
        ...sender,
        score: sender.score - amount
      },
      [toPlayerId]: {
        ...receiver,
        score: receiver.score + amount
      }
    };

    const updatedRoom: Room = {
      ...room,
      players: updatedPlayers
    };

    await updateRoomState(updatedRoom);
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
