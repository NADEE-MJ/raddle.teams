import { ReactNode } from 'react';

export type CardVariant = 'default' | 'warning' | 'info' | 'clickable';

interface CardProps {
    variant?: CardVariant;
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    'data-testid'?: string;
}

const cardVariants: Record<CardVariant, string> = {
    default: 'rounded-md border border-border bg-tertiary px-4 py-3',
    warning: 'rounded-md border border-orange bg-orange/20 px-4 py-3',
    info: 'rounded-md border border-border bg-blue/20 px-4 py-3',
    clickable:
        'rounded-md border-2 border-border bg-tertiary px-4 py-3 cursor-pointer hover:bg-tertiary transition duration-50 hover:border-accent hover:shadow-md active:scale-95 active:shadow-sm',
};

export default function Card({
    variant = 'default',
    children,
    className = '',
    onClick,
    'data-testid': dataTestId,
}: CardProps) {
    const baseClasses = cardVariants[variant];
    const classes = `${baseClasses} ${className}`;

    if (onClick) {
        return (
            <div className={classes} onClick={onClick} data-testid={dataTestId}>
                {children}
            </div>
        );
    }

    return (
        <div className={classes} data-testid={dataTestId}>
            {children}
        </div>
    );
}
