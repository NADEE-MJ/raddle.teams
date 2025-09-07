interface SelectOption {
    value: string | number;
    label: string;
}

interface SelectProps {
    id?: string;
    value: string | number;
    onChange: (value: string | number) => void;
    options: SelectOption[];
    disabled?: boolean;
    required?: boolean;
    className?: string;
    label?: string;
    placeholder?: string;
    'data-testid'?: string;
}

export default function Select({
    id,
    value,
    onChange,
    options,
    disabled = false,
    required = false,
    className = '',
    label,
    placeholder,
    'data-testid': dataTestId,
}: SelectProps) {
    const baseSelectClasses =
        'px-2 py-1 border border-border-light bg-secondary text-tx-primary rounded text-xs cursor-pointer transition duration-200 hover:bg-secondary-light hover:border-accent focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent';
    const disabledClasses = 'disabled:opacity-50 disabled:cursor-not-allowed';

    const selectClasses = [baseSelectClasses, disabledClasses, className].filter(Boolean).join(' ');

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;
        // Try to parse as number if the original value was a number
        const parsedValue = typeof value === 'number' && !isNaN(Number(newValue)) ? Number(newValue) : newValue;
        onChange(parsedValue);
    };

    return (
        <div className='text-left'>
            {label && (
                <label htmlFor={id} className='text-tx-secondary mb-2 block text-sm font-medium'>
                    {label}
                    {required && <span className='text-red ml-1'>*</span>}
                </label>
            )}
            <select
                id={id}
                value={value}
                onChange={handleChange}
                disabled={disabled}
                required={required}
                className={selectClasses}
                data-testid={dataTestId}
            >
                {placeholder && (
                    <option value='' disabled={required}>
                        {placeholder}
                    </option>
                )}
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
