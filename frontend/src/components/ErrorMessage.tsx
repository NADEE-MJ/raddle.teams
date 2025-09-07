interface ErrorMessageProps {
    message: string | null | undefined;
    className?: string;
    'data-testid'?: string;
}

export default function ErrorMessage({ message, className = '', 'data-testid': dataTestId }: ErrorMessageProps) {
    if (!message) return null;

    return (
        <div
            className={`border-red bg-red/20 text-red mb-6 rounded-lg border px-4 py-3 ${className}`}
            data-testid={dataTestId}
        >
            {message}
        </div>
    );
}
