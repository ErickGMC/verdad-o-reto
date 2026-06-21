import React from 'react';
import { Info, Heart, Coffee } from 'lucide-react';

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
            
            <div className="contact-methods" style={{ marginTop: '12px' }}>
              <div className="contact-item" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '18px' }}>✉️</span>
                <a href="mailto:erickmartinezc@gmail.com" style={{ color: 'var(--neon-blue)', textDecoration: 'none' }}>erickmartinezc@gmail.com</a>
              </div>
            </div>
            
            <p className="contact-note" style={{ marginTop: '16px', lineHeight: '1.5' }}>
              ¡Acepto con gusto cualquier sugerencia, crítica constructiva o ideas de nuevas funciones que te gustaría ver en el juego! Escríbeme y hagamos que este juego sea aún mejor.
            </p>

            <div className="support-section" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div className="qr-container" style={{ background: '#fff', padding: '10px', borderRadius: '16px', display: 'inline-block' }}>
                <img src="/yape-qr.png" alt="Yape QR" style={{ width: '150px', height: '150px', display: 'block', borderRadius: '8px' }} />
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <p className="contact-note" style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Si te ha gustado, puedes invitarme un café <Coffee size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                </p>
                <div className="payment-badges" style={{ marginTop: '12px', justifyContent: 'center' }}>
                  <span className="payment-badge plin">Plin</span>
                </div>
              </div>
            </div>
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
