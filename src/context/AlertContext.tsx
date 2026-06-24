import React, { createContext, useContext, useState } from 'react';
import { CustomAlert } from '../components/CustomAlert';
import type { CustomAlertProps } from '../components/CustomAlert';

interface AlertContextType {
  showAlert: (message: string, type?: 'info' | 'warning' | 'error' | 'success', title?: string) => void;
  showConfirm: (message: string, onConfirm: () => void, title?: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState<CustomAlertProps & { id: number }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
    id: 0,
  });

  const showAlert = (message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info', title?: string) => {
    setAlertConfig((prev: CustomAlertProps & { id: number }) => ({
      isOpen: true,
      message,
      type,
      title,
      confirmText: 'Aceptar',
      cancelText: undefined,
      onConfirm: () => setAlertConfig((c: CustomAlertProps & { id: number }) => ({ ...c, isOpen: false })),
      onCancel: undefined,
      id: prev.id + 1,
    }));
  };

  const showConfirm = (message: string, onConfirm: () => void, title?: string) => {
    setAlertConfig((prev: CustomAlertProps & { id: number }) => ({
      isOpen: true,
      message,
      type: 'warning',
      title: title || 'Confirmar Acción',
      confirmText: 'Sí, continuar',
      cancelText: 'Cancelar',
      onConfirm: () => {
        setAlertConfig((c: CustomAlertProps & { id: number }) => ({ ...c, isOpen: false }));
        onConfirm();
      },
      onCancel: () => setAlertConfig((c: CustomAlertProps & { id: number }) => ({ ...c, isOpen: false })),
      id: prev.id + 1,
    }));
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <CustomAlert {...alertConfig} key={alertConfig.id} />
    </AlertContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
