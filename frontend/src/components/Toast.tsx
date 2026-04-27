import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'info' | 'warning' | 'error' | 'placement';

export interface ToastProps {
    id: string;
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: (id: string) => void;
    placement?: number; // For placement-specific styling
    stackPosition?: number; // 0 = front, 1 = middle, 2 = back
}

export function Toast({
    id,
    message,
    type = 'info',
    duration = 5000,
    onClose,
    placement,
    stackPosition = 0,
}: ToastProps) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Only auto-dismiss the front toast
        if (stackPosition === 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [duration, stackPosition]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onClose(id);
        }, 300); // Match animation duration
    };

    // Style based on type
    const getTypeStyles = () => {
        if (type === 'placement') {
            // Special styling for placement notifications
            if (placement === 1) {
                return 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-yellow-600';
            }
            if (placement === 2) {
                return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-500';
            }
            if (placement === 3) {
                return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-orange-600';
            }
            return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600';
        }

        // Redesigned basic toast styles - more vibrant and clean
        switch (type) {
            case 'success':
                return 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-400';
            case 'error':
                return 'bg-gradient-to-br from-red-500 to-rose-600 text-white border-red-400';
            case 'warning':
                return 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-400';
            case 'info':
            default:
                return 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-400';
        }
    };

    const getIcon = () => {
        if (type === 'placement') {
            if (placement === 1) return '🥇';
            if (placement === 2) return '🥈';
            if (placement === 3) return '🥉';
            return '🏁';
        }

        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'warning':
                return '⚠';
            case 'info':
            default:
                return 'ℹ';
        }
    };

    // Get stacking transform styles based on position
    const getStackStyles = () => {
        if (stackPosition === 0) {
            return 'scale-100 translate-y-0 z-30 blur-0';
        }
        if (stackPosition === 1) {
            return 'scale-95 translate-y-3 z-20 blur-[1px] opacity-70';
        }
        if (stackPosition === 2) {
            return 'scale-90 translate-y-6 z-10 blur-[2px] opacity-50';
        }
        return '';
    };

    return (
        <div
            className={` ${getTypeStyles()} pointer-events-auto absolute top-0 left-1/2 flex max-w-md min-w-[300px] -translate-x-1/2 items-center gap-3 rounded-lg border-l-4 px-4 py-3 shadow-2xl transition-all duration-300 ${getStackStyles()} ${isExiting && stackPosition === 0 ? 'translate-y-[-20px] opacity-0' : ''} ${!isExiting && stackPosition === 0 ? 'animate-slide-down' : ''} `}
            role='alert'
            style={{ pointerEvents: stackPosition === 0 ? 'auto' : 'none' }}
        >
            <div className='flex-shrink-0 text-2xl'>{getIcon()}</div>
            <div className='flex-1 text-sm font-medium'>{message}</div>
            {stackPosition === 0 && (
                <button
                    onClick={handleClose}
                    className='flex-shrink-0 rounded p-1 transition-opacity hover:opacity-70'
                    aria-label='Close notification'
                >
                    <svg
                        className='h-4 w-4'
                        fill='none'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                    >
                        <path d='M6 18L18 6M6 6l12 12'></path>
                    </svg>
                </button>
            )}
        </div>
    );
}
