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
              <div className="yape-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(106, 27, 154, 0.1)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(106, 27, 154, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: '#6a1b9a', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' }}>
                    📱
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Yape a este número</span>
                    <strong style={{ color: '#6a1b9a', fontSize: '22px', letterSpacing: '2px' }}>997 346 193</strong>
                  </div>
                </div>
                <button 
                  onClick={() => {
                     navigator.clipboard.writeText('997346193');
                     alert('¡Número 997346193 copiado! Se intentará abrir la app de Yape.');
                     // Intentar abrir Yape mediante deep link
                     window.location.href = 'yape://';
                  }}
                  className="cta-button primary" 
                  style={{ backgroundColor: '#6a1b9a', color: '#fff', border: 'none', width: '100%', marginTop: '8px', boxShadow: '0 4px 15px rgba(106, 27, 154, 0.4)' }}
                >
                  Copiar y Abrir Yape
                </button>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <p className="contact-note" style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  Si te ha gustado, puedes invitarme un café <Coffee size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                </p>
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
