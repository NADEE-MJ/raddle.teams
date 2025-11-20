import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ErrorMessage from './ErrorMessage';

describe('ErrorMessage Component', () => {
    describe('Basic Rendering', () => {
        it('renders error message', () => {
            render(<ErrorMessage message='Test error message' />);
            expect(screen.getByText('Test error message')).toBeInTheDocument();
        });

        it('does not render when message is null', () => {
            const { container } = render(<ErrorMessage message={null} />);
            expect(container.firstChild).toBeNull();
        });

        it('does not render when message is undefined', () => {
            const { container } = render(<ErrorMessage message={undefined} />);
            expect(container.firstChild).toBeNull();
        });

        it('does not render when message is empty string', () => {
            const { container } = render(<ErrorMessage message='' />);
            expect(container.firstChild).toBeNull();
        });
    });

    describe('Visual Styling', () => {
        it('applies error styling', () => {
            const { container } = render(<ErrorMessage message='Error' />);
            const errorDiv = container.firstChild as HTMLElement;
            expect(errorDiv).toHaveClass('border-red', 'bg-red/20', 'text-red');
        });
    });

    describe('Custom Styling', () => {
        it('applies custom className', () => {
            const { container } = render(<ErrorMessage message='Error' className='custom-class' />);
            const errorDiv = container.firstChild as HTMLElement;
            expect(errorDiv).toHaveClass('custom-class');
        });
    });

    describe('Test ID Support', () => {
        it('applies data-testid when provided', () => {
            render(<ErrorMessage message='Error' data-testid='error-msg' />);
            expect(screen.getByTestId('error-msg')).toBeInTheDocument();
        });
    });
});
