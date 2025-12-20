import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer } from '@/components/ToastContainer';
import type { ToastType } from '@/components/Toast';

interface ToastData {
    id: string;
    message: string;
    type?: ToastType;
    duration?: number;
    placement?: number;
}

interface ToastContextType {
    addToast: (message: string, type?: ToastType, duration?: number, placement?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const addToast = useCallback((message: string, type?: ToastType, duration = 5000, placement?: number) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type, duration, placement }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
