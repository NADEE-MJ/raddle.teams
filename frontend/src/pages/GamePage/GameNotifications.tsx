import { useState, useEffect } from 'react';

interface Notification {
    id: string;
    type: 'success' | 'info' | 'warning';
    title: string;
    message: string;
    duration?: number;
}

interface GameNotificationsProps {
    notifications: Notification[];
    onDismiss: (id: string) => void;
}

export default function GameNotifications({ notifications, onDismiss }: GameNotificationsProps) {
    const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        setVisibleNotifications(notifications);

        // Auto-dismiss notifications after their duration
        notifications.forEach((notification) => {
            if (notification.duration && notification.duration > 0) {
                setTimeout(() => {
                    onDismiss(notification.id);
                }, notification.duration);
            }
        });
    }, [notifications, onDismiss]);

    if (visibleNotifications.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
            {visibleNotifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`rounded-lg border p-4 shadow-lg transition-all duration-300 ${
                        notification.type === 'success'
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : notification.type === 'info'
                            ? 'bg-blue-50 border-blue-200 text-blue-800'
                            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
                            <p className="text-sm opacity-90">{notification.message}</p>
                        </div>
                        <button
                            onClick={() => onDismiss(notification.id)}
                            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}