import { ReactNode, useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    maxWidth?: string;
}

export default function Modal({ isOpen, onClose, children, maxWidth = 'max-w-4xl' }: ModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <div className='bg-opacity-80 absolute inset-0 bg-black transition-opacity' onClick={onClose} />
            <div className={`relative w-full ${maxWidth} max-h-[90vh] overflow-auto rounded-lg bg-white shadow-xl`}>
                {children}
            </div>
        </div>
    );
}
