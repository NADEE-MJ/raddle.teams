import { ReactNode, useEffect, useCallback } from 'react';

import { LoadingSpinner, Button } from '@/components';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    maxWidth?: string;
    isLoading?: boolean;
}

export default function Modal({ isOpen, onClose, children, maxWidth = 'max-w-4xl', isLoading = false }: ModalProps) {
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
            className='pointer-events-auto fixed inset-0 z-999 flex items-start justify-center pt-24'
            onClick={onClose}
        >
            <div className='pointer-events-none absolute inset-0 backdrop-blur-sm' />
            <div
                className={`relative w-full ${maxWidth} bg-secondary border-border pointer-events-auto max-h-[90vh] overflow-auto rounded-lg border shadow-xl`}
                onClick={e => e.stopPropagation()}
            >
                <div className='relative flex flex-col'>
                    {/* Close Button */}
                    <div className='relative flex justify-end p-2'>
                        <Button
                            onClick={onClose}
                            variant='secondary'
                            size='sm'
                            className='text-tx-muted hover:text-tx-primary hover:bg-elevated rounded-full p-2'
                            data-testid='modal-close-button'
                        >
                            <svg
                                className='h-4 w-4'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                                xmlns='http://www.w3.org/2000/svg'
                            >
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    strokeWidth={2}
                                    d='M6 18L18 6M6 6l12 12'
                                />
                            </svg>
                        </Button>
                    </div>

                    {isLoading ? <LoadingSpinner /> : children}
                </div>
            </div>
        </div>
    );
}
