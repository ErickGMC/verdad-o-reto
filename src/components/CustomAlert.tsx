import React from 'react';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

export interface CustomAlertProps {
  isOpen: boolean;
  type?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  isOpen,
  type = 'info',
  title,
  message,
  confirmText = 'Aceptar',
  cancelText,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const icons = {
    info: <Info size={24} className="alert-icon info" />,
    warning: <AlertTriangle size={24} className="alert-icon warning" />,
    error: <AlertTriangle size={24} className="alert-icon error" />,
    success: <CheckCircle size={24} className="alert-icon success" />
  };

  const defaultTitles = {
    info: 'Información',
    warning: 'Atención',
    error: 'Error',
    success: 'Éxito'
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-card alert-modal page-fade-in">
        <div className="alert-header">
          {icons[type]}
          <h2>{title || defaultTitles[type]}</h2>
        </div>
        <div className="alert-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer alert-footer">
          {onCancel && (
            <button onClick={onCancel} className="cta-button secondary">
              {cancelText || 'Cancelar'}
            </button>
          )}
          <button onClick={onConfirm} className={`cta-button primary ${type === 'error' ? 'danger-bg' : ''}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
