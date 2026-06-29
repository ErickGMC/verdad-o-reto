/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useMemo } from 'react';
import { useGameRoom } from '../hooks/useGameRoom';
import type { Room, RoomSettings } from '../hooks/useGameRoom';

interface GameContextType {
  room: Room | null;
  playerId: string;
  playerName: string;
  loading: boolean;
  error: string | null;
  isKicked: boolean;
  currentRoomId: string | null;
  setRoomId: (id: string | null) => void;
  createRoom: (creatorName: string, settings: RoomSettings, avatar: string, password?: string) => Promise<string>;
  joinRoom: (roomId: string, name: string, avatar: string, password?: string) => Promise<string>;
  toggleReady: () => Promise<void>;
  startGame: () => Promise<void>;
  selectCategory: (type: 'truth_leve' | 'truth_picante' | 'dare_leve' | 'dare_picante') => Promise<void>;
  submitResponse: () => Promise<void>;
  castVote: (vote: 'COMPLIED' | 'FAILED') => Promise<void>;
  nextTurn: () => Promise<void>;
  buySkill: (skill: 'skipTurn' | 'changeQuestion' | 'customTargetQuestion' | 'transferChallenge') => Promise<void>;
  triggerSkill: (skill: 'skipTurn' | 'changeQuestion' | 'customTargetQuestion' | 'transferChallenge', targetPlayerId?: string, customText?: string) => Promise<void>;
  giftPoints: (toPlayerId: string, amount: number) => Promise<void>;
  leaveRoom: () => Promise<void>;
  kickPlayer: (targetId: string) => Promise<void>;
  finishGame: () => Promise<void>;
  transferCreator: (targetId: string) => Promise<void>;
  updatePlayerProfile: (name: string, avatar: string) => Promise<void>;
  updateRoomSettings: (settings: RoomSettings, password?: string) => Promise<void>;
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

  const createRoom = async (creatorName: string, settings: RoomSettings, avatar: string, password?: string) => {
    const code = await game.createRoom(creatorName, settings, avatar, password);
    setRoomId(code);
    return code;
  };

  const joinRoom = async (roomId: string, name: string, avatar: string, password?: string) => {
    const code = await game.joinRoom(roomId, name, avatar, password);
    setRoomId(code);
    return code;
  };

  const [isExiting, setIsExiting] = useState(false);

  const exitRoom = async () => {
    setIsExiting(true);
    try {
      await game.leaveRoom();
    } catch (e) {
      console.error('Error leaving room', e);
    }
    setRoomId(null);
    // Simulate loading delay for UX
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsExiting(false);
  };

  const contextValue = useMemo(() => ({
    ...game,
    loading: game.loading || isExiting,
    leaveRoom: exitRoom,
    currentRoomId,
    setRoomId: (id: string | null) => {
      if (id === null) {
        exitRoom();
      } else {
        setRoomId(id);
      }
    },
    createRoom,
    joinRoom,
  }), [game, isExiting, currentRoomId]);

  // Wrap all actions to add context-level features if needed
  return (
    <GameContext.Provider value={contextValue}>
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
