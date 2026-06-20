/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import { useGameRoom } from '../hooks/useGameRoom';
import type { Room, RoomSettings } from '../hooks/useGameRoom';

interface GameContextType {
  room: Room | null;
  playerId: string;
  playerName: string;
  loading: boolean;
  error: string | null;
  currentRoomId: string | null;
  setRoomId: (id: string | null) => void;
  createRoom: (creatorName: string, settings: RoomSettings, avatar: string) => Promise<string>;
  joinRoom: (roomId: string, name: string, avatar: string) => Promise<string>;
  toggleReady: () => Promise<void>;
  startGame: () => Promise<void>;
  selectCategory: (type: 'truth_leve' | 'truth_picante' | 'dare_leve' | 'dare_picante') => Promise<void>;
  submitResponse: () => Promise<void>;
  castVote: (vote: 'COMPLIED' | 'FAILED') => Promise<void>;
  nextTurn: () => Promise<void>;
  buySkill: (skill: 'skipTurn' | 'changeQuestion' | 'customTargetQuestion') => Promise<void>;
  triggerSkill: (skill: 'skipTurn' | 'changeQuestion' | 'customTargetQuestion', targetPlayerId?: string, customText?: string) => Promise<void>;
  giftPoints: (toPlayerId: string, amount: number) => Promise<void>;
  leaveRoom: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoomId, setRoomIdState] = useState<string | null>(() => {
    return sessionStorage.getItem('vor_current_room_id') || null;
  });

  const setRoomId = (id: string | null) => {
    setRoomIdState(id);
    if (id) {
      sessionStorage.setItem('vor_current_room_id', id);
    } else {
      sessionStorage.removeItem('vor_current_room_id');
    }
  };

  const game = useGameRoom(currentRoomId);

  const createRoom = async (creatorName: string, settings: RoomSettings, avatar: string) => {
    const code = await game.createRoom(creatorName, settings, avatar);
    setRoomId(code);
    return code;
  };

  const joinRoom = async (roomId: string, name: string, avatar: string) => {
    const code = await game.joinRoom(roomId, name, avatar);
    setRoomId(code);
    return code;
  };

  const exitRoom = async () => {
    try {
      await game.leaveRoom();
    } catch (e) {
      console.error('Error leaving room', e);
    }
    setRoomId(null);
  };

  // Wrap all actions to add context-level features if needed
  return (
    <GameContext.Provider
      value={{
        ...game,
        currentRoomId,
        setRoomId: (id) => {
          if (id === null) {
            exitRoom();
          } else {
            setRoomId(id);
          }
        },
        createRoom,
        joinRoom,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame debe ser usado dentro de un GameProvider');
  }
  return context;
};
