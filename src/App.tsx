import { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { SkillShop } from './components/SkillShop';
import { SettingsModal } from './components/SettingsModal';
import { isFirebaseConfigured } from './config/firebase';
import { LogOut } from 'lucide-react';
import type { RoomSettings } from './hooks/useGameRoom';
import './App.css';

const AVATARS = ['🦊', '🐯', '🐼', '🐸', '🐙', '🦄', '🦖', '🦁', '🐱', '🍕', '🚀', '💎'];

function GameContent() {
  const {
    room,
    currentRoomId,
    setRoomId,
    createRoom,
    joinRoom,
    loading,
    error
  } = useGame();

  const [name, setName] = useState<string>(() => sessionStorage.getItem('vor_player_name') || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🦊');
  const [joinCode, setJoinCode] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [joinMode, setJoinMode] = useState<boolean>(false);

  // Check URL search parameters for automatic invite code redirection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('room');
    if (inviteCode && !currentRoomId) {
      const timeout = setTimeout(() => {
        setJoinCode(inviteCode.toUpperCase());
        setJoinMode(true);
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [currentRoomId]);

  const handleCreateRoom = async (settings: RoomSettings) => {
    if (!name.trim()) return;
    try {
      await createRoom(name.trim(), settings, selectedAvatar);
      setShowSettings(false);
    } catch (err) {
      const errorVal = err as Error;
      alert(errorVal.message || 'Error al crear la sala');
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !joinCode.trim()) return;
    try {
      await joinRoom(joinCode.trim(), name.trim(), selectedAvatar);
      // Clean up URL if it has query params
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      const errorVal = err as Error;
      alert(errorVal.message || 'Error al unirse a la sala');
    }
  };

  const handleExit = () => {
    if (window.confirm('¿Seguro que deseas salir de la partida actual?')) {
      setRoomId(null);
    }
  };

  // --- LOADING / STATUS SCREEN ---
  if (loading) {
    return (
      <div className="starter-canvas">
        <div className="loading-spinner"></div>
        <p className="loading-text">Sincronizando estado del juego...</p>
      </div>
    );
  }

  // --- SCREEN ROUTING ---

  // Screen 1: Active Game Play Screen
  if (room && room.status !== 'LOBBY') {
    return (
      <div className="app-wrapper">
        <header className="main-header glass-card">
          <div className="header-brand">
            <span className="logo-emoji">🔥</span>
            <h2>Verdad o Reto</h2>
          </div>

          <div className="header-actions">
            <span className={`connection-badge ${isFirebaseConfigured ? 'online' : 'local'}`}>
              {isFirebaseConfigured ? '🟢 Online' : '🔵 Modo Demo Local'}
            </span>
            <span className="room-code-badge">Sala: <strong>{room.id}</strong></span>
            <button onClick={handleExit} className="exit-game-btn" title="Salir del Juego">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="main-content flex-grow">
          {/* Active play board */}
          <GameBoard />
          
          {/* Skill shop underneath */}
          <SkillShop />
        </main>
      </div>
    );
  }

  // Screen 2: Lobby Screen (Waiting for players)
  if (room && room.status === 'LOBBY') {
    return (
      <div className="app-wrapper">
        <header className="main-header glass-card">
          <div className="header-brand">
            <span className="logo-emoji">🔥</span>
            <h2>Verdad o Reto</h2>
          </div>
          <span className={`connection-badge ${isFirebaseConfigured ? 'online' : 'local'}`}>
            {isFirebaseConfigured ? '🟢 Online' : '🔵 Modo Demo Local'}
          </span>
        </header>
        <main className="main-content flex-grow">
          <Lobby />
        </main>
      </div>
    );
  }

  // Screen 3: Start Screen (Create or Join)
  return (
    <div className="starter-container flex-col">
      <div className="starter-glows">
        <div className="glow-1"></div>
        <div className="glow-2"></div>
      </div>

      <div className="welcome-card glass-card page-fade-in">
        <div className="welcome-header">
          <div className="logo-ring">
            <span>🔥</span>
          </div>
          <h1 className="starter-title">Verdad <span>o</span> Reto</h1>
          <p className="starter-subtitle">El clásico juego de fiestas, ahora en tiempo real multi-jugador.</p>
        </div>

        {/* Firebase Config Mode Alert indicator */}
        <span className={`connection-badge ${isFirebaseConfigured ? 'online' : 'local'}`} style={{ margin: '-10px auto 10px auto' }}>
          {isFirebaseConfigured ? '🟢 Conectado a Firebase' : '🔵 Ejecutando en Modo Local (Múltiples Pestañas)'}
        </span>

        {error && <div className="error-banner">{error}</div>}

        <div className="welcome-form">
          {/* Name input */}
          <div className="form-group">
            <label htmlFor="playerName">Introduce tu Nombre:</label>
            <input
              type="text"
              id="playerName"
              placeholder="Ej: erfox"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 12))}
              required
            />
          </div>

          {/* Avatar selector */}
          <div className="form-group">
            <label>Elige tu Avatar:</label>
            <div className="avatar-grid">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`avatar-option ${selectedAvatar === emoji ? 'selected' : ''}`}
                  onClick={() => setSelectedAvatar(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          {!joinMode ? (
            <div className="welcome-actions">
              <button
                onClick={() => {
                  if (!name.trim()) return alert('Por favor, ingresa tu nombre.');
                  setShowSettings(true);
                }}
                className="cta-button primary"
                disabled={!name.trim()}
              >
                Crear una Nueva Sala
              </button>
              <button
                onClick={() => setJoinMode(true)}
                className="cta-button secondary"
              >
                Unirse a una Sala
              </button>
            </div>
          ) : (
            <form onSubmit={handleJoinRoom} className="join-form">
              <div className="form-group">
                <label htmlFor="roomCode">Introduce el Código de la Sala:</label>
                <input
                  type="text"
                  id="roomCode"
                  placeholder="Ej: FR8A"
                  maxLength={4}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              
              <div className="welcome-actions">
                <button type="submit" className="cta-button primary" disabled={!name.trim() || joinCode.length < 4}>
                  Unirse a la Partida
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setJoinMode(false);
                    // clean URL if invite param exists
                    if (window.location.search) {
                      window.history.replaceState({}, document.title, window.location.pathname);
                    }
                  }}
                  className="cta-button secondary"
                >
                  Volver Atrás
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Settings Modal popup */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onConfirm={handleCreateRoom}
      />
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
