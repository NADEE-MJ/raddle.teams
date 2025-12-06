import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlacementNotification from './PlacementNotification';

describe('PlacementNotification', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders first place notification with gold medal', () => {
        const onDismiss = vi.fn();
        render(<PlacementNotification placement={1} teamName='Team Alpha' isOwnTeam={false} onDismiss={onDismiss} />);

        expect(screen.getByText(/Team Alpha/i)).toBeInTheDocument();
        expect(screen.getByText(/🥇/)).toBeInTheDocument();
        expect(screen.getByText(/1st place/i)).toBeInTheDocument();
    });

    it('renders second place notification with silver medal', () => {
        const onDismiss = vi.fn();
        render(<PlacementNotification placement={2} teamName='Team Beta' isOwnTeam={false} onDismiss={onDismiss} />);

        expect(screen.getByText(/Team Beta/i)).toBeInTheDocument();
        expect(screen.getByText(/🥈/)).toBeInTheDocument();
        expect(screen.getByText(/2nd place/i)).toBeInTheDocument();
    });

    it('renders third place notification with bronze medal', () => {
        const onDismiss = vi.fn();
        render(<PlacementNotification placement={3} teamName='Team Gamma' isOwnTeam={false} onDismiss={onDismiss} />);

        expect(screen.getByText(/Team Gamma/i)).toBeInTheDocument();
        expect(screen.getByText(/🥉/)).toBeInTheDocument();
        expect(screen.getByText(/3rd place/i)).toBeInTheDocument();
    });

    it('renders 4th+ place notification with checkmark', () => {
        const onDismiss = vi.fn();
        render(<PlacementNotification placement={4} teamName='Team Delta' isOwnTeam={false} onDismiss={onDismiss} />);

        expect(screen.getByText(/Team Delta/i)).toBeInTheDocument();
        expect(screen.getByText(/✅/)).toBeInTheDocument();
        expect(screen.getByText(/4th place/i)).toBeInTheDocument();
    });

    it('shows different message for own team', () => {
        const onDismiss = vi.fn();
        render(<PlacementNotification placement={1} teamName='My Team' isOwnTeam={true} onDismiss={onDismiss} />);

        expect(screen.getByText(/Your team/i)).toBeInTheDocument();
        expect(screen.getByText(/1st place/i)).toBeInTheDocument();
    });

    it('calls onDismiss when close button clicked', async () => {
        const user = userEvent.setup({ delay: null });
        const onDismiss = vi.fn();

        render(<PlacementNotification placement={1} teamName='Team Alpha' isOwnTeam={false} onDismiss={onDismiss} />);

        const closeButton = screen.getByRole('button', { name: /×/i });
        await user.click(closeButton);

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('auto-dismisses after 5 seconds', async () => {
        const onDismiss = vi.fn();

        render(<PlacementNotification placement={1} teamName='Team Alpha' isOwnTeam={false} onDismiss={onDismiss} />);

        expect(onDismiss).not.toHaveBeenCalled();

        // Fast-forward 5 seconds
        vi.advanceTimersByTime(5000);

        await waitFor(() => {
            expect(onDismiss).toHaveBeenCalledTimes(1);
        });
    });

    it('applies correct color classes for first place', () => {
        const onDismiss = vi.fn();
        const { container } = render(
            <PlacementNotification placement={1} teamName='Team Alpha' isOwnTeam={false} onDismiss={onDismiss} />
        );

        const notification = container.querySelector('.bg-yellow-500\\/10');
        expect(notification).toBeInTheDocument();
    });

    it('applies correct color classes for second place', () => {
        const onDismiss = vi.fn();
        const { container } = render(
            <PlacementNotification placement={2} teamName='Team Beta' isOwnTeam={false} onDismiss={onDismiss} />
        );

        const notification = container.querySelector('.bg-gray-400\\/10');
        expect(notification).toBeInTheDocument();
    });

    it('applies correct color classes for third place', () => {
        const onDismiss = vi.fn();
        const { container } = render(
            <PlacementNotification placement={3} teamName='Team Gamma' isOwnTeam={false} onDismiss={onDismiss} />
        );

        const notification = container.querySelector('.bg-orange-600\\/10');
        expect(notification).toBeInTheDocument();
    });

    it('handles placement suffix correctly for 11th, 12th, 13th', () => {
        const onDismiss = vi.fn();

        const { rerender } = render(
            <PlacementNotification placement={11} teamName='Team' isOwnTeam={false} onDismiss={onDismiss} />
        );
        expect(screen.getByText(/11th place/i)).toBeInTheDocument();

        rerender(<PlacementNotification placement={12} teamName='Team' isOwnTeam={false} onDismiss={onDismiss} />);
        expect(screen.getByText(/12th place/i)).toBeInTheDocument();

        rerender(<PlacementNotification placement={13} teamName='Team' isOwnTeam={false} onDismiss={onDismiss} />);
        expect(screen.getByText(/13th place/i)).toBeInTheDocument();
    });
});
