import { ReactNode, useEffect, useCallback } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    maxWidth?: string;
}

export default function Modal({ isOpen, onClose, children, maxWidth = 'max-w-4xl' }: ModalProps) {
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 pointer-events-auto' onClick={onClose}>
            <div className='absolute inset-0 backdrop-blur-sm pointer-events-none' />
            <div className={`relative w-full ${maxWidth} max-h-[90vh] overflow-auto rounded-lg bg-secondary border border-border shadow-xl pointer-events-auto`} onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    );
}
