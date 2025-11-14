interface ConnectionBadgeProps {
    isConnected: boolean;
    connectedText?: string;
    disconnectedText?: string;
    className?: string;
}

export default function ConnectionBadge({
    isConnected,
    connectedText = 'Connected',
    disconnectedText = 'Reconnecting...',
    className = '',
}: ConnectionBadgeProps) {
    return (
        <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${
                isConnected
                    ? 'border-green-500/40 bg-green-500/10 text-green-100'
                    : 'border-red-500/40 bg-red-500/10 text-red-100'
            } ${className}`}
        >
            <span
                className={`h-2 w-2 rounded-full ${isConnected ? 'animate-pulse bg-green-400' : 'bg-red-400'}`}
                aria-hidden='true'
            />
            <span>{isConnected ? connectedText : disconnectedText}</span>
        </div>
    );
}
