import React from 'react';
import { BookOpen, Star, Sparkles, ShieldCheck } from 'lucide-react';

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-card" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen className="text-primary" /> Cómo Jugar
          </h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Bienvenida */}
          <section className="instruction-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366f1' }}>
              <Sparkles size={18} /> ¡Bienvenido a Verdad o Reto!
            </h3>
            <p>
              Este es el juego clásico que ya conoces, pero con un toque moderno y competitivo. Reúne a tus amigos, crea una sala o únete a una existente, y prepárate para revelar tus secretos más oscuros o hacer los retos más locos.
            </p>
          </section>

          {/* El Sistema de Turnos */}
          <section className="instruction-section">
            <h3 style={{ color: '#ec4899' }}>🎮 El Sistema de Turnos</h3>
            <p>El juego decide al azar el orden de los jugadores al iniciar la partida. Cuando sea tu turno, deberás elegir tu destino entre 4 opciones:</p>
            <ul style={{ paddingLeft: '20px', margin: '10px 0', lineHeight: '1.6' }}>
              <li><strong>😇 Verdad Leve:</strong> Una pregunta sencilla sobre ti. <em>(+10 Puntos)</em></li>
              <li><strong>😈 Verdad Picante:</strong> Una pregunta comprometedora o íntima. <em>(+20 Puntos)</em></li>
              <li><strong>🤪 Reto Leve:</strong> Una acción graciosa o inofensiva. <em>(+20 Puntos)</em></li>
              <li><strong>🔥 Reto Picante:</strong> Un reto que pondrá a prueba tu valentía. <em>(+30 Puntos)</em></li>
            </ul>
          </section>

          {/* Votaciones */}
          <section className="instruction-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}>
              <ShieldCheck size={18} /> El Jurado Decide
            </h3>
            <p>
              ¡Cuidado! Solo ganarás los puntos si logras convencer a la <strong>mayoría</strong> (más de la mitad) del resto de jugadores de que respondiste con la verdad o cumpliste el reto satisfactoriamente. Si la votación resulta en un empate o en tu contra, te irás con las manos vacías esta ronda.
            </p>
          </section>

          {/* Habilidades y Tienda */}
          <section className="instruction-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
              <Star size={18} /> La Tienda de Habilidades
            </h3>
            <p>A medida que acumules puntos, podrás comprar poderes especiales para usar a tu favor:</p>
            <div className="skills-list" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                <strong>🦘 Saltar Turno (30 pts):</strong> Te salva si te toca jugar pero no quieres responder nada en esa ronda.
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                <strong>🔄 Cambiar Reto (20 pts):</strong> Sustituye tu pregunta o reto actual por uno totalmente nuevo generado al azar.
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                <strong>🔀 Transferir Reto (40 pts):</strong> ¡La papa caliente! Úsala cuando te den un reto para pasárselo a otro jugador de tu elección.
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                <strong>🎯 Personalizar Reto (50 pts):</strong> Inventa el reto más maquiavélico que se te ocurra y asígnaselo al jugador que quieras para su próximo turno.
              </div>
            </div>
          </section>

          {/* Cosas a tener en cuenta */}
          <section className="instruction-section" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
            <h3 style={{ color: '#8b5cf6' }}>💡 Notas Importantes</h3>
            <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
              <li>Los puntos de los jugadores están ocultos por defecto, pero el creador puede hacerlos visibles en las reglas de la sala.</li>
              <li>Puedes regalar puntos a tus amigos en apuros (si el creador lo permite).</li>
              <li>El creador puede expulsar a jugadores inactivos o cambiar el límite de tiempo sobre la marcha.</li>
            </ul>
          </section>

        </div>

        <div className="modal-footer" style={{ marginTop: '20px' }}>
          <button onClick={onClose} className="cta-button primary" style={{ width: '100%' }}>
            ¡Entendido, a jugar!
          </button>
        </div>
      </div>
    </div>
  );
};
