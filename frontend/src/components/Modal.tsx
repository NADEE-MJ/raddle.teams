import { ReactNode, useEffect, useCallback } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    maxWidth?: string;
}

export default function Modal({ isOpen, onClose, children, maxWidth = 'max-w-4xl' }: ModalProps) {
    const handleEscape = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose]
    );

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
        <div
            className='pointer-events-auto fixed inset-0 z-50 flex items-start justify-center p-4 pt-24'
            onClick={onClose}
        >
            <div className='pointer-events-none absolute inset-0 backdrop-blur-sm' />
            <div
                className={`relative w-full ${maxWidth} bg-secondary border-border pointer-events-auto max-h-[90vh] overflow-auto rounded-lg border shadow-xl`}
                onClick={e => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}
