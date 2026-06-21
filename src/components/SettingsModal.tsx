import React, { useState } from 'react';
import type { RoomSettings } from '../hooks/useGameRoom';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (settings: RoomSettings, password?: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [timeLimit, setTimeLimit] = useState<number>(30); // default 30s
  const [hasTimeLimit, setHasTimeLimit] = useState<boolean>(true);
  const [allowGifting, setAllowGifting] = useState<boolean>(true);
  const [usePassword, setUsePassword] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [skills, setSkills] = useState({
    skipTurn: true,
    changeQuestion: true,
    customTargetQuestion: true,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      turnTimeLimit: hasTimeLimit ? timeLimit : 0,
      allowGiftingPoints: allowGifting,
      enabledSkills: skills,
    }, usePassword ? password.trim() : undefined);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-card">
        <div className="modal-header">
          <h2>Configuración de la Sala</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="settings-form">
          {/* Time limit selector */}
          <div className="form-group">
            <label className="switch-label">
              <input
                type="checkbox"
                checked={hasTimeLimit}
                onChange={(e) => setHasTimeLimit(e.target.checked)}
              />
              <span className="switch-text">Establecer límite de tiempo por turno</span>
            </label>
            {hasTimeLimit && (
              <div className="time-selector-wrapper" style={{ marginTop: '8px', marginLeft: '28px' }}>
                <input
                  type="number"
                  id="timeLimit"
                  min="5"
                  max="300"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Math.max(5, parseInt(e.target.value) || 5))}
                  className="number-input"
                />
                <span className="helper-text">segundos por turno</span>
              </div>
            )}
          </div>

          {/* Password Settings */}
          <div className="form-group">
            <label className="switch-label">
              <input
                type="checkbox"
                checked={usePassword}
                onChange={(e) => setUsePassword(e.target.checked)}
              />
              <span className="switch-text">Proteger sala con contraseña</span>
            </label>
            {usePassword && (
              <div className="time-selector-wrapper" style={{ marginTop: '8px', marginLeft: '28px' }}>
                <input
                  type="text"
                  placeholder="Escribe la contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="number-input"
                  style={{ width: '100%', maxWidth: '200px' }}
                  required={usePassword}
                />
              </div>
            )}
          </div>

          {/* Points gifting toggle */}
          <div className="toggle-group">
            <label className="switch-label">
              <input
                type="checkbox"
                checked={allowGifting}
                onChange={(e) => setAllowGifting(e.target.checked)}
              />
              <span className="switch-text">Permitir obsequiar puntos entre jugadores</span>
            </label>
          </div>

          {/* Enabled skills selection */}
          <div className="skills-settings-section">
            <h3>Habilidades Activas en la Tienda:</h3>
            <p className="section-helper">Elige cuáles habilidades estarán disponibles para comprar en la tienda.</p>
            
            <div className="skills-toggles">
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={skills.skipTurn}
                  onChange={(e) => setSkills({ ...skills, skipTurn: e.target.checked })}
                />
                <span className="switch-text">🦘 Saltar turno (Skip Turn)</span>
              </label>

              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={skills.changeQuestion}
                  onChange={(e) => setSkills({ ...skills, changeQuestion: e.target.checked })}
                />
                <span className="switch-text">🔄 Cambiar pregunta/reto</span>
              </label>

              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={skills.customTargetQuestion}
                  onChange={(e) => setSkills({ ...skills, customTargetQuestion: e.target.checked })}
                />
                <span className="switch-text">🎯 Crear reto personalizado para otro jugador</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="modal-footer">
            <button type="button" className="cta-button secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="cta-button primary">
              Crear y Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
