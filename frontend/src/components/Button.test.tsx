import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import Button from '@/components/Button';

describe('Button Component', () => {
    const mockOnClick = vi.fn();

    beforeEach(() => {
        mockOnClick.mockClear();
    });

    describe('Basic Rendering', () => {
        test('renders with default props and children', () => {
            render(<Button>Click me</Button>);

            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
            expect(button).toHaveTextContent('Click me');
            expect(button).toHaveAttribute('type', 'button');
        });
    });

    describe('Button Variants', () => {
        test('applies primary variant styles by default', () => {
            render(<Button>Primary</Button>);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-accent', 'hover:bg-accent/80', 'text-black');
        });

        test('applies secondary variant styles', () => {
            render(<Button variant='secondary'>Secondary</Button>);

            const button = screen.getByRole('button');
            expect(button).toHaveClass(
                'bg-secondary',
                'border',
                'border-border',
                'hover:bg-elevated',
                'hover:border-accent',
                'text-tx-primary'
            );
        });

        test('applies destructive variant styles', () => {
            render(<Button variant='destructive'>Delete</Button>);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-red-700', 'border', 'border-red-700', 'hover:bg-red-800', 'text-tx-primary');
        });

        test('applies link variant styles', () => {
            render(<Button variant='link'>Link</Button>);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-transparent', 'text-tx-secondary', 'hover:text-tx-primary');
        });

        test('applies hint variant styles', () => {
            render(<Button variant='hint'>Hint</Button>);

            const button = screen.getByRole('button');
            expect(button).toHaveClass(
                'bg-transform-bg',
                'border-[0.5px]',
                'border-ladder-rungs',
                'hover:bg-blue-600',
                'text-white'
            );
        });
    });

    describe('Button Sizes', () => {
        test('applies medium size by default', () => {
            render(<Button>Medium</Button>);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('px-3', 'py-1', 'text-sm');
        });

        test('applies small size', () => {
            render(<Button size='sm'>Small</Button>);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('px-2', 'py-1', 'text-xs');
        });

        test('applies large size', () => {
            render(<Button size='lg'>Large</Button>);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('px-4', 'py-2', 'text-base');
        });
    });

    describe('Button States', () => {
        test('handles disabled state', () => {
            render(<Button disabled>Disabled</Button>);

            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
            expect(button).toHaveClass(
                'disabled:opacity-50',
                'disabled:cursor-not-allowed',
                'disabled:active:scale-100'
            );
        });

        test('handles loading state', () => {
            render(<Button loading>Loading</Button>);

            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
            expect(button).toHaveTextContent('Loading...');
        });

        test('does not add ellipsis to loading text that already contains them', () => {
            render(<Button loading>Loading...</Button>);

            const button = screen.getByRole('button');
            expect(button).toHaveTextContent('Loading...');
            expect(button.textContent).not.toBe('Loading......');
        });

        test('preserves non-string children when loading', () => {
            render(
                <Button loading>
                    <span>Loading Icon</span>
                </Button>
            );

            expect(screen.getByText('Loading Icon')).toBeInTheDocument();
        });
    });

    describe('Button Types', () => {
        test('applies different button types', () => {
            const { rerender } = render(<Button type='submit'>Submit</Button>);
            expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');

            rerender(<Button type='reset'>Reset</Button>);
            expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
        });
    });

    describe('Click Handling', () => {
        test('calls onClick when clicked', async () => {
            const user = userEvent.setup();
            render(<Button onClick={mockOnClick}>Click me</Button>);

            await user.click(screen.getByRole('button'));

            expect(mockOnClick).toHaveBeenCalledTimes(1);
        });

        test('does not call onClick when disabled', async () => {
            const user = userEvent.setup();
            render(
                <Button onClick={mockOnClick} disabled>
                    Disabled
                </Button>
            );

            await user.click(screen.getByRole('button'));

            expect(mockOnClick).not.toHaveBeenCalled();
        });

        test('does not call onClick when loading', async () => {
            const user = userEvent.setup();
            render(
                <Button onClick={mockOnClick} loading>
                    Loading
                </Button>
            );

            await user.click(screen.getByRole('button'));

            expect(mockOnClick).not.toHaveBeenCalled();
        });

        test('passes click event to onClick handler', async () => {
            const user = userEvent.setup();
            render(<Button onClick={mockOnClick}>Click me</Button>);

            await user.click(screen.getByRole('button'));

            expect(mockOnClick).toHaveBeenCalledWith(expect.any(Object));
            expect(mockOnClick.mock.calls[0][0]).toHaveProperty('type', 'click');
        });
    });

    describe('Custom Styling', () => {
        test('applies custom className and base classes', () => {
            render(<Button className='custom-class'>Custom</Button>);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('custom-class');
            expect(button).toHaveClass(
                'rounded-md',
                'cursor-pointer',
                'font-medium',
                'transition-all',
                'duration-50',
                'active:scale-90'
            );
        });
    });

    describe('Test ID Support', () => {
        test('applies data-testid when provided', () => {
            render(<Button data-testid='test-button'>Test</Button>);

            expect(screen.getByTestId('test-button')).toBeInTheDocument();
        });

        test('works without data-testid', () => {
            render(<Button>No Test ID</Button>);

            expect(screen.getByRole('button')).toBeInTheDocument();
        });
    });

    describe('Combined Props', () => {
        test('handles multiple props together', () => {
            render(
                <Button
                    variant='destructive'
                    size='lg'
                    disabled
                    className='extra-class'
                    data-testid='complex-button'
                    type='submit'
                >
                    Complex Button
                </Button>
            );

            const button = screen.getByTestId('complex-button');
            expect(button).toBeInTheDocument();
            expect(button).toBeDisabled();
            expect(button).toHaveAttribute('type', 'submit');
            expect(button).toHaveClass('bg-red-700', 'px-4', 'py-2', 'extra-class');
            expect(button).toHaveTextContent('Complex Button');
        });

        test('loading overrides disabled for interaction', () => {
            render(
                <Button loading disabled={false}>
                    Loading but not disabled prop
                </Button>
            );

            const button = screen.getByRole('button');
            expect(button).toBeDisabled(); // Should still be disabled due to loading
        });
    });

    describe('Accessibility', () => {
        test('is keyboard accessible', async () => {
            const user = userEvent.setup();
            render(<Button onClick={mockOnClick}>Keyboard</Button>);

            const button = screen.getByRole('button');
            button.focus();
            await user.keyboard('{Enter}');
            expect(mockOnClick).toHaveBeenCalledTimes(1);

            mockOnClick.mockClear();
            await user.keyboard(' ');
            expect(mockOnClick).toHaveBeenCalledTimes(1);
        });
    });
});
