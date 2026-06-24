import { useState, useEffect, useRef } from 'react';
import { db, rtdb, isFirebaseConfigured } from '../config/firebase';
import { preloadQuestions, generateDeck, getQuestionByIdSync } from '../data/questions';
import {
  ref,
  get,
  onValue,
  runTransaction,
  serverTimestamp as rtdbServerTimestamp,
  onDisconnect,
  set
} from 'firebase/database';

export interface Player {
  id: string;
  name: string;
  score: number;
  skills: ('skipTurn' | 'changeQuestion' | 'customTargetQuestion' | 'transferChallenge')[];
  isReady: boolean;
  isPresent: boolean;
  avatar: string;
}

export interface RoomSettings {
  turnTimeLimit: number;       // in seconds, 0 = unlimited
  allowGiftingPoints: boolean;
  showScores: boolean;
  enabledSkills: {
    skipTurn: boolean;
    changeQuestion: boolean;
    customTargetQuestion: boolean;
    transferChallenge: boolean;
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
  createdAt: number | object;
  creatorId: string;
  status: 'LOBBY' | 'SELECTING' | 'WAITING_RESPONSE' | 'VOTING' | 'FINISHED';
  settings: RoomSettings;
  players: {
    [playerId: string]: Player;
  };
  playerOrder: string[];
  currentTurnIdx: number;
  currentTurn: TurnState | null;
  customQueuedQuestions?: {
    [playerId: string]: {
      senderName: string;
      text: string;
    };
  };
  decks?: {
    truth_leve: string[];
    truth_picante: string[];
    dare_leve: string[];
    dare_picante: string[];
  };
  password?: string;
}

export const SKILL_COSTS = {
  skipTurn: 30,
  changeQuestion: 20,
  customTargetQuestion: 50,
  transferChallenge: 40
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

const mockChannel = typeof window !== 'undefined' ? new BroadcastChannel('verdad_o_reto_sync') : null;

// Helper to sanitize RTDB data (transforms objects with index keys back to arrays)
function sanitizeRoomData(roomData: Record<string, unknown>): Room {
  if (!roomData) return roomData as unknown as Room;
  const sanitized = { ...roomData } as Record<string, unknown>;
  
  if (sanitized.playerOrder && !Array.isArray(sanitized.playerOrder)) {
    sanitized.playerOrder = Object.values(sanitized.playerOrder);
  }
  if (!sanitized.playerOrder) sanitized.playerOrder = [];

  if (sanitized.players) {
    Object.values(sanitized.players).forEach((p: unknown) => {
      const player = p as Record<string, unknown>;
      if (player.skills && !Array.isArray(player.skills)) player.skills = Object.values(player.skills);
      if (!player.skills) player.skills = [];
    });
  }

  if (sanitized.currentTurn) {
      // Sometimes an object is converted to array if keys are numeric. Votes uses playerId which are strings, but just in case.
  }
  
  if (sanitized.decks) {
    Object.keys(sanitized.decks).forEach((key) => {
      const deckKey = key as keyof typeof sanitized.decks;
      if (sanitized.decks[deckKey] && !Array.isArray(sanitized.decks[deckKey])) {
         sanitized.decks[deckKey] = Object.values(sanitized.decks[deckKey]);
      }
    });
  }

  return sanitized as Room;
}

export function useGameRoom(roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isKicked, setIsKicked] = useState<boolean>(false);
  const isLeavingRef = useRef<boolean>(false);
  
  const [playerId] = useState<string>(() => {
    const saved = localStorage.getItem('vor_player_id');
    if (saved) return saved;
    const newId = generatePlayerId();
    localStorage.setItem('vor_player_id', newId);
    return newId;
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('vor_player_name') || '';
  });

  const roomRef = useRef<Room | null>(null);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const savePlayerName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('vor_player_name', name);
  };

  // --- REAL-TIME LISTENER ---
  useEffect(() => {
    if (!roomId) {
      if (roomRef.current !== null) {
        // Prevent synchronous state update during render loop
        queueMicrotask(() => setRoom(null));
      }
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);

    if (isFirebaseConfigured && rtdb) {
      if (db) preloadQuestions(db); // Still load questions from Firestore

      const dbRoomRef = ref(rtdb, `rooms/${roomId}`);
      const playerPresenceRef = ref(rtdb, `rooms/${roomId}/players/${playerId}/isPresent`);
      
      // Set up onDisconnect hook
      onDisconnect(playerPresenceRef).set(false).catch(console.error);

      const unsubscribe = onValue(dbRoomRef, 
        (snapshot) => {
          if (snapshot.exists()) {
            const rawData = snapshot.val() as Record<string, unknown>;
            const newRoom = sanitizeRoomData(rawData);
            
            if (newRoom.players && !newRoom.players[playerId] && !isLeavingRef.current) {
              setIsKicked(true);
            }
            setRoom(newRoom);
          } else {
            setError('La sala de juego no existe.');
            setRoom(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error("RTDB error: ", err);
          setError('Error al conectar con la sala.');
          setLoading(false);
        }
      );

      return () => {
        unsubscribe();
        onDisconnect(playerPresenceRef).cancel(); // Cancel disconnect hook if leaving gracefully
      };
    } else {
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

      const handleBroadcast = (event: MessageEvent) => {
        const message = event.data;
        if (message && message.roomId === roomId) {
          if (message.type === 'UPDATE') {
            const newRoom = message.room as Room;
            if (newRoom.players && !newRoom.players[playerId] && !isLeavingRef.current) {
              setIsKicked(true);
            }
            setRoom(newRoom);
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
  }, [roomId, playerId]); // removed room from dependency to prevent infinite loop

  // --- ATOMIC STATE MUTATOR ---
  const mutateRoomState = async (updater: (currentRoom: Room) => Room | undefined | 'DELETE') => {
    if (!roomId) return;
    
    if (isFirebaseConfigured && rtdb) {
      const dbRoomRef = ref(rtdb, `rooms/${roomId}`);
      await runTransaction(dbRoomRef, (currentData: unknown) => {
        if (currentData === null) return; // Abort safely instead of returning currentData (which deletes node)
        
        const currentRoom = sanitizeRoomData(currentData as Record<string, unknown>);
        const newRoom = updater(currentRoom);
        
        if (newRoom === 'DELETE') {
          return null; // Delete node
        } else if (newRoom === undefined) {
          return; // Abort
        }
        return newRoom;
      });
    } else {
      const savedRooms = localStorage.getItem('vor_mock_rooms');
      const roomsMap = savedRooms ? JSON.parse(savedRooms) : {};
      const currentRoom = roomsMap[roomId];
      if (!currentRoom) throw new Error("La sala no existe localmente.");
      
      const newRoom = updater(currentRoom);
      
      if (newRoom === 'DELETE') {
        delete roomsMap[roomId];
        localStorage.setItem('vor_mock_rooms', JSON.stringify(roomsMap));
        setRoom(null);
      } else if (newRoom !== undefined) {
        roomsMap[newRoom.id] = newRoom;
        localStorage.setItem('vor_mock_rooms', JSON.stringify(roomsMap));
        setRoom(newRoom);

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

  const createRoom = async (creatorName: string, settings: RoomSettings, avatar: string, password?: string) => {
    savePlayerName(creatorName);
    let code = '';
    let isUnique = false;
    
    while (!isUnique) {
      code = generateRoomCode();
      const newRoom: Room = {
        id: code,
        createdAt: isFirebaseConfigured ? rtdbServerTimestamp() : Date.now(),
        creatorId: playerId,
        status: 'LOBBY',
        settings,
        players: {
          [playerId]: {
            id: playerId,
            name: creatorName,
            score: 0,
            skills: [],
            isReady: true,
            isPresent: true,
            avatar
          }
        },
        playerOrder: [playerId],
        currentTurnIdx: 0,
        currentTurn: null,
        customQueuedQuestions: {},
        decks: {
          truth_leve: generateDeck('truth', 'leve'),
          truth_picante: generateDeck('truth', 'picante'),
          dare_leve: generateDeck('dare', 'leve'),
          dare_picante: generateDeck('dare', 'picante'),
        },
        ...(password ? { password } : {})
      };

      if (isFirebaseConfigured && rtdb) {
        const dbRoomRef = ref(rtdb, `rooms/${code}`);
        // Use transaction to ensure code is not overridden by someone else creating it simultaneously
        const result = await runTransaction(dbRoomRef, (currentData) => {
          if (currentData === null) {
            return newRoom; // Node doesn't exist, claim it
          }
          return; // Abort, node exists
        });
        
        if (result.committed) {
          isUnique = true;
        }
      } else {
        const savedRooms = localStorage.getItem('vor_mock_rooms');
        const roomsMap = savedRooms ? JSON.parse(savedRooms) : {};
        if (!roomsMap[code]) {
          roomsMap[code] = newRoom;
          localStorage.setItem('vor_mock_rooms', JSON.stringify(roomsMap));
          isUnique = true;
        }
      }
    }
    
    return code;
  };

  const joinRoom = async (targetRoomId: string, name: string, avatar: string, password?: string) => {
    const cleanedId = targetRoomId.toUpperCase().trim();
    savePlayerName(name);

    let fetchedRoom: Room | null = null;

    if (isFirebaseConfigured && rtdb) {
      const dbRoomRef = ref(rtdb, `rooms/${cleanedId}`);
      const snapshot = await get(dbRoomRef);
      if (snapshot.exists()) {
        fetchedRoom = sanitizeRoomData(snapshot.val());
      }
    } else {
      const savedRooms = localStorage.getItem('vor_mock_rooms');
      const roomsMap = savedRooms ? JSON.parse(savedRooms) : {};
      if (roomsMap[cleanedId]) {
        fetchedRoom = roomsMap[cleanedId];
      }
    }

    if (!fetchedRoom) {
      throw new Error(isFirebaseConfigured ? 'La sala no existe o el código es incorrecto.' : 'La sala no existe. En Modo Demo Local, asegúrate de estar usando el mismo navegador.');
    }

    if (fetchedRoom.password && fetchedRoom.password !== password) {
      throw new Error('Contraseña incorrecta para entrar a esta sala.');
    }

    if (isFirebaseConfigured && rtdb) {
       const dbRoomRef = ref(rtdb, `rooms/${cleanedId}`);
       const result = await runTransaction(dbRoomRef, (currentData) => {
         // Si currentData es null (por caché local vacío), intentamos enviar la data obtenida por get() 
         // para que el servidor evalúe y rechace si hubo cambio, recargando currentData.
         const baseData = currentData === null ? fetchedRoom : currentData;
         if (!baseData) return; 
         
         const r = sanitizeRoomData(baseData);
         
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
          
          return {
             ...r,
             players: updatedPlayers,
             playerOrder: updatedOrder
          };
       });
       
       if (!result.committed) {
         throw new Error("No se pudo unir a la sala.");
       }
    } else {
      const savedRooms = localStorage.getItem('vor_mock_rooms');
      const roomsMap = savedRooms ? JSON.parse(savedRooms) : {};
      const r = roomsMap[cleanedId];
      if(!r) throw new Error("Sala no existe");
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

  const toggleReady = async () => {
    if (isFirebaseConfigured && rtdb && room) {
      const currentReady = room.players[playerId]?.isReady || false;
      const readyRef = ref(rtdb, `rooms/${roomId}/players/${playerId}/isReady`);
      await set(readyRef, !currentReady);
    } else {
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
    }
  };

  const startGame = async () => {
    await mutateRoomState((current) => {
      if (playerId !== current.creatorId) return undefined;
      
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

  const selectCategory = async (type: 'truth_leve' | 'truth_picante' | 'dare_leve' | 'dare_picante') => {
    let questionContent: string = '';
    let categoryType: 'truth_leve' | 'truth_picante' | 'dare_leve' | 'dare_picante' | 'custom' = type;

    const queuedQuestion = room?.customQueuedQuestions?.[playerId];
    if (queuedQuestion) {
      questionContent = `[Pregunta Personalizada Anónima]: ${queuedQuestion.text}`;
      categoryType = 'custom';
    }

    await mutateRoomState((current) => {
      if (!current.currentTurn) return undefined;
      if (playerId !== current.currentTurn.activePlayerId) return undefined;
      
      const updatedQueued = { ...current.customQueuedQuestions };
      if (categoryType === 'custom') {
         delete updatedQueued[playerId];
      }

      let updatedDecks = current.decks || {
        truth_leve: generateDeck('truth', 'leve'),
        truth_picante: generateDeck('truth', 'picante'),
        dare_leve: generateDeck('dare', 'leve'),
        dare_picante: generateDeck('dare', 'picante'),
      };

      if (categoryType !== 'custom') {
        const deckKey = categoryType as keyof typeof updatedDecks;
        let deck = updatedDecks[deckKey] || [];
        if (deck.length === 0) {
            const [action, level] = categoryType.split('_') as ['truth' | 'dare', 'leve' | 'picante'];
            deck = generateDeck(action, level);
        }
        const selectedId = deck[0];
        updatedDecks = {
            ...updatedDecks,
            [deckKey]: deck.slice(1)
        };
        questionContent = getQuestionByIdSync(selectedId);
      }

      return {
        ...current,
        status: 'WAITING_RESPONSE',
        customQueuedQuestions: updatedQueued,
        decks: updatedDecks,
        currentTurn: {
          ...current.currentTurn,
          typeSelected: categoryType,
          content: questionContent,
          startedAt: Date.now()
        }
      };
    });
  };

  const submitResponse = async () => {
    await mutateRoomState((current) => {
      if (!current.currentTurn) return undefined;
      if (playerId !== current.currentTurn.activePlayerId) return undefined;

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

  const castVote = async (vote: 'COMPLIED' | 'FAILED') => {
    if (isFirebaseConfigured && rtdb && room) {
      if (!room.currentTurn || playerId === room.currentTurn.activePlayerId) return;
      const voteRef = ref(rtdb, `rooms/${roomId}/currentTurn/votes/${playerId}`);
      await set(voteRef, vote);
    } else {
      await mutateRoomState((current) => {
        if (!current.currentTurn) return undefined;
        if (playerId === current.currentTurn.activePlayerId) return undefined;

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
    }
  };

  const nextTurn = async () => {
    await mutateRoomState((current) => {
      if (!current.currentTurn) return undefined;

      const activePlayerId = current.currentTurn.activePlayerId;
      const activePlayer = current.players[activePlayerId];
      if (!activePlayer) return undefined;
      
      const votesList = current.currentTurn.votes ? Object.values(current.currentTurn.votes) : [];
      const positiveVotes = votesList.filter(v => v === 'COMPLIED').length;
      
      const totalVoters = current.playerOrder.length - 1;
      const isSuccess = positiveVotes > totalVoters / 2;

      let scoreAwarded = 0;
      if (isSuccess && current.currentTurn.typeSelected) {
        const type = current.currentTurn.typeSelected;
        if (type === 'truth_leve') scoreAwarded = 10;
        else if (type === 'truth_picante') scoreAwarded = 20;
        else if (type === 'dare_leve') scoreAwarded = 20;
        else if (type === 'dare_picante') scoreAwarded = 30;
        else if (type === 'custom') scoreAwarded = 20;
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

  const buySkill = async (skill: 'skipTurn' | 'changeQuestion' | 'customTargetQuestion' | 'transferChallenge') => {
    if (isFirebaseConfigured && rtdb && room) {
      const cost = SKILL_COSTS[skill];
      const playerRef = ref(rtdb, `rooms/${roomId}/players/${playerId}`);
      await runTransaction(playerRef, (player: Record<string, unknown> | null) => {
        if (!player || typeof player.score !== 'number' || player.score < cost) return; // abort
        
        let skills = player.skills;
        if (skills && !Array.isArray(skills)) skills = Object.values(skills);
        if (!skills) skills = [];

        return {
          ...player,
          score: player.score - cost,
          skills: [...(skills as string[]), skill]
        };
      });
    } else {
      await mutateRoomState((current) => {
        const player = current.players[playerId];
        const cost = SKILL_COSTS[skill];
        if (!player || player.score < cost) return undefined;

        const updatedPlayers = {
          ...current.players,
          [playerId]: {
            ...player,
            score: player.score - cost,
            skills: [...(player.skills || []), skill]
          }
        };

        return {
          ...current,
          players: updatedPlayers
        };
      });
    }
  };

  const triggerSkill = async (
    skill: 'skipTurn' | 'changeQuestion' | 'customTargetQuestion' | 'transferChallenge',
    targetPlayerId?: string,
    customText?: string
  ) => {
    await mutateRoomState((current) => {
      if (!current.currentTurn) return undefined;

      const player = current.players[playerId];
      if (!player || !(player.skills || []).includes(skill)) return undefined;

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

      const nextState: Room = {
        ...current,
        players: updatedPlayers
      };

      if (skill === 'skipTurn') {
        const nextIdx = (current.currentTurnIdx + 1) % current.playerOrder.length;
        const nextPlayerId = current.playerOrder[nextIdx];
        
        const nextStateSkip = {
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
        } as Room;
        return nextStateSkip;
      } else if (skill === 'changeQuestion') {
        if (!current.currentTurn.typeSelected || current.currentTurn.typeSelected === 'custom') return undefined;
        
        const categoryType = current.currentTurn.typeSelected;
        let updatedDecks = nextState.decks || {
          truth_leve: generateDeck('truth', 'leve'),
          truth_picante: generateDeck('truth', 'picante'),
          dare_leve: generateDeck('dare', 'leve'),
          dare_picante: generateDeck('dare', 'picante'),
        };

        const deckKey = categoryType as keyof typeof updatedDecks;
        let deck = updatedDecks[deckKey] || [];
        if (deck.length === 0) {
            const [action, level] = categoryType.split('_') as ['truth' | 'dare', 'leve' | 'picante'];
            deck = generateDeck(action, level);
        }
        const selectedId = deck[0];
        updatedDecks = {
            ...updatedDecks,
            [deckKey]: deck.slice(1)
        };
        const newContent = getQuestionByIdSync(selectedId);

        const nextStateChange = {
          ...nextState,
          decks: updatedDecks,
          currentTurn: {
            ...current.currentTurn,
            content: newContent,
            votes: {},
            startedAt: Date.now()
          }
        } as Room;
        return nextStateChange;
      } else if (skill === 'customTargetQuestion' && targetPlayerId && customText) {
        const updatedQueued = {
          ...current.customQueuedQuestions,
          [targetPlayerId]: {
            senderName: 'Anónimo',
            text: current.customQueuedQuestions?.[targetPlayerId] 
              ? `${current.customQueuedQuestions[targetPlayerId].text} | ADEMÁS: ${customText}`
              : customText
          }
        };

        const nextStateCopy3 = {
          ...nextState,
          customQueuedQuestions: updatedQueued
        };
        return nextStateCopy3;
      } else if (skill === 'transferChallenge' && targetPlayerId) {
        const nextStateTransfer = {
          ...nextState,
          currentTurn: {
            ...current.currentTurn,
            activePlayerId: targetPlayerId,
            startedAt: Date.now(),
            votes: {}
          }
        } as Room;
        return nextStateTransfer;
      }

      return nextState;
    });
  };

  const giftPoints = async (toPlayerId: string, amount: number) => {
    await mutateRoomState((current) => {
      if (!current.settings.allowGiftingPoints) return undefined;
      
      const sender = current.players[playerId];
      const receiver = current.players[toPlayerId];
      if (!sender || !receiver || sender.score < amount || amount <= 0) return undefined;

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

  const leaveRoom = async () => {
    isLeavingRef.current = true;
    await mutateRoomState((current) => {
      const player = current.players[playerId];
      if (!player) return undefined; 

      const updatedPlayers = { ...current.players };
      delete updatedPlayers[playerId];
      
      const updatedOrder = current.playerOrder.filter(id => id !== playerId);

      if (updatedOrder.length === 0) {
        return 'DELETE';
      }

      const nextState: Room = {
        ...current,
        players: updatedPlayers,
        playerOrder: updatedOrder
      };

      if (current.creatorId === playerId) {
        nextState.creatorId = updatedOrder[0];
      }

      if (updatedOrder.length <= 1 && current.status !== 'LOBBY') {
        nextState.status = 'LOBBY';
        nextState.currentTurn = null;
      } else {
        if (current.currentTurn && current.currentTurn.activePlayerId === playerId && current.status !== 'LOBBY') {
          const nextIdx = current.currentTurnIdx >= updatedOrder.length ? 0 : current.currentTurnIdx;
          const nextPlayerId = updatedOrder[nextIdx];

          nextState.status = 'SELECTING';
          nextState.currentTurnIdx = nextIdx;
          nextState.currentTurn = {
            activePlayerId: nextPlayerId,
            typeSelected: null,
            content: '',
            votes: {},
            startedAt: Date.now()
          };
        } else if (current.currentTurn && current.status === 'VOTING') {
          const updatedVotes = { ...(current.currentTurn.votes || {}) };
          delete updatedVotes[playerId];
          nextState.currentTurn = {
            ...current.currentTurn,
            votes: updatedVotes
          };
        }
      }

      return nextState;
    });
  };

  const finishGame = async () => {
    await mutateRoomState((current) => {
      if (current.creatorId !== playerId) return undefined;
      return {
        ...current,
        status: 'FINISHED',
        currentTurn: null
      };
    });
  };

  const kickPlayer = async (targetPlayerId: string) => {
    await mutateRoomState((current) => {
      if (current.creatorId !== playerId) return undefined;
      if (!current.players[targetPlayerId]) return undefined;

      const updatedPlayers = { ...current.players };
      delete updatedPlayers[targetPlayerId];
      
      const updatedOrder = current.playerOrder.filter(id => id !== targetPlayerId);

      if (updatedOrder.length === 0) {
        return 'DELETE';
      }

      const nextState: Room = {
        ...current,
        players: updatedPlayers,
        playerOrder: updatedOrder
      };

      if (updatedOrder.length <= 1 && current.status !== 'LOBBY') {
        nextState.status = 'LOBBY';
        nextState.currentTurn = null;
      } else {
        if (current.currentTurn && current.currentTurn.activePlayerId === targetPlayerId && current.status !== 'LOBBY') {
          const nextIdx = current.currentTurnIdx >= updatedOrder.length ? 0 : current.currentTurnIdx;
          const nextPlayerId = updatedOrder[nextIdx];

          nextState.status = 'SELECTING';
          nextState.currentTurnIdx = nextIdx;
          nextState.currentTurn = {
            activePlayerId: nextPlayerId,
            typeSelected: null,
            content: '',
            votes: {},
            startedAt: Date.now()
          };
        } else if (current.currentTurn && current.status === 'VOTING') {
          const updatedVotes = { ...(current.currentTurn.votes || {}) };
          delete updatedVotes[targetPlayerId];
          nextState.currentTurn = {
            ...current.currentTurn,
            votes: updatedVotes
          };
        }
      }

      return nextState;
    });
  };

  const transferCreator = async (targetPlayerId: string) => {
    await mutateRoomState((current) => {
      if (current.creatorId !== playerId) return undefined;
      if (!current.players[targetPlayerId]) return undefined;

      return {
        ...current,
        creatorId: targetPlayerId
      };
    });
  };

  const updatePlayerProfile = async (newName: string, newAvatar: string) => {
    savePlayerName(newName);
    await mutateRoomState((current) => {
      const player = current.players[playerId];
      if (!player) return undefined;

      const updatedPlayers = {
        ...current.players,
        [playerId]: {
          ...player,
          name: newName,
          avatar: newAvatar
        }
      };

      return {
        ...current,
        players: updatedPlayers
      };
    });
  };

  const updateRoomSettings = async (newSettings: RoomSettings, newPassword?: string) => {
    await mutateRoomState((current) => {
      if (current.creatorId !== playerId) return undefined;

      return {
        ...current,
        settings: newSettings,
        ...(newPassword !== undefined ? { password: newPassword } : {})
      };
    });
  };

  return {
    room,
    currentRoomId: room?.id || null,
    setRoomId: () => {}, 
    playerId,
    playerName,
    loading,
    error,
    isKicked,
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
    leaveRoom,
    kickPlayer,
    finishGame,
    transferCreator,
    updatePlayerProfile,
    updateRoomSettings,
  };
}
