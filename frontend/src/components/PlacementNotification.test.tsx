import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { PlacementNotification, PlacementNotificationsContainer } from '@/components/PlacementNotification';

describe('PlacementNotification Component', () => {
    const mockOnDismiss = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        test('renders placement notification with correct message for own team', () => {
            render(
                <PlacementNotification placement={1} teamName='Alpha Team' isOwnTeam={true} onDismiss={mockOnDismiss} />
            );

            expect(screen.getByText(/Your team finished in 1st place!/i)).toBeInTheDocument();
        });

        test('renders placement notification with correct message for other team', () => {
            render(
                <PlacementNotification placement={2} teamName='Beta Team' isOwnTeam={false} onDismiss={mockOnDismiss} />
            );

            expect(screen.getByText(/Beta Team finished 2nd! Keep going!/i)).toBeInTheDocument();
        });

        test('displays congratulations for 1st place own team', () => {
            render(
                <PlacementNotification placement={1} teamName='Winners' isOwnTeam={true} onDismiss={mockOnDismiss} />
            );

            expect(screen.getByText('Congratulations! 🎉')).toBeInTheDocument();
        });

        test('does not show congratulations for non-first place', () => {
            render(<PlacementNotification placement={2} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.queryByText('Congratulations! 🎉')).not.toBeInTheDocument();
        });
    });

    describe('Medals and Emojis', () => {
        test('shows gold medal for 1st place', () => {
            render(<PlacementNotification placement={1} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.getByText('🥇')).toBeInTheDocument();
        });

        test('shows silver medal for 2nd place', () => {
            render(<PlacementNotification placement={2} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.getByText('🥈')).toBeInTheDocument();
        });

        test('shows bronze medal for 3rd place', () => {
            render(<PlacementNotification placement={3} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.getByText('🥉')).toBeInTheDocument();
        });

        test('shows target emoji for 4th+ place', () => {
            render(<PlacementNotification placement={4} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.getByText('🎯')).toBeInTheDocument();
        });
    });

    describe('Ordinal Suffixes', () => {
        test('displays correct ordinal suffix for 1st', () => {
            render(<PlacementNotification placement={1} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.getByText(/1st place/i)).toBeInTheDocument();
        });

        test('displays correct ordinal suffix for 2nd', () => {
            render(<PlacementNotification placement={2} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.getByText(/2nd/i)).toBeInTheDocument();
        });

        test('displays correct ordinal suffix for 3rd', () => {
            render(<PlacementNotification placement={3} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.getByText(/3rd/i)).toBeInTheDocument();
        });

        test('displays correct ordinal suffix for 4th', () => {
            render(<PlacementNotification placement={4} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.getByText(/4th/i)).toBeInTheDocument();
        });

        test('displays correct ordinal suffix for 11th (edge case)', () => {
            render(<PlacementNotification placement={11} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.getByText(/11th/i)).toBeInTheDocument();
        });

        test('displays correct ordinal suffix for 21st (edge case)', () => {
            render(<PlacementNotification placement={21} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.getByText(/21st/i)).toBeInTheDocument();
        });

        test('displays correct ordinal suffix for 22nd (edge case)', () => {
            render(<PlacementNotification placement={22} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.getByText(/22nd/i)).toBeInTheDocument();
        });
    });

    describe('Styling', () => {
        test('applies gold styling for 1st place', () => {
            const { container } = render(
                <PlacementNotification placement={1} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />
            );

            const notification = container.querySelector('.from-yellow-400');
            expect(notification).toBeInTheDocument();
        });

        test('applies silver styling for 2nd place', () => {
            const { container } = render(
                <PlacementNotification placement={2} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />
            );

            const notification = container.querySelector('.from-gray-300');
            expect(notification).toBeInTheDocument();
        });

        test('applies bronze styling for 3rd place', () => {
            const { container } = render(
                <PlacementNotification placement={3} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />
            );

            const notification = container.querySelector('.from-orange-400');
            expect(notification).toBeInTheDocument();
        });

        test('applies blue styling for other placements', () => {
            const { container } = render(
                <PlacementNotification placement={4} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />
            );

            const notification = container.querySelector('.from-blue-500');
            expect(notification).toBeInTheDocument();
        });
    });

    describe('Auto-dismiss', () => {
        test('auto-dismisses after 5 seconds', async () => {
            render(<PlacementNotification placement={1} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(mockOnDismiss).not.toHaveBeenCalled();

            vi.advanceTimersByTime(5000);

            await waitFor(() => {
                expect(mockOnDismiss).toHaveBeenCalledTimes(1);
            });
        });

        test('does not auto-dismiss before 5 seconds', () => {
            render(<PlacementNotification placement={1} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            vi.advanceTimersByTime(4999);

            expect(mockOnDismiss).not.toHaveBeenCalled();
        });
    });

    describe('Manual Dismiss', () => {
        test('calls onDismiss when close button clicked', async () => {
            const user = userEvent.setup({ delay: null });
            render(<PlacementNotification placement={1} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            const closeButton = screen.getByLabelText('Dismiss');
            await user.click(closeButton);

            expect(mockOnDismiss).toHaveBeenCalledTimes(1);
        });
    });

    describe('Accessibility', () => {
        test('has proper role and aria label', () => {
            render(<PlacementNotification placement={1} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.getByRole('alert')).toBeInTheDocument();
        });

        test('close button has aria-label', () => {
            render(<PlacementNotification placement={1} teamName='Team' isOwnTeam={true} onDismiss={mockOnDismiss} />);

            expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
        });
    });
});

describe('PlacementNotificationsContainer Component', () => {
    const mockOnDismiss = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders nothing when notifications array is empty', () => {
        const { container } = render(<PlacementNotificationsContainer notifications={[]} onDismiss={mockOnDismiss} />);

        expect(container.firstChild).toBeNull();
    });

    test('renders single notification', () => {
        const notifications = [
            {
                id: '1',
                placement: 1,
                teamName: 'Alpha Team',
                isOwnTeam: true,
            },
        ];

        render(<PlacementNotificationsContainer notifications={notifications} onDismiss={mockOnDismiss} />);

        expect(screen.getByText(/Alpha Team/i)).toBeInTheDocument();
    });

    test('renders multiple notifications', () => {
        const notifications = [
            {
                id: '1',
                placement: 1,
                teamName: 'Alpha Team',
                isOwnTeam: false,
            },
            {
                id: '2',
                placement: 2,
                teamName: 'Beta Team',
                isOwnTeam: true,
            },
            {
                id: '3',
                placement: 3,
                teamName: 'Gamma Team',
                isOwnTeam: false,
            },
        ];

        render(<PlacementNotificationsContainer notifications={notifications} onDismiss={mockOnDismiss} />);

        expect(screen.getByText(/Alpha Team/i)).toBeInTheDocument();
        expect(screen.getByText(/Your team finished in 2nd/i)).toBeInTheDocument();
        expect(screen.getByText(/Gamma Team/i)).toBeInTheDocument();
    });

    test('calls onDismiss with correct id when notification is dismissed', async () => {
        const user = userEvent.setup();
        const notifications = [
            {
                id: 'notif-1',
                placement: 1,
                teamName: 'Team A',
                isOwnTeam: true,
            },
            {
                id: 'notif-2',
                placement: 2,
                teamName: 'Team B',
                isOwnTeam: false,
            },
        ];

        render(<PlacementNotificationsContainer notifications={notifications} onDismiss={mockOnDismiss} />);

        const closeButtons = screen.getAllByLabelText('Dismiss');
        await user.click(closeButtons[0]);

        expect(mockOnDismiss).toHaveBeenCalledWith('notif-1');
    });

    test('stacks notifications vertically', () => {
        const notifications = [
            {
                id: '1',
                placement: 1,
                teamName: 'Team A',
                isOwnTeam: true,
            },
            {
                id: '2',
                placement: 2,
                teamName: 'Team B',
                isOwnTeam: false,
            },
        ];

        const { container } = render(
            <PlacementNotificationsContainer notifications={notifications} onDismiss={mockOnDismiss} />
        );

        const stackContainer = container.querySelector('.flex-col');
        expect(stackContainer).toBeInTheDocument();
    });

    test('is positioned at top center of screen', () => {
        const notifications = [
            {
                id: '1',
                placement: 1,
                teamName: 'Team A',
                isOwnTeam: true,
            },
        ];

        const { container } = render(
            <PlacementNotificationsContainer notifications={notifications} onDismiss={mockOnDismiss} />
        );

        const positionedContainer = container.querySelector('.fixed.top-4');
        expect(positionedContainer).toBeInTheDocument();
    });
});
