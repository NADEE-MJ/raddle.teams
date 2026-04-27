import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Alert from './Alert';

describe('Alert Component', () => {
    describe('Basic Rendering', () => {
        it('renders children content', () => {
            render(<Alert>Test message</Alert>);
            expect(screen.getByText('Test message')).toBeInTheDocument();
        });

        it('applies default info variant', () => {
            const { container } = render(<Alert>Message</Alert>);
            const alert = container.firstChild as HTMLElement;
            expect(alert).toHaveClass('bg-blue-100');
        });
    });

    describe('Alert Variants', () => {
        it('applies error variant styles', () => {
            const { container } = render(<Alert variant='error'>Error</Alert>);
            const alert = container.firstChild as HTMLElement;
            expect(alert).toHaveClass('bg-red-100', 'border-red-300', 'text-red-700');
        });

        it('applies warning variant styles', () => {
            const { container } = render(<Alert variant='warning'>Warning</Alert>);
            const alert = container.firstChild as HTMLElement;
            expect(alert).toHaveClass('bg-orange-100', 'border-orange-300', 'text-orange-700');
        });

        it('applies info variant styles', () => {
            const { container } = render(<Alert variant='info'>Info</Alert>);
            const alert = container.firstChild as HTMLElement;
            expect(alert).toHaveClass('bg-blue-100', 'border-blue-300', 'text-blue-700');
        });

        it('applies success variant styles', () => {
            const { container } = render(<Alert variant='success'>Success</Alert>);
            const alert = container.firstChild as HTMLElement;
            expect(alert).toHaveClass('bg-green-100', 'border-green-300', 'text-green-700');
        });
    });

    describe('Custom Styling', () => {
        it('applies custom className', () => {
            const { container } = render(<Alert className='my-custom-class'>Message</Alert>);
            const alert = container.firstChild as HTMLElement;
            expect(alert).toHaveClass('my-custom-class');
        });

        it('applies base classes with custom className', () => {
            const { container } = render(<Alert className='extra-class'>Message</Alert>);
            const alert = container.firstChild as HTMLElement;
            expect(alert).toHaveClass('mb-6', 'p-2', 'rounded', 'text-sm', 'extra-class');
        });
    });

    describe('Test ID Support', () => {
        it('applies data-testid when provided', () => {
            render(<Alert data-testid='my-alert'>Message</Alert>);
            expect(screen.getByTestId('my-alert')).toBeInTheDocument();
        });

        it('renders without data-testid', () => {
            const { container } = render(<Alert>Message</Alert>);
            expect(container.firstChild).not.toHaveAttribute('data-testid');
        });
    });
});
