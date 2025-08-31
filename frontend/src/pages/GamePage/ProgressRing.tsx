interface ProgressRingProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
}

export default function ProgressRing({ 
    percentage, 
    size = 120, 
    strokeWidth = 8,
    className = ""
}: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const getColor = (percent: number) => {
        if (percent === 100) return '#10b981'; // green-500
        if (percent >= 75) return '#f59e0b'; // amber-500
        if (percent >= 50) return '#3b82f6'; // blue-500
        if (percent >= 25) return '#6366f1'; // indigo-500
        return '#6b7280'; // gray-500
    };

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg
                className="transform -rotate-90"
                width={size}
                height={size}
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-gray-200"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={getColor(percentage)}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-lg font-bold" style={{ color: getColor(percentage) }}>
                        {percentage}%
                    </div>
                    {percentage === 100 && (
                        <div className="text-xs text-gray-600">Complete!</div>
                    )}
                </div>
            </div>
        </div>
    );
}