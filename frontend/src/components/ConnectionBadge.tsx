import { ConnectionStatus } from '@/types';

interface ConnectionBadgeProps {
    connectionStatus: ConnectionStatus;
    retryCount?: number;
    onRetry?: () => void;
    className?: string;
    connectedText?: string;
    reconnectingText?: string;
}

export default function ConnectionBadge({
    connectionStatus,
    retryCount = 0,
    onRetry,
    className = '',
    connectedText = 'Connected',
    reconnectingText = 'Reconnecting...',
}: ConnectionBadgeProps) {
    // Status configuration
    const statusConfig = {
        connecting: {
            color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100',
            dot: 'bg-yellow-400',
            text: 'Connecting...',
            icon: null,
        },
        connected: {
            color: 'border-green-500/40 bg-green-500/10 text-green-100',
            dot: 'bg-green-400 animate-pulse',
            text: connectedText,
            icon: null,
        },
        reconnecting: {
            color: 'border-orange-500/40 bg-orange-500/10 text-orange-100',
            dot: 'bg-orange-400 animate-pulse',
            text: retryCount > 0 ? `Reconnecting (${retryCount})...` : reconnectingText,
            icon: null,
        },
        disconnected: {
            color: 'border-gray-500/40 bg-gray-500/10 text-gray-100',
            dot: 'bg-gray-400',
            text: 'Disconnected',
            icon: null,
        },
        failed: {
            color: 'border-red-500/40 bg-red-500/10 text-red-100',
            dot: 'bg-red-400',
            text: 'Connection Failed',
            icon: onRetry ? (
                <button onClick={onRetry} className='ml-2 underline hover:text-red-50' aria-label='Retry connection'>
                    Retry
                </button>
            ) : null,
        },
    };

    const config = statusConfig[connectionStatus];

    return (
        <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${config.color} ${className}`}
        >
            <span className={`h-2 w-2 rounded-full ${config.dot}`} aria-hidden='true' />
            <span>{config.text}</span>
            {config.icon}
        </div>
    );
}
