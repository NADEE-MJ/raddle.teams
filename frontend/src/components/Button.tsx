import { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'accent' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    children: ReactNode;
    className?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    type?: 'button' | 'submit' | 'reset';
    'data-testid'?: string;
}

const buttonVariants: Record<ButtonVariant, string> = {
    primary: 'bg-accent hover:bg-accent/80 text-primary',
    secondary: 'bg-secondary border border-border hover:bg-elevated hover:border-accent text-tx-primary',
    destructive: 'bg-red/20 border border-red hover:bg-red/30 text-red',
    accent: 'bg-accent/20 border border-accent hover:bg-accent/30 text-accent',
    link: 'bg-transparent hover:bg-secondary text-tx-secondary hover:text-tx-primary',
};

const buttonSizes: Record<ButtonSize, string> = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
};

export default function Button({
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    children,
    className = '',
    onClick,
    type = 'button',
    'data-testid': dataTestId,
}: ButtonProps) {
    const baseClasses =
        'rounded-md cursor-pointer font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-accent';
    const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed';
    const loadingClasses = loading ? 'disabled:bg-tx-muted' : '';

    const classes = [
        baseClasses,
        buttonVariants[variant],
        buttonSizes[size],
        disabledClasses,
        loadingClasses,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            type={type}
            className={classes}
            disabled={disabled || loading}
            onClick={onClick}
            data-testid={dataTestId}
        >
            {loading && typeof children === 'string'
                ? children.includes('...')
                    ? children
                    : `${children}...`
                : children}
        </button>
    );
}
