import React from 'react';
import { Info, Heart, Coffee, Smartphone } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-card about-modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={20} className="neon-text-blue" />
            <h2>Sobre este juego</h2>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="about-content">
          <div className="about-author glass-panel">
            <h3 className="author-name">Erick Martinez Capcha</h3>
            <p className="author-role">Desarrollador Web</p>
            
            <div className="contact-methods">
              <div className="contact-item">
                <Smartphone size={16} />
                <span>997346193</span>
              </div>
              <div className="payment-badges">
                <span className="payment-badge yape">Yape</span>
                <span className="payment-badge plin">Plin</span>
              </div>
            </div>
            <p className="contact-note">¡Contáctame para proyectos, ideas o invitame un café! <Coffee size={14} style={{ display: 'inline', marginLeft: '4px' }} /></p>
          </div>

          <div className="about-philosophy glass-panel">
            <div className="philosophy-icon">
              <Heart size={24} className="pulse-heart" />
            </div>
            <p className="philosophy-text">
              "Este juego fue creado con mucho cariño para que tú y tus amigos puedan desconectarse del ruido y conectarse entre ustedes a través de las risas. En un mundo cada vez más digital, mi mayor deseo es que estas dinámicas sirvan de excusa para compartir momentos auténticos y crear recuerdos inolvidables. ¡Espero de corazón que se diviertan!"
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="cta-button primary" onClick={onClose} style={{ width: '100%' }}>
            Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
};
