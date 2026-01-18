import { useEffect, useState } from 'react';

interface TimerProps {
    startTime: string;
    durationSeconds: number;
    onExpire?: () => void;
}

export default function Timer({ startTime, durationSeconds, onExpire }: TimerProps) {
    const [timeRemaining, setTimeRemaining] = useState(durationSeconds);

    useEffect(() => {
        const start = new Date(startTime).getTime();
        const end = start + durationSeconds * 1000;

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, Math.ceil((end - now) / 1000));
            setTimeRemaining(remaining);

            if (remaining === 0) {
                clearInterval(interval);
                if (onExpire) {
                    onExpire();
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [startTime, durationSeconds, onExpire]);

    const percentage = (timeRemaining / durationSeconds) * 100;
    const color = timeRemaining <= 5 ? 'bg-red-500' : timeRemaining <= 10 ? 'bg-yellow-500' : 'bg-green-500';

    return (
        <div className='w-full space-y-2'>
            <div className='text-center text-4xl font-bold text-white'>{timeRemaining}s</div>
            <div className='h-4 w-full overflow-hidden rounded-full bg-gray-700'>
                <div
                    className={`h-full transition-all duration-200 ${color}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}
