/**
 * PlacementNotification component
 * Shows a banner when teams finish during gameplay
 */

import React, { useEffect } from 'react';

interface PlacementNotificationProps {
    placement: number;
    teamName: string;
    isOwnTeam: boolean;
    onDismiss: () => void;
}

const ordinalSuffix = (n: number): string => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const PlacementNotification: React.FC<PlacementNotificationProps> = ({ placement, teamName, isOwnTeam, onDismiss }) => {
    const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
    const colors: Record<number | string, string> = {
        1: 'bg-yellow-500',
        2: 'bg-gray-400',
        3: 'bg-orange-600',
        default: 'bg-blue-500',
    };

    const message = isOwnTeam
        ? `Your team finished in ${ordinalSuffix(placement)} place!`
        : `${teamName} finished ${ordinalSuffix(placement)}! Keep going!`;

    const bgColor = colors[placement] || colors.default;

    // Auto-dismiss after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss();
        }, 5000);

        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 transform ${bgColor} animate-slide-in z-50 flex items-center gap-3 rounded-lg px-6 py-3 text-white shadow-lg`}
            role='alert'
        >
            <span className='text-2xl'>{medals[placement]}</span>
            <span className='font-semibold'>{message}</span>
            <button
                onClick={onDismiss}
                className='ml-4 text-xl font-bold text-white hover:text-gray-200'
                aria-label='Dismiss notification'
            >
                ×
            </button>
        </div>
    );
};

export default PlacementNotification;
