import { CustomAlert } from '@/components/CustomAlert';
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AlertOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions>({
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: '',
  });

  const showAlert = (opts: AlertOptions) => {
    setOptions({
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || 'OK',
      cancelText: opts.cancelText || '',
      onConfirm: opts.onConfirm,
      onCancel: opts.onCancel,
    });

    // Delay setting visible to true to ensure re-render
    setTimeout(() => {
      setVisible(true);
    }, 10); // even 0ms sometimes works, but 10ms is safer
  };

  const handleClose = () => {
    setVisible(false);
  };

  const handleConfirm = () => {
    setVisible(false);
    options.onConfirm?.();
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlert
        visible={visible}
        title={options.title}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
