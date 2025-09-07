import { ReactNode } from 'react';

export type AlertVariant = 'error' | 'warning' | 'info' | 'success';

interface AlertProps {
    variant?: AlertVariant;
    children: ReactNode;
    className?: string;
    'data-testid'?: string;
}

const alertVariants: Record<AlertVariant, string> = {
    error: 'bg-red-50 border border-red-200 text-red-700',
    warning: 'bg-orange-50 border border-orange-200 text-orange-700',
    info: 'bg-blue-50 border border-blue-200 text-blue-700',
    success: 'bg-green-50 border border-green-200 text-green-700',
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
