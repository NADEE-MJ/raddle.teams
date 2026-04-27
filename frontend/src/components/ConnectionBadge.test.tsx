import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ConnectionBadge from './ConnectionBadge';

describe('ConnectionBadge Component', () => {
    describe('Basic Rendering', () => {
        it('renders with connected state', () => {
            render(<ConnectionBadge connectionStatus='connected' />);
            expect(screen.getByText('Connected')).toBeInTheDocument();
        });

        it('renders with disconnected state', () => {
            render(<ConnectionBadge connectionStatus='reconnecting' />);
            expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
        });
    });

    describe('Custom Text', () => {
        it('displays custom connected text', () => {
            render(<ConnectionBadge connectionStatus='connected' connectedText='Online' />);
            expect(screen.getByText('Online')).toBeInTheDocument();
        });

        it('displays custom disconnected text', () => {
            render(<ConnectionBadge connectionStatus='reconnecting' reconnectingText='Offline' />);
            expect(screen.getByText('Offline')).toBeInTheDocument();
        });
    });

    describe('Visual Styling', () => {
        it('applies connected styles when connected', () => {
            const { container } = render(<ConnectionBadge connectionStatus='connected' />);
            const badge = container.querySelector('.border-green-500\\/40');
            expect(badge).toBeInTheDocument();
        });

        it('applies disconnected styles when not connected', () => {
            const { container } = render(<ConnectionBadge connectionStatus='disconnected' />);
            const badge = container.querySelector('.border-gray-500\\/40');
            expect(badge).toBeInTheDocument();
        });

        it('shows pulsing indicator when connected', () => {
            const { container } = render(<ConnectionBadge connectionStatus='connected' />);
            const indicator = container.querySelector('.animate-pulse');
            expect(indicator).toBeInTheDocument();
        });

        it('shows static indicator when disconnected', () => {
            const { container } = render(<ConnectionBadge connectionStatus='disconnected' />);
            const indicator = container.querySelector('.bg-gray-400');
            expect(indicator).toBeInTheDocument();
            expect(indicator).not.toHaveClass('animate-pulse');
        });
    });

    describe('Custom Styling', () => {
        it('applies custom className', () => {
            const { container } = render(<ConnectionBadge connectionStatus='connected' className='custom-class' />);
            const badge = container.firstChild as HTMLElement;
            expect(badge).toHaveClass('custom-class');
        });
    });

    describe('State Transitions', () => {
        it('updates text when connection state changes', () => {
            const { rerender } = render(<ConnectionBadge connectionStatus='connected' />);
            expect(screen.getByText('Connected')).toBeInTheDocument();

            rerender(<ConnectionBadge connectionStatus='reconnecting' />);
            expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
        });
    });
});
