import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusIndicator from './StatusIndicator';

describe('StatusIndicator Component', () => {
    describe('Basic Rendering', () => {
        it('renders with connected state', () => {
            render(<StatusIndicator isConnected={true} />);
            expect(screen.getByText('Connected')).toBeInTheDocument();
        });

        it('renders with disconnected state', () => {
            render(<StatusIndicator isConnected={false} />);
            expect(screen.getByText('Disconnected')).toBeInTheDocument();
        });
    });

    describe('Custom Text', () => {
        it('displays custom connected text', () => {
            render(<StatusIndicator isConnected={true} connectedText='Online' />);
            expect(screen.getByText('Online')).toBeInTheDocument();
        });

        it('displays custom disconnected text', () => {
            render(<StatusIndicator isConnected={false} disconnectedText='Offline' />);
            expect(screen.getByText('Offline')).toBeInTheDocument();
        });
    });

    describe('Visual Styling', () => {
        it('applies green color when connected', () => {
            const { container } = render(<StatusIndicator isConnected={true} />);
            const indicator = container.querySelector('.bg-green-500');
            expect(indicator).toBeInTheDocument();
            const text = container.querySelector('.text-green-600');
            expect(text).toBeInTheDocument();
        });

        it('applies red color when disconnected', () => {
            const { container } = render(<StatusIndicator isConnected={false} />);
            const indicator = container.querySelector('.bg-red-500');
            expect(indicator).toBeInTheDocument();
            const text = container.querySelector('.text-red-600');
            expect(text).toBeInTheDocument();
        });
    });

    describe('Custom Styling', () => {
        it('applies custom className', () => {
            const { container } = render(<StatusIndicator isConnected={true} className='custom-class' />);
            const wrapper = container.firstChild as HTMLElement;
            expect(wrapper).toHaveClass('custom-class');
        });
    });
});
