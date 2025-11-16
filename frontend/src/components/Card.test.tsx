import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Card from './Card';

describe('Card Component', () => {
    describe('Basic Rendering', () => {
        it('renders children content', () => {
            render(<Card>Test content</Card>);
            expect(screen.getByText('Test content')).toBeInTheDocument();
        });

        it('applies default variant', () => {
            const { container } = render(<Card>Content</Card>);
            const card = container.firstChild as HTMLElement;
            expect(card).toHaveClass('rounded-md', 'border', 'border-border', 'bg-tertiary');
        });
    });

    describe('Card Variants', () => {
        it('applies default variant styles', () => {
            const { container } = render(<Card variant='default'>Content</Card>);
            const card = container.firstChild as HTMLElement;
            expect(card).toHaveClass('rounded-md', 'border-border', 'bg-tertiary');
        });

        it('applies warning variant styles', () => {
            const { container } = render(<Card variant='warning'>Content</Card>);
            const card = container.firstChild as HTMLElement;
            expect(card).toHaveClass('border-orange', 'bg-orange/20');
        });

        it('applies info variant styles', () => {
            const { container } = render(<Card variant='info'>Content</Card>);
            const card = container.firstChild as HTMLElement;
            expect(card).toHaveClass('border-border', 'bg-blue/20');
        });

        it('applies clickable variant styles', () => {
            const { container } = render(<Card variant='clickable'>Content</Card>);
            const card = container.firstChild as HTMLElement;
            expect(card).toHaveClass('cursor-pointer', 'hover:border-accent', 'active:scale-95');
        });
    });

    describe('Click Handling', () => {
        it('calls onClick when clicked', () => {
            const handleClick = vi.fn();
            render(<Card onClick={handleClick}>Clickable</Card>);
            
            fireEvent.click(screen.getByText('Clickable'));
            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it('does not have click handler when onClick is not provided', () => {
            const { container } = render(<Card>Not clickable</Card>);
            const card = container.firstChild as HTMLElement;
            expect(card.onclick).toBeNull();
        });
    });

    describe('Custom Styling', () => {
        it('applies custom className', () => {
            const { container } = render(<Card className='custom-style'>Content</Card>);
            const card = container.firstChild as HTMLElement;
            expect(card).toHaveClass('custom-style');
        });

        it('combines variant and custom classes', () => {
            const { container } = render(<Card variant='warning' className='extra-class'>Content</Card>);
            const card = container.firstChild as HTMLElement;
            expect(card).toHaveClass('border-orange', 'extra-class');
        });
    });

    describe('Test ID Support', () => {
        it('applies data-testid when provided', () => {
            render(<Card data-testid='my-card'>Content</Card>);
            expect(screen.getByTestId('my-card')).toBeInTheDocument();
        });

        it('works without data-testid', () => {
            const { container } = render(<Card>Content</Card>);
            expect(container.firstChild).not.toHaveAttribute('data-testid');
        });
    });
});
