import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Copy, Share2, Crown, AlertCircle } from 'lucide-react';

export const Lobby: React.FC = () => {
  const { room, playerId, toggleReady, startGame, setRoomId, leaveRoom } = useGame();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

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
          <h3>Reglas de la Sala:</h3>
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
                  <span className="player-avatar">{player.avatar}</span>
                  <span className="player-name">
                    {player.name} {player.id === playerId ? ' (Tú)' : ''}
                    {isPlayerCreator && <Crown size={14} className="creator-icon" />}
                  </span>
                  <span className={`status-badge ${player.isReady ? 'ready' : 'pending'}`}>
                    {player.isReady ? 'Listo' : 'Esperando...'}
                  </span>
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
          <button onClick={() => handleAction('leave', async () => { await leaveRoom(); setRoomId(null); })} className="cta-button secondary" disabled={processingAction !== null}>
            {processingAction === 'leave' ? <span className="loading-spinner-small"></span> : 'Salir de la Sala'}
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
    </div>
  );
};
