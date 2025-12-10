import { useEffect } from 'react';

interface PlacementNotificationProps {
    placement: number;
    teamName: string;
    isOwnTeam: boolean;
    onDismiss: () => void;
}

function ordinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) {
        return num + 'st';
    }
    if (j === 2 && k !== 12) {
        return num + 'nd';
    }
    if (j === 3 && k !== 13) {
        return num + 'rd';
    }
    return num + 'th';
}

export function PlacementNotification({ placement, teamName, isOwnTeam, onDismiss }: PlacementNotificationProps) {
    const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const colors: Record<number, string> = {
        1: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 border-yellow-600',
        2: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900 border-gray-500',
        3: 'bg-gradient-to-r from-orange-400 to-orange-500 text-orange-900 border-orange-600',
    };
    const defaultColor = 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-700';

    const colorClass = colors[placement] || defaultColor;
    const medal = medals[placement] || '🎯';

    const message = isOwnTeam
        ? `Your team finished in ${ordinalSuffix(placement)} place!`
        : `${teamName} finished ${ordinalSuffix(placement)}! Keep going!`;

    // Auto-dismiss after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss();
        }, 5000);

        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div
            className={`animate-slide-in-top pointer-events-auto mb-2 flex items-center justify-between rounded-lg border-2 px-4 py-3 shadow-lg ${colorClass}`}
            role='alert'
        >
            <div className='flex items-center gap-3'>
                <span className='text-2xl'>{medal}</span>
                <div>
                    <p className='font-semibold'>{message}</p>
                    {isOwnTeam && placement === 1 && <p className='text-sm opacity-90'>Congratulations! 🎉</p>}
                </div>
            </div>
            <button
                onClick={onDismiss}
                className='hover:bg-opacity-10 ml-4 rounded-full p-1 hover:bg-black focus:ring-2 focus:ring-white focus:ring-offset-2 focus:outline-none'
                aria-label='Dismiss'
            >
                <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
            </button>
        </div>
    );
}

interface PlacementNotificationsContainerProps {
    notifications: Array<{
        id: string;
        placement: number;
        teamName: string;
        isOwnTeam: boolean;
    }>;
    onDismiss: (id: string) => void;
}

export function PlacementNotificationsContainer({ notifications, onDismiss }: PlacementNotificationsContainerProps) {
    if (notifications.length === 0) {
        return null;
    }

    return (
        <div className='pointer-events-none fixed top-4 right-0 left-0 z-50 flex flex-col items-center px-4'>
            {notifications.map(notification => (
                <PlacementNotification
                    key={notification.id}
                    placement={notification.placement}
                    teamName={notification.teamName}
                    isOwnTeam={notification.isOwnTeam}
                    onDismiss={() => onDismiss(notification.id)}
                />
            ))}
        </div>
    );
}
