import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Gift, Check, X, Timer, Trophy, Crown, UserMinus } from 'lucide-react';

export const GameBoard: React.FC = () => {
  const {
    room,
    playerId,
    selectCategory,
    submitResponse,
    castVote,
    nextTurn,
    giftPoints,
    kickPlayer,
    transferCreator,
  } = useGame();

  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [giftTargetId, setGiftTargetId] = useState<string>('');
  const [giftAmount, setGiftAmount] = useState<number>(10);
  const [showGiftForm, setShowGiftForm] = useState<boolean>(false);
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

  const isMyTurn = room?.currentTurn?.activePlayerId === playerId;
  const status = room?.status;
  const turnTimeLimit = room?.settings?.turnTimeLimit;
  const startedAt = room?.currentTurn?.startedAt;

  // Synchronized countdown timer hook
  useEffect(() => {
    if (!status || !startedAt || !turnTimeLimit || turnTimeLimit === 0 || status !== 'WAITING_RESPONSE') {
      const timeout = setTimeout(() => setTimeLeft(0), 0);
      return () => clearTimeout(timeout);
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, turnTimeLimit - elapsed);
      setTimeLeft(remaining);

      // Active player triggers auto-submit if time runs out
      if (remaining === 0 && isMyTurn) {
        submitResponse();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [startedAt, status, turnTimeLimit, isMyTurn, submitResponse]);

  if (!room || !room.currentTurn) return null;

  const activePlayer = room.players[room.currentTurn.activePlayerId];
  const playersList = Object.values(room.players);
  const me = room.players[playerId];

  // Count voters
  const totalVoters = room.playerOrder.length - 1;
  const currentVotes = room.currentTurn.votes || {};
  const totalVotesCast = Object.keys(currentVotes).length;
  const allVoted = totalVotesCast >= totalVoters;

  // Calculate vote tally
  const positiveVotes = Object.values(currentVotes).filter((v) => v === 'COMPLIED').length;
  const passed = positiveVotes > 0 && positiveVotes >= Math.ceil(totalVoters / 2);

  // Points gift submit handler
  const handleGiftPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftTargetId || giftAmount <= 0) return;
    handleAction('gift', () => giftPoints(giftTargetId, giftAmount)).then(() => {
      setShowGiftForm(false);
    });
  };

  return (
    <div className="game-grid page-fade-in">
      {/* LEFT COLUMN: Active game area */}
      <div className="active-play-area">
        {/* Turn indicator banner */}
        <div className="turn-banner glass-card">
          <div className="turn-indicator">
            <span className="player-avatar animate-pulse">{activePlayer?.avatar}</span>
            <div>
              <h3>Turno de {activePlayer?.name}</h3>
              <p className="turn-step-desc">
                {room.status === 'SELECTING' && 'Eligiendo verdad o reto...'}
                {room.status === 'WAITING_RESPONSE' && 'Respondiendo al reto o verdad...'}
                {room.status === 'VOTING' && 'Votando desempeño...'}
              </p>
            </div>
          </div>
          {room.settings.turnTimeLimit > 0 && room.status === 'WAITING_RESPONSE' && (
            <div className={`turn-timer ${timeLeft <= 10 ? 'critical' : ''}`}>
              <Timer size={18} />
              <span>{timeLeft}s</span>
            </div>
          )}
        </div>

        {/* 1. SELECTING STATE */}
        {room.status === 'SELECTING' && (
          <div className="selection-area glass-card">
            {isMyTurn ? (
              <div className="my-turn-picker">
                {room.customQueuedQuestions?.[playerId] ? (
                  <div className="custom-question-alert alert-info warning">
                    <span>⚠️ Tienes una pregunta personalizada pendiente hecha por un compañero.</span>
                    <button 
                      onClick={() => handleAction('truth_leve', () => selectCategory('truth_leve'))}
                      disabled={processingAction !== null}
                      className="cta-button primary"
                      style={{ marginTop: '12px' }}
                    >
                      {processingAction === 'truth_leve' ? <span className="loading-spinner-small"></span> : 'Revelar Mi Reto Personalizado 🎯'}
                    </button>
                  </div>
                ) : (
                  <>
                    <h3>¡Elige tu destino!</h3>
                    <div className="picker-grid">
                      <button onClick={() => handleAction('truth_leve', () => selectCategory('truth_leve'))} disabled={processingAction !== null} className="pick-card truth leve">
                        <span className="pick-emoji">{processingAction === 'truth_leve' ? <span className="loading-spinner-small"></span> : '😇'}</span>
                        <h4>Verdad Leve</h4>
                        <span className="points-badge">+10 pts</span>
                      </button>

                      <button onClick={() => handleAction('truth_picante', () => selectCategory('truth_picante'))} disabled={processingAction !== null} className="pick-card truth picante">
                        <span className="pick-emoji">{processingAction === 'truth_picante' ? <span className="loading-spinner-small"></span> : '😈'}</span>
                        <h4>Verdad Picante</h4>
                        <span className="points-badge">+20 pts</span>
                      </button>

                      <button onClick={() => handleAction('dare_leve', () => selectCategory('dare_leve'))} disabled={processingAction !== null} className="pick-card dare leve">
                        <span className="pick-emoji">{processingAction === 'dare_leve' ? <span className="loading-spinner-small"></span> : '🤪'}</span>
                        <h4>Reto Leve</h4>
                        <span className="points-badge">+10 pts</span>
                      </button>

                      <button onClick={() => handleAction('dare_picante', () => selectCategory('dare_picante'))} disabled={processingAction !== null} className="pick-card dare picante">
                        <span className="pick-emoji">{processingAction === 'dare_picante' ? <span className="loading-spinner-small"></span> : '🔥'}</span>
                        <h4>Reto Picante</h4>
                        <span className="points-badge">+20 pts</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="waiting-screen">
                <div className="loading-spinner"></div>
                <p>Esperando a que <strong>{activePlayer?.name}</strong> elija una opción...</p>
              </div>
            )}
          </div>
        )}

        {/* 2. WAITING RESPONSE STATE */}
        {room.status === 'WAITING_RESPONSE' && (
          <div className="challenge-area glass-card">
            <span className="starter-badge type-indicator">
              {room.currentTurn.typeSelected?.replace('_', ' ')}
            </span>
            
            {/* The Challenge Content Card */}
            <div className="challenge-card">
              <p className="challenge-text">"{room.currentTurn.content}"</p>
            </div>

            {isMyTurn ? (
              <div className="active-player-actions">
                <p className="instruction">Lee la pregunta/reto en voz alta y realízalo. Luego presiona el botón.</p>
                <button onClick={() => handleAction('submit_response', submitResponse)} disabled={processingAction !== null} className="cta-button primary action-btn">
                  {processingAction === 'submit_response' ? <span className="loading-spinner-small"></span> : '¡Listo, califíquenme! 👍'}
                </button>
              </div>
            ) : (
              <div className="waiting-screen">
                <div className="loading-spinner"></div>
                <p>Esperando a que <strong>{activePlayer?.name}</strong> complete el reto o responda...</p>
              </div>
            )}
          </div>
        )}

        {/* 3. VOTING & ROUND END STATE */}
        {room.status === 'VOTING' && (
          <div className="voting-area glass-card">
            <h3>Calificación del Turno</h3>
            <div className="challenge-card-mini">
              <p>"{room.currentTurn.content}"</p>
            </div>

            {/* Voting buttons for non-active players */}
            {!isMyTurn && !currentVotes[playerId] && !allVoted ? (
              <div className="voting-booth">
                <p className="instruction">¿Consideras que completó el reto o respondió con la verdad?</p>
                <div className="vote-buttons">
                  <button onClick={() => handleAction('vote_success', () => castVote('COMPLIED'))} disabled={processingAction !== null} className="vote-btn success">
                    {processingAction === 'vote_success' ? <span className="loading-spinner-small"></span> : <><Check size={20} /> Cumplió</>}
                  </button>
                  <button onClick={() => handleAction('vote_fail', () => castVote('FAILED'))} disabled={processingAction !== null} className="vote-btn danger">
                    {processingAction === 'vote_fail' ? <span className="loading-spinner-small"></span> : <><X size={20} /> Falló</>}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Tally list */}
            <div className="votes-status-section">
              <h4>Votaciones ({totalVotesCast}/{totalVoters}):</h4>
              <div className="voters-grid">
                {playersList
                  .filter((p) => p.id !== room.currentTurn?.activePlayerId)
                  .map((p) => {
                    const vote = currentVotes[p.id];
                    return (
                      <div key={p.id} className="voter-status-row">
                        <span className="voter-avatar">{p.avatar}</span>
                        <span className="voter-name">{p.name}</span>
                        <span className={`vote-badge ${vote ? vote.toLowerCase() : 'pending'}`}>
                          {vote === 'COMPLIED' && '✅ CUMPLIÓ'}
                          {vote === 'FAILED' && '❌ FALLÓ'}
                          {!vote && '⏳ PENDIENTE'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Results Banner when all votes are cast */}
            {allVoted && (
              <div className={`results-banner ${passed ? 'success' : 'fail'}`}>
                <h3>{passed ? '🎉 ¡RETO CUMPLIDO!' : '💀 ¡RETO FALLADO!'}</h3>
                <p>
                  Votos a Favor: <strong>{positiveVotes}</strong> de <strong>{totalVoters}</strong>
                </p>
                <p className="score-reward">
                  {passed 
                    ? `Puntos ganados por ${activePlayer?.name}: +${room.currentTurn.typeSelected?.endsWith('picante') || room.currentTurn.typeSelected === 'custom' ? '20' : '10'} pts`
                    : 'No sumó puntos en esta ronda.'
                  }
                </p>

                {(isMyTurn || playerId === room.creatorId) && (
                  <button onClick={() => handleAction('next_turn', nextTurn)} disabled={processingAction !== null} className="cta-button primary next-turn-btn">
                    {processingAction === 'next_turn' ? <span className="loading-spinner-small"></span> : 'Continuar al Siguiente Turno ➡️'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Standings & Points Gift */}
      <div className="scoreboard-area">
        {/* Player Leaderboard */}
        <div className="leaderboard-card glass-card">
          <div className="board-header">
            <Trophy className="trophy-icon" />
            <h3>Puntajes</h3>
          </div>
          <div className="standings-list">
            {playersList
              .sort((a, b) => b.score - a.score)
              .map((p, idx) => {
                const isActive = p.id === room.currentTurn?.activePlayerId;
                return (
                  <div key={p.id} className={`standing-row ${isActive ? 'active-player' : ''} ${p.id === playerId ? 'me' : ''}`}>
                    <span className="rank-num">#{idx + 1}</span>
                    <span className="avatar">{p.avatar}</span>
                    <span className="name">
                      {p.name}
                      {p.id === room.creatorId && ' 👑'}
                    </span>
                    <span className="score"><strong>{p.score}</strong> pts</span>
                    {playerId === room.creatorId && p.id !== playerId && (
                      <div className="admin-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                        <button 
                          className="icon-btn admin-btn" 
                          title="Hacer Creador" 
                          onClick={() => handleAction(`crown_${p.id}`, () => transferCreator(p.id))}
                          disabled={processingAction !== null}
                        >
                          {processingAction === `crown_${p.id}` ? <span className="loading-spinner-small"></span> : <Crown size={14} />}
                        </button>
                        <button 
                          className="icon-btn admin-btn danger" 
                          title="Expulsar Jugador" 
                          onClick={() => {
                            if (window.confirm(`¿Expulsar a ${p.name}?`)) {
                              handleAction(`kick_${p.id}`, () => kickPlayer(p.id));
                            }
                          }}
                          disabled={processingAction !== null}
                        >
                          {processingAction === `kick_${p.id}` ? <span className="loading-spinner-small"></span> : <UserMinus size={14} />}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Gift Points Section */}
        {room.settings.allowGiftingPoints && me && me.score > 0 && (
          <div className="gift-points-card glass-card">
            {!showGiftForm ? (
              <button onClick={() => setShowGiftForm(true)} className="cta-button secondary gift-toggle-btn">
                <Gift size={16} /> Obsequiar Puntos
              </button>
            ) : (
              <form onSubmit={handleGiftPoints} className="gift-form">
                <h4>Regalar Puntos</h4>
                <div className="form-group">
                  <select
                    value={giftTargetId}
                    onChange={(e) => setGiftTargetId(e.target.value)}
                    required
                  >
                    <option value="">-- Destinatario --</option>
                    {playersList
                      .filter((p) => p.id !== playerId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.avatar} {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group row-group">
                  <input
                    type="number"
                    min="1"
                    max={me.score}
                    value={giftAmount}
                    onChange={(e) => setGiftAmount(Math.min(me.score, Math.max(1, parseInt(e.target.value) || 0)))}
                    required
                  />
                  <button type="submit" disabled={!giftTargetId || me.score < giftAmount || processingAction !== null} className="cta-button primary send-btn">
                    {processingAction === 'gift' ? <span className="loading-spinner-small"></span> : 'Enviar'}
                  </button>
                </div>
                <button type="button" onClick={() => setShowGiftForm(false)} className="cta-button link-btn">
                  Cancelar
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
