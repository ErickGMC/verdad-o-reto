import { useState, useEffect, Suspense, lazy } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { AlertProvider, useAlert } from './context/AlertContext';
import { isFirebaseConfigured } from './config/firebase';
import { LogOut } from 'lucide-react';
import type { RoomSettings } from './hooks/useGameRoom';
import './App.css';

const Lobby = lazy(() => import('./components/Lobby').then(m => ({ default: m.Lobby })));
const GameBoard = lazy(() => import('./components/GameBoard').then(m => ({ default: m.GameBoard })));
const SkillShop = lazy(() => import('./components/SkillShop').then(m => ({ default: m.SkillShop })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const AboutModal = lazy(() => import('./components/AboutModal').then(m => ({ default: m.AboutModal })));
const InstructionsModal = lazy(() => import('./components/InstructionsModal').then(m => ({ default: m.InstructionsModal })));

const AVATARS = ['🦊', '🐯', '🐼', '🐸', '🐙', '🦄', '🦖', '🦁', '🐱', '🍕', '🚀', '💎'];

function GameContent() {
  const { room, currentRoomId, setRoomId, createRoom, joinRoom, leaveRoom, loading, error, isKicked } = useGame();
  const { showAlert } = useAlert();
  const [name, setName] = useState<string>(() => localStorage.getItem('vor_player_name') || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🦊');
  const [joinCode, setJoinCode] = useState<string>('');
  const [joinPassword, setJoinPassword] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showAbout, setShowAbout] = useState<boolean>(false);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [joinMode, setJoinMode] = useState<boolean>(false);

  // Listen to see if the current player was kicked from the active room
  useEffect(() => {
    if (isKicked) {
      showAlert('Has sido expulsado de la sala por el creador.', 'warning', 'Expulsado');
      setRoomId(null);
    }
  }, [isKicked, setRoomId, showAlert]);

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

  const handleCreateRoom = async (settings: RoomSettings, password?: string) => {
    if (!name.trim()) return;
    setIsProcessing(true);
    try {
      await createRoom(name.trim(), settings, selectedAvatar, password);
      setShowSettings(false);
    } catch (err) {
      const errorVal = err as Error;
      showAlert(errorVal.message || 'Error al crear la sala', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !joinCode.trim()) return;
    setIsProcessing(true);
    try {
      await joinRoom(joinCode.trim().toUpperCase(), name.trim(), selectedAvatar, joinPassword.trim() || undefined);
      // Clean up URL if it has query params
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      const errorVal = err as Error;
      showAlert(errorVal.message || 'Error al unirse a la sala', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExit = async () => {
    // GameContext will handle the loading state and RoomId reset
    await leaveRoom();
  };

  // --- LOADING / STATUS SCREEN ---
  if (loading || isProcessing) {
    return (
      <div className="starter-canvas">
        <div className="loading-spinner"></div>
        <p className="loading-text">{isProcessing ? 'Conectando con el servidor...' : 'Sincronizando estado del juego...'}</p>
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
              {isFirebaseConfigured ? '🟢 Conectado al servidor' : '🔵 Modo Local'}
            </span>
            <span className="room-code-badge">Sala: <strong>{room.id}</strong></span>
            <button onClick={handleExit} className="exit-game-btn" title="Salir del Juego">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="main-content flex-grow">
          <Suspense fallback={<div className="loading-spinner"></div>}>
            <GameBoard />
            <SkillShop />
          </Suspense>
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
            {isFirebaseConfigured ? '🟢 Conectado al servidor' : '🔵 Modo Local'}
          </span>
        </header>
        <main className="main-content flex-grow">
          <Suspense fallback={<div className="loading-spinner"></div>}>
            <Lobby />
          </Suspense>
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
          {isFirebaseConfigured ? '🟢 Conectado al servidor' : '🔵 Modo Local'}
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
                  if (!name.trim()) return showAlert('Por favor, ingresa tu nombre.', 'warning');
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
              <div className="form-group code-group">
                <label htmlFor="roomCode">📝 Introduce el Código de la Sala:</label>
                <input
                  type="text"
                  id="roomCode"
                  className="input-room-code"
                  placeholder="Ej: FR8A7X"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  required
                />
              </div>

              <div className="form-group password-group">
                <label htmlFor="joinPassword">🔒 Contraseña de Sala (Si tiene):</label>
                <input
                  type="text"
                  id="joinPassword"
                  className="input-room-password"
                  placeholder="Dejar en blanco si no tiene"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                />
              </div>
              
              <div className="welcome-actions">
                <button type="submit" className="cta-button primary" disabled={!name.trim() || joinCode.length < 6 || isProcessing}>
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
        
        <div style={{ textAlign: 'center', marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button className="cta-button link-btn" onClick={() => setShowInstructions(true)}>
            Instrucciones
          </button>
          <button className="cta-button link-btn" onClick={() => setShowAbout(true)}>
            Sobre este juego
          </button>
        </div>
      </div>

      <Suspense fallback={<div className="loading-spinner" />}>
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onConfirm={handleCreateRoom}
        />

        <AboutModal
          isOpen={showAbout}
          onClose={() => setShowAbout(false)}
        />

        <InstructionsModal
          isOpen={showInstructions}
          onClose={() => setShowInstructions(false)}
        />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <AlertProvider>
      <GameProvider>
        <GameContent />
      </GameProvider>
    </AlertProvider>
  );
}
