import { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'link' | 'hint';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    loadingIndicatorPlacement?: 'left' | 'right';
    children: ReactNode;
    className?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    type?: 'button' | 'submit' | 'reset';
    'data-testid'?: string;
}

const buttonVariants: Record<ButtonVariant, string> = {
    primary: 'bg-accent hover:bg-accent/80 text-black',
    secondary: 'bg-secondary border border-border hover:bg-elevated hover:border-accent text-tx-primary',
    destructive: 'bg-red-700 border border-red-700 hover:bg-red-800 text-tx-primary',
    link: 'bg-transparent text-tx-secondary hover:text-tx-primary',
    hint: 'bg-transform-bg border-[0.5px] border-ladder-rungs hover:bg-blue-600 text-white',
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
    loadingIndicatorPlacement = 'right',
    children,
    className = '',
    onClick,
    type = 'button',
    'data-testid': dataTestId,
}: ButtonProps) {
    const baseClasses =
        'inline-flex items-center justify-center rounded-md cursor-pointer font-medium transition-all duration-50 active:scale-90';
    const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

    const classes = [baseClasses, buttonVariants[variant], buttonSizes[size], disabledClasses, className]
        .filter(Boolean)
        .join(' ');

    const button = (
        <button
            type={type}
            className={classes}
            disabled={disabled || loading}
            aria-disabled={disabled || loading || undefined}
            onClick={onClick}
            data-testid={dataTestId}
        >
            {children}
        </button>
    );

    return (
        <span className='inline-flex items-center'>
            {loading && loadingIndicatorPlacement === 'left' && (
                <span className='mr-2 inline-flex items-center justify-center' role='status' aria-label='Loading'>
                    <span className='border-accent h-4 w-4 animate-spin rounded-full border-2 border-t-transparent'></span>
                </span>
            )}
            {button}
            {loading && loadingIndicatorPlacement === 'right' && (
                <span className='ml-2 inline-flex items-center justify-center' role='status' aria-label='Loading'>
                    <span className='border-accent h-4 w-4 animate-spin rounded-full border-2 border-t-transparent'></span>
                </span>
            )}
        </span>
    );
}
