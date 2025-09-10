import { ReactNode } from 'react';

export type AlertVariant = 'error' | 'warning' | 'info' | 'success';

interface AlertProps {
    variant?: AlertVariant;
    children: ReactNode;
    className?: string;
    'data-testid'?: string;
}

const alertVariants: Record<AlertVariant, string> = {
    error: 'bg-red-200 border border-red-300 text-red-700',
    warning: 'bg-orange-150 border border-orange-200 text-orange-700',
    info: 'bg-blue-150 border border-blue-200 text-blue-700',
    success: 'bg-green-150 border border-green-200 text-green-700',
};

export default function Alert({ variant = 'info', children, className = '', 'data-testid': dataTestId }: AlertProps) {
    const baseClasses = 'mb-6 p-2 rounded text-sm';
    const variantClasses = alertVariants[variant];
    const classes = `${baseClasses} ${variantClasses} ${className}`;

    return (
        <div className={classes} data-testid={dataTestId}>
            {children}
        </div>
    );
}
