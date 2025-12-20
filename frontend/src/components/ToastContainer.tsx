import { Toast, ToastProps } from './Toast';

interface ToastContainerProps {
    toasts: Omit<ToastProps, 'onClose'>[];
    onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    // Show up to 3 toasts stacked (front, middle, back)
    const visibleToasts = toasts.slice(0, 3);
    const remainingCount = toasts.length - 3;

    return (
        <div
            className='pointer-events-none fixed top-0 left-0 z-50 flex w-full justify-center p-4'
            aria-live='polite'
            aria-atomic='true'
        >
            <div className='relative flex w-full max-w-md items-center justify-center' style={{ height: '80px' }}>
                {/* Render toasts in reverse order so front toast is on top visually */}
                {[...visibleToasts].reverse().map((toast, reverseIndex) => {
                    const stackPosition = visibleToasts.length - 1 - reverseIndex;
                    return <Toast key={toast.id} {...toast} onClose={onClose} stackPosition={stackPosition} />;
                })}
                {remainingCount > 0 && (
                    <div
                        className='pointer-events-auto absolute bottom-[-30px] left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-lg'
                        style={{ zIndex: 5 }}
                    >
                        +{remainingCount} more
                    </div>
                )}
            </div>
        </div>
    );
}
