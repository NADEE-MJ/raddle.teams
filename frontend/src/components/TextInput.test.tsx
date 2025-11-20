import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import TextInput from '@/components/TextInput';

describe('TextInput Component', () => {
    const mockOnChange = vi.fn();

    beforeEach(() => {
        mockOnChange.mockClear();
    });

    describe('Basic Rendering', () => {
        test('renders input with basic props', () => {
            render(<TextInput value='' onChange={mockOnChange} />);

            const input = screen.getByRole('textbox');
            expect(input).toBeInTheDocument();
            expect(input).toHaveValue('');
        });

        test('renders with initial value', () => {
            render(<TextInput value='test value' onChange={mockOnChange} />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveValue('test value');
        });

        test('renders with placeholder', () => {
            render(<TextInput value='' onChange={mockOnChange} placeholder='Enter text here' />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveAttribute('placeholder', 'Enter text here');
        });
    });

    describe('Input Types', () => {
        test('defaults to text type', () => {
            render(<TextInput value='' onChange={mockOnChange} />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveAttribute('type', 'text');
        });

        test('applies password type', () => {
            render(<TextInput value='' onChange={mockOnChange} type='password' />);

            const input = screen.getByDisplayValue('');
            expect(input).toHaveAttribute('type', 'password');
        });

        test('applies email type', () => {
            render(<TextInput value='' onChange={mockOnChange} type='email' />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveAttribute('type', 'email');
        });

        test('applies number type', () => {
            render(<TextInput value='' onChange={mockOnChange} type='number' />);

            const input = screen.getByRole('spinbutton');
            expect(input).toHaveAttribute('type', 'number');
        });
    });

    describe('Label Rendering', () => {
        test('renders without label by default', () => {
            render(<TextInput value='' onChange={mockOnChange} />);

            expect(screen.queryByText(/label/i)).not.toBeInTheDocument();
        });

        test('renders with label', () => {
            render(<TextInput value='' onChange={mockOnChange} label='Username' id='username' />);

            expect(screen.getByText('Username')).toBeInTheDocument();
            expect(screen.getByLabelText('Username')).toBeInTheDocument();
        });

        test('associates label with input using id', () => {
            render(<TextInput value='' onChange={mockOnChange} id='username' label='Username' />);

            const label = screen.getByText('Username');
            const input = screen.getByRole('textbox');

            expect(label).toHaveAttribute('for', 'username');
            expect(input).toHaveAttribute('id', 'username');
        });

        test('shows required indicator when required', () => {
            render(<TextInput value='' onChange={mockOnChange} label='Username' required />);

            expect(screen.getByText('*')).toBeInTheDocument();
            expect(screen.getByText('*')).toHaveClass('text-red', 'ml-1');
        });

        test('does not show required indicator when not required', () => {
            render(<TextInput value='' onChange={mockOnChange} label='Username' required={false} />);

            expect(screen.queryByText('*')).not.toBeInTheDocument();
        });
    });

    describe('Error States', () => {
        test('renders without error by default', () => {
            render(<TextInput value='' onChange={mockOnChange} />);

            expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        });

        test('renders error message', () => {
            render(<TextInput value='' onChange={mockOnChange} error='This field is required' />);

            expect(screen.getByText('This field is required')).toBeInTheDocument();
        });

        test('applies error styling to input', () => {
            render(<TextInput value='' onChange={mockOnChange} error='Error message' />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('border-red', 'focus:border-red', 'focus:ring-red');
        });

        test('error message has correct styling', () => {
            render(<TextInput value='' onChange={mockOnChange} error='Error message' />);

            const errorElement = screen.getByText('Error message');
            expect(errorElement).toHaveClass('text-red', 'mt-1', 'text-sm');
        });
    });

    describe('Input States', () => {
        test('handles disabled state', () => {
            render(<TextInput value='' onChange={mockOnChange} disabled />);

            const input = screen.getByRole('textbox');
            expect(input).toBeDisabled();
            expect(input).toHaveClass(
                'disabled:opacity-50',
                'disabled:cursor-not-allowed',
                'disabled:hover:border-border'
            );
        });

        test('handles required state', () => {
            render(<TextInput value='' onChange={mockOnChange} required />);

            const input = screen.getByRole('textbox');
            expect(input).toBeRequired();
        });

        test('applies maxLength constraint', () => {
            render(<TextInput value='' onChange={mockOnChange} maxLength={10} />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveAttribute('maxLength', '10');
        });

        test('applies minLength constraint', () => {
            render(<TextInput value='' onChange={mockOnChange} minLength={3} />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveAttribute('minLength', '3');
        });
    });

    describe('Change Handling', () => {
        test('calls onChange when typing', async () => {
            const user = userEvent.setup();
            render(<TextInput value='' onChange={mockOnChange} />);

            const input = screen.getByRole('textbox');
            await user.type(input, 'h');

            expect(mockOnChange).toHaveBeenCalledWith('h');
        });

        test('calls onChange with correct value on clear', async () => {
            const user = userEvent.setup();
            render(<TextInput value='initial' onChange={mockOnChange} />);

            const input = screen.getByRole('textbox');
            await user.clear(input);

            expect(mockOnChange).toHaveBeenCalledWith('');
        });

        test('calls onChange when value changes', async () => {
            const user = userEvent.setup();
            render(<TextInput value='test' onChange={mockOnChange} />);

            const input = screen.getByRole('textbox');
            await user.clear(input);

            expect(mockOnChange).toHaveBeenCalledWith('');
        });
    });

    describe('Styling and Classes', () => {
        test('applies base input classes', () => {
            render(<TextInput value='' onChange={mockOnChange} />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass(
                'w-full',
                'rounded-lg',
                'border',
                'border-border',
                'px-3',
                'py-2',
                'shadow-sm',
                'bg-tertiary',
                'text-tx-primary',
                'focus:border-accent',
                'focus:ring-2',
                'focus:ring-accent',
                'focus:outline-none',
                'focus:duration-1',
                'transition-all',
                'duration-100',
                'hover:border-accent'
            );
        });

        test('applies custom className', () => {
            render(<TextInput value='' onChange={mockOnChange} className='custom-class' />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('custom-class');
            expect(input).toHaveClass('w-full', 'rounded-lg'); // Base classes should still be present
        });

        test('applies disabled classes when disabled', () => {
            render(<TextInput value='' onChange={mockOnChange} disabled />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass(
                'disabled:opacity-50',
                'disabled:cursor-not-allowed',
                'disabled:hover:border-border'
            );
        });
    });

    describe('Test ID Support', () => {
        test('applies data-testid when provided', () => {
            render(<TextInput value='' onChange={mockOnChange} data-testid='test-input' />);

            expect(screen.getByTestId('test-input')).toBeInTheDocument();
        });

        test('works without data-testid', () => {
            render(<TextInput value='' onChange={mockOnChange} />);

            expect(screen.getByRole('textbox')).toBeInTheDocument();
        });
    });

    describe('Complex Interactions', () => {
        test('handles focus and blur events', async () => {
            const user = userEvent.setup();
            render(<TextInput value='' onChange={mockOnChange} />);

            const input = screen.getByRole('textbox');
            await user.click(input);
            expect(input).toHaveFocus();

            await user.tab();
            expect(input).not.toHaveFocus();
        });
    });

    describe('Combined Props', () => {
        test('handles multiple props together', () => {
            render(
                <TextInput
                    id='complex-input'
                    type='email'
                    value='test@example.com'
                    onChange={mockOnChange}
                    placeholder='Enter email'
                    label='Email Address'
                    error='Invalid email format'
                    required
                    disabled
                    maxLength={50}
                    className='custom-input'
                    data-testid='complex-input'
                />
            );

            const input = screen.getByTestId('complex-input');
            expect(input).toBeInTheDocument();
            expect(input).toHaveAttribute('type', 'email');
            expect(input).toHaveValue('test@example.com');
            expect(input).toHaveAttribute('placeholder', 'Enter email');
            expect(input).toBeRequired();
            expect(input).toBeDisabled();
            expect(input).toHaveAttribute('maxLength', '50');
            expect(input).toHaveClass('custom-input', 'border-red');

            expect(screen.getByText('Email Address')).toBeInTheDocument();
            expect(screen.getByText('*')).toBeInTheDocument();
            expect(screen.getByText('Invalid email format')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        test('is keyboard accessible', async () => {
            const user = userEvent.setup();
            render(<TextInput value='' onChange={mockOnChange} />);

            const input = screen.getByRole('textbox');
            await user.tab();
            expect(input).toHaveFocus();

            await user.keyboard('t');
            expect(mockOnChange).toHaveBeenCalledWith('t');
        });
    });

    describe('Edge Cases', () => {
        test('handles special characters and long values', () => {
            const specialValue = '!@#$%^&*()_+-=[]{}|;:,.<>?';
            render(<TextInput value={specialValue} onChange={mockOnChange} />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveValue(specialValue);
        });
    });
});
