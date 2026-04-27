interface TextInputProps {
    id?: string;
    type?: 'text' | 'password' | 'email' | 'number';
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    maxLength?: number;
    minLength?: number;
    inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
    className?: string;
    label?: string;
    error?: string;
    'data-testid'?: string;
}

export default function TextInput({
    id,
    type = 'text',
    value,
    onChange,
    placeholder,
    disabled = false,
    required = false,
    maxLength,
    minLength,
    inputMode,
    className = '',
    label,
    error,
    'data-testid': dataTestId,
}: TextInputProps) {
    const baseInputClasses =
        'w-full rounded-lg border border-border px-3 py-2 shadow-sm bg-tertiary text-tx-primary focus:border-accent focus:ring-2 focus:ring-accent focus:outline-none focus:duration-1 transition-all duration-100 hover:border-accent';
    const errorClasses = error ? 'border-red focus:border-red focus:ring-red' : '';
    const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border';

    const inputClasses = [baseInputClasses, errorClasses, disabledClasses, className].filter(Boolean).join(' ');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    return (
        <div className='text-left'>
            {label && (
                <label htmlFor={id} className='text-tx-secondary mb-2 block text-sm font-medium'>
                    {label}
                    {required && <span className='text-red ml-1'>*</span>}
                </label>
            )}
            <input
                id={id}
                type={type}
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                maxLength={maxLength}
                minLength={minLength}
                inputMode={inputMode}
                className={inputClasses}
                data-testid={dataTestId}
            />
            {error && (
                <div className='text-red mt-1 text-sm' data-testid={`${dataTestId}-error`}>
                    {error}
                </div>
            )}
        </div>
    );
}
