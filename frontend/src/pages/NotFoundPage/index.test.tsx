import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NotFoundPage from '@/pages/NotFoundPage/index';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useNavigate: () => mockNavigate,
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;

describe('NotFoundPage Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders 404 page content', () => {
            render(
                <TestWrapper>
                    <NotFoundPage />
                </TestWrapper>
            );

            expect(screen.getByText('Page Not Found')).toBeInTheDocument();
            expect(screen.getByText("The page you're looking for doesn't exist.")).toBeInTheDocument();
            expect(screen.getByTestId('not-found-back-to-home-link')).toBeInTheDocument();
            expect(screen.getByText('Back to Home')).toBeInTheDocument();
        });

        test('applies correct styling classes', () => {
            render(
                <TestWrapper>
                    <NotFoundPage />
                </TestWrapper>
            );

            const container = screen.getByText('Page Not Found').closest('div');
            expect(container).toHaveClass('mb-2', 'text-center');

            const title = screen.getByText('Page Not Found');
            expect(title).toHaveClass('text-tx-primary', 'mb-6', 'text-3xl', 'font-bold');

            const description = screen.getByText("The page you're looking for doesn't exist.");
            expect(description).toHaveClass('text-tx-secondary', 'mb-6', 'text-lg');

            const button = screen.getByTestId('not-found-back-to-home-link');
            expect(button).toHaveClass('px-6', 'py-3');
        });
    });

    describe('Navigation', () => {
        test('navigates to home when back to home button is clicked', async () => {
            const user = userEvent.setup();
            render(
                <TestWrapper>
                    <NotFoundPage />
                </TestWrapper>
            );

            const backToHomeButton = screen.getByTestId('not-found-back-to-home-link');
            await user.click(backToHomeButton);

            expect(mockNavigate).toHaveBeenCalledWith('/');
            expect(mockNavigate).toHaveBeenCalledTimes(1);
        });
    });

    describe('Accessibility', () => {
        test('has proper heading structure', () => {
            render(
                <TestWrapper>
                    <NotFoundPage />
                </TestWrapper>
            );

            const heading = screen.getByRole('heading', { level: 1 });
            expect(heading).toHaveTextContent('Page Not Found');
        });

        test('back to home button is properly labeled', () => {
            render(
                <TestWrapper>
                    <NotFoundPage />
                </TestWrapper>
            );

            const button = screen.getByRole('button', { name: 'Back to Home' });
            expect(button).toBeInTheDocument();
        });
    });

    describe('Content', () => {
        test('displays appropriate 404 message', () => {
            render(
                <TestWrapper>
                    <NotFoundPage />
                </TestWrapper>
            );

            expect(screen.getByText('Page Not Found')).toBeInTheDocument();
            expect(screen.getByText("The page you're looking for doesn't exist.")).toBeInTheDocument();
        });

        test('provides clear call-to-action', () => {
            render(
                <TestWrapper>
                    <NotFoundPage />
                </TestWrapper>
            );

            const backButton = screen.getByTestId('not-found-back-to-home-link');
            expect(backButton).toBeInTheDocument();
            expect(backButton).toHaveTextContent('Back to Home');
        });
    });
});
