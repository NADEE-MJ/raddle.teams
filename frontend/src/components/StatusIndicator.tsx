interface StatusIndicatorProps {
    isConnected: boolean;
    connectedText?: string;
    disconnectedText?: string;
    className?: string;
}

export default function StatusIndicator({
    isConnected,
    connectedText = 'Connected',
    disconnectedText = 'Disconnected',
    className = '',
}: StatusIndicatorProps) {
    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? connectedText : disconnectedText}
            </span>
        </div>
    );
}
