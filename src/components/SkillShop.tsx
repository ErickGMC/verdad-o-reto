import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { ShoppingBag, Star, Play, Send } from 'lucide-react';
import { SKILL_COSTS } from '../hooks/useGameRoom';

export const SkillShop: React.FC = () => {
  const { room, playerId, buySkill, triggerSkill } = useGame();
  const [customTargetId, setCustomTargetId] = useState<string>('');
  const [customText, setCustomText] = useState<string>('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
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

  const me = room.players[playerId];
  if (!me) return null;

  const isMyTurn = room.currentTurn?.activePlayerId === playerId;
  const isSelectingOrWaiting = room.status === 'SELECTING' || room.status === 'WAITING_RESPONSE';

  const skillDetails = [
    {
      id: 'skipTurn' as const,
      name: 'Saltar Turno',
      emoji: '🦘',
      desc: 'Salta tu turno actual instantáneamente. Úsalo si te da pánico responder.',
      enabled: room.settings.enabledSkills.skipTurn,
    },
    {
      id: 'changeQuestion' as const,
      name: 'Cambiar Reto',
      emoji: '🔄',
      desc: 'Cambia tu pregunta o reto actual por uno totalmente nuevo.',
      enabled: room.settings.enabledSkills.changeQuestion,
    },
    {
      id: 'customTargetQuestion' as const,
      name: 'Personalizar Reto',
      emoji: '🎯',
      desc: 'Escribe un reto personalizado y dirígelo a un jugador específico para su próximo turno.',
      enabled: room.settings.enabledSkills.customTargetQuestion,
    },
    {
      id: 'transferChallenge' as const,
      name: 'Transferir Reto',
      emoji: '🔀',
      desc: '¡Pasa la papa caliente! Transfiere tu reto actual a cualquier otro jugador.',
      enabled: room.settings.enabledSkills.transferChallenge,
    },
  ];

  const handleUseCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTargetId || !customText.trim()) return;

    handleAction('custom_target', () => triggerSkill('customTargetQuestion', customTargetId, customText.trim())).then(() => {
      setCustomText('');
      setCustomTargetId('');
      setShowCustomForm(false);
    });
  };

  const handleUseTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTargetId) return;

    handleAction('transfer_challenge', () => triggerSkill('transferChallenge', customTargetId)).then(() => {
      setCustomTargetId('');
      setShowTransferForm(false);
    });
  };

  return (
    <div className="shop-section glass-card">
      <div className="shop-header">
        <div className="shop-title-wrapper">
          <ShoppingBag className="shop-icon" />
          <h3>Tienda de Habilidades</h3>
        </div>
        <div className="player-wallet">
          <Star className="wallet-star" />
          <span>Tus Puntos: <strong>{me.score}</strong></span>
        </div>
      </div>

      {/* Buying Section */}
      <div className="skills-buy-grid">
        {skillDetails.map((skill) => {
          if (!skill.enabled) return null;
          const cost = SKILL_COSTS[skill.id];
          const canBuy = me.score >= cost;

          return (
            <div key={skill.id} className="shop-item">
              <span className="item-emoji">{skill.emoji}</span>
              <div className="item-details">
                <h4>{skill.name}</h4>
                <p>{skill.desc}</p>
              </div>
              <button
                onClick={() => handleAction(`buy_${skill.id}`, () => buySkill(skill.id))}
                disabled={!canBuy || processingAction !== null}
                className="cta-button primary buy-btn"
              >
                {processingAction === `buy_${skill.id}` ? <span className="loading-spinner-small"></span> : `Comprar (${cost} pts)`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Inventory Section */}
      <div className="player-inventory">
        <h3>Tu Inventario de Habilidades ({me.skills.length}):</h3>
        {me.skills.length === 0 ? (
          <p className="empty-inventory-text">No tienes habilidades compradas. ¡Consigue puntos y cómpralas en la tienda!</p>
        ) : (
          <div className="inventory-grid">
            {me.skills.map((skillId, idx) => {
              const details = skillDetails.find((s) => s.id === skillId);
              if (!details) return null;

              // Conditions for using skills
              const isUsable = 
                (skillId === 'skipTurn' && isMyTurn && isSelectingOrWaiting) ||
                (skillId === 'changeQuestion' && isMyTurn && room.status === 'WAITING_RESPONSE') ||
                (skillId === 'customTargetQuestion') ||
                (skillId === 'transferChallenge' && isMyTurn && room.status === 'WAITING_RESPONSE');

              return (
                <div key={idx} className={`inventory-item ${isUsable ? 'usable' : 'locked'}`}>
                  <span className="inv-emoji">{details.emoji}</span>
                  <div className="inv-info">
                    <h4>{details.name}</h4>
                    {!isUsable && (skillId === 'skipTurn' || skillId === 'changeQuestion' || skillId === 'transferChallenge') && (
                      <span className="usage-warning">Sólo en tu turno</span>
                    )}
                  </div>
                  
                  {skillId !== 'customTargetQuestion' && skillId !== 'transferChallenge' ? (
                    <button
                      onClick={() => handleAction(`use_${skillId}`, () => triggerSkill(skillId))}
                      disabled={!isUsable || processingAction !== null}
                      className="cta-button primary use-btn"
                    >
                      {processingAction === `use_${skillId}` ? <span className="loading-spinner-small"></span> : <><Play size={12} /> Usar</>}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (skillId === 'customTargetQuestion') setShowCustomForm(!showCustomForm);
                        if (skillId === 'transferChallenge') setShowTransferForm(!showTransferForm);
                      }}
                      disabled={!isUsable}
                      className="cta-button primary use-btn"
                    >
                      <Play size={12} /> Preparar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Target custom question setup form */}
      {showCustomForm && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card custom-skill-form">
            <div className="modal-header">
              <h2>Preparar Reto Personalizado</h2>
              <button className="close-btn" onClick={() => setShowCustomForm(false)}>&times;</button>
            </div>

            <form onSubmit={handleUseCustom} className="settings-form">
              <div className="form-group">
                <label htmlFor="targetPlayer">Elegir Jugador Objetivo:</label>
                <select
                  id="targetPlayer"
                  value={customTargetId}
                  onChange={(e) => setCustomTargetId(e.target.value)}
                  required
                >
                  <option value="">-- Seleccionar Jugador --</option>
                  {Object.values(room.players)
                    .filter((p) => p.id !== playerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.avatar} {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="customText">Escribe la Verdad o el Reto:</label>
                <textarea
                  id="customText"
                  placeholder="Ej: ¿Es cierto que te gusta alguien de esta sala? o Hazle cosquillas al que esté enfrente..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  maxLength={150}
                  rows={3}
                  required
                ></textarea>
              </div>

              <div className="modal-footer">
                <button type="button" className="cta-button secondary" onClick={() => setShowCustomForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cta-button primary" disabled={!customTargetId || !customText.trim() || processingAction !== null}>
                  {processingAction === 'custom_target' ? <span className="loading-spinner-small"></span> : <><Send size={14} /> Enviar al Jugador</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Target transfer setup form */}
      {showTransferForm && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card custom-skill-form">
            <div className="modal-header">
              <h2>Transferir Reto</h2>
              <button className="close-btn" onClick={() => setShowTransferForm(false)}>&times;</button>
            </div>

            <form onSubmit={handleUseTransfer} className="settings-form">
              <div className="form-group">
                <label htmlFor="targetPlayerTransfer">Elegir Víctima:</label>
                <select
                  id="targetPlayerTransfer"
                  value={customTargetId}
                  onChange={(e) => setCustomTargetId(e.target.value)}
                  required
                >
                  <option value="">-- Seleccionar Jugador --</option>
                  {Object.values(room.players)
                    .filter((p) => p.id !== playerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.avatar} {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="cta-button secondary" onClick={() => setShowTransferForm(false)}>
                  Cancelar
                </button>
                <button type="submit" className="cta-button primary" disabled={!customTargetId || processingAction !== null}>
                  {processingAction === 'transfer_challenge' ? <span className="loading-spinner-small"></span> : <><Send size={14} /> Transferir</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
