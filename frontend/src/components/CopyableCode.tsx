import { useState, useCallback } from 'react';

interface CopyableCodeProps {
    code: string;
    className?: string;
    title?: string;
    'data-testid'?: string;
}

export default function CopyableCode({
    code,
    className = '',
    title = 'Click to copy code',
    'data-testid': dataTestId,
}: CopyableCodeProps) {
    const [copiedCode, setCopiedCode] = useState<boolean>(false);

    const handleCopyCode = useCallback(
        async (event?: React.MouseEvent) => {
            if (event) {
                event.stopPropagation(); // Prevent triggering parent click handlers
            }

            try {
                await navigator.clipboard.writeText(code);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
            } catch (err) {
                console.error('Failed to copy code:', err);
            }
        },
        [code]
    );

    return (
        <button
            onClick={handleCopyCode}
            className={`bg-green/20 text-green hover:bg-green/30 relative cursor-pointer rounded px-2 py-1 font-bold transition-colors duration-200 ${className}`}
            title={title}
            data-testid={dataTestId}
        >
            {code}
            {copiedCode && (
                <span className='absolute -top-8 left-1/2 z-10 -translate-x-1/2 transform rounded bg-black px-2 py-1 text-xs whitespace-nowrap text-white'>
                    Copied!
                </span>
            )}
        </button>
    );
}
