import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useAlert } from '../context/AlertContext';
import { Copy, Share2, Crown, AlertCircle, UserMinus, Settings, Edit2, Save } from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import type { RoomSettings } from '../hooks/useGameRoom';

export const Lobby: React.FC = () => {
  const { room, playerId, toggleReady, startGame, leaveRoom, kickPlayer, transferCreator, updatePlayerProfile, updateRoomSettings } = useGame();
  const { showConfirm } = useAlert();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const AVATARS = ['🦊', '🐯', '🐼', '🐸', '🐙', '🦄', '🦖', '🦁', '🐱', '🍕', '🚀', '💎'];

  const handleAction = async (actionId: string, actionFn: () => Promise<void>) => {
    if (processingAction) return;
    setProcessingAction(actionId);
    try {
      await actionFn();
    } finally {
      setProcessingAction(null);
    }
  };

  if (!room) return null;

  const playersList = Object.values(room.players);
  const me = room.players[playerId];
  const isCreator = room.creatorId === playerId;

  const startEditingProfile = () => {
    if (me) {
      setEditName(me.name);
      setEditAvatar(me.avatar);
      setIsEditingProfile(true);
    }
  };

  const saveProfile = async () => {
    if (!editName.trim()) return;
    await handleAction('update_profile', () => updatePlayerProfile(editName.trim(), editAvatar));
    setIsEditingProfile(false);
  };

  const handleUpdateSettings = async (settings: RoomSettings, password?: string) => {
    await handleAction('update_settings', () => updateRoomSettings(settings, password));
    setShowSettings(false);
  };

  // Check if all players (excluding the creator) are ready
  const allOtherPlayersReady = playersList
    .filter((p) => p.id !== room.creatorId)
    .every((p) => p.isReady);

  const canStart = isCreator && playersList.length >= 2 && allOtherPlayersReady;

  const copyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}?room=${room.id}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="lobby-container page-fade-in">
      <div className="lobby-card glass-card">
        {/* Lobby Header */}
        <div className="lobby-header">
          <span className="starter-badge">Lobby de Espera</span>
          <h2>Sala de Juego</h2>
          <p className="lobby-info-text">Comparte el código o el link de invitación para que otros se unan.</p>
        </div>

        {/* Access Codes Panel */}
        <div className="lobby-codes-panel">
          <div className="code-box">
            <span className="label">Código de Sala:</span>
            <div className="interactive-field">
              <span className="code">{room.id}</span>
              <button onClick={copyCode} className="icon-btn" title="Copiar Código">
                <Copy size={16} />
                {copiedCode ? <span className="tooltip">¡Copiado!</span> : null}
              </button>
            </div>
          </div>

          <div className="code-box">
            <span className="label">Link de Invitación:</span>
            <div className="interactive-field">
              <span className="url-preview">invitar.juego/{room.id}</span>
              <button onClick={copyInviteLink} className="icon-btn" title="Copiar Link">
                <Share2 size={16} />
                {copiedLink ? <span className="tooltip">¡Copiado!</span> : null}
              </button>
            </div>
          </div>
        </div>

        {/* Room configurations info */}
        <div className="lobby-settings-info">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0 }}>Reglas de la Sala:</h3>
            {isCreator && (
              <button className="cta-button link-btn" onClick={() => setShowSettings(true)} style={{ fontSize: '12px', padding: '4px 8px' }}>
                <Settings size={14} style={{ display: 'inline', marginRight: '4px' }} /> Configurar
              </button>
            )}
          </div>
          <div className="settings-chips">
            <span className="settings-chip">
              ⏱️ Tiempo de turno: {room.settings.turnTimeLimit > 0 ? `${room.settings.turnTimeLimit}s` : 'Ilimitado'}
            </span>
            <span className="settings-chip">
              🎁 Regalos de puntos: {room.settings.allowGiftingPoints ? 'Permitido' : 'Desactivado'}
            </span>
            <span className="settings-chip">
              🛒 Tienda de Habilidades: Activa (50 pts c/u)
            </span>
          </div>
        </div>

        {/* Connected Players list */}
        <div className="lobby-players-section">
          <h3>Jugadores Unidos ({playersList.length}):</h3>
          <div className="players-list">
            {playersList.map((player) => {
              const isPlayerCreator = player.id === room.creatorId;
              return (
                <div key={player.id} className={`player-row ${player.id === playerId ? 'me' : ''}`}>
                  {player.id === playerId && isEditingProfile ? (
                    <div style={{ display: 'flex', gap: '8px', flexGrow: 1, alignItems: 'center' }}>
                      <select 
                        value={editAvatar} 
                        onChange={(e) => setEditAvatar(e.target.value)}
                        style={{ padding: '4px', borderRadius: '4px', fontSize: '16px' }}
                      >
                         {AVATARS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value.slice(0, 12))} 
                        style={{ maxWidth: '120px', padding: '4px 8px' }}
                      />
                      <button onClick={saveProfile} className="icon-btn success" title="Guardar" style={{ width: '32px', height: '32px' }}>
                        {processingAction === 'update_profile' ? <span className="loading-spinner-small"></span> : <Save size={14} />}
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="player-avatar">{player.avatar}</span>
                      <span className="player-name">
                        {player.name} {player.id === playerId ? ' (Tú)' : ''}
                        {isPlayerCreator && <Crown size={14} className="creator-icon" />}
                        {player.id === playerId && !isEditingProfile && (
                           <button onClick={startEditingProfile} className="icon-btn" style={{ marginLeft: '8px', width: '24px', height: '24px' }} title="Editar Perfil">
                             <Edit2 size={12} />
                           </button>
                        )}
                      </span>
                    </>
                  )}
                  <div className="player-status-group">
                    <span className={`status-badge ${player.isReady ? 'ready' : 'pending'}`}>
                      {player.isReady ? 'Listo' : 'Esperando...'}
                    </span>
                    {isCreator && player.id !== playerId && (
                      <div className="admin-actions" style={{ display: 'flex', gap: '4px', flexDirection: 'row' }}>
                        <button 
                          className="icon-btn admin-btn" 
                          title="Hacer Creador" 
                          onClick={() => handleAction(`crown_${player.id}`, () => transferCreator(player.id))}
                          disabled={processingAction !== null}
                        >
                          {processingAction === `crown_${player.id}` ? <span className="loading-spinner-small"></span> : <Crown size={14} />}
                        </button>
                        <button 
                          className="icon-btn admin-btn danger" 
                          title="Expulsar Jugador" 
                          onClick={() => {
                            showConfirm(`¿Seguro que deseas expulsar a ${player.name} de la sala?`, () => {
                              handleAction(`kick_${player.id}`, () => kickPlayer(player.id));
                            }, 'Expulsar Jugador');
                          }}
                          disabled={processingAction !== null}
                        >
                          {processingAction === `kick_${player.id}` ? <span className="loading-spinner-small"></span> : <UserMinus size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warnings for starting */}
        {isCreator && playersList.length < 2 && (
          <div className="alert-info warning">
            <AlertCircle size={16} />
            <span>Se necesitan al menos 2 jugadores para iniciar la partida.</span>
          </div>
        )}
        {isCreator && playersList.length >= 2 && !allOtherPlayersReady && (
          <div className="alert-info warning">
            <AlertCircle size={16} />
            <span>Esperando a que todos los jugadores marquen "Listo" para empezar.</span>
          </div>
        )}

        {/* Actions buttons */}
        <div className="lobby-actions">
          <button onClick={leaveRoom} className="cta-button secondary" disabled={processingAction !== null}>
            Salir de la Sala
          </button>

          {!isCreator ? (
            <button 
              onClick={() => handleAction('ready', toggleReady)} 
              disabled={processingAction !== null}
              className={`cta-button ${me?.isReady ? 'secondary' : 'primary'}`}
            >
              {processingAction === 'ready' ? <span className="loading-spinner-small"></span> : (me?.isReady ? 'Quitar Listo' : 'Marcar Listo')}
            </button>
          ) : (
            <button 
              onClick={() => handleAction('start', startGame)} 
              disabled={!canStart || processingAction !== null} 
              className="cta-button primary"
            >
              {processingAction === 'start' ? <span className="loading-spinner-small"></span> : 'Iniciar Partida 🚀'}
            </button>
          )}
        </div>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onConfirm={handleUpdateSettings}
      />
    </div>
  );
};
