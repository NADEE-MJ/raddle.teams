import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
    describe('Basic Rendering', () => {
        it('renders loading text', () => {
            render(<LoadingSpinner />);
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('renders spinner element', () => {
            const { container } = render(<LoadingSpinner />);
            const spinner = container.querySelector('.animate-spin');
            expect(spinner).toBeInTheDocument();
        });
    });

    describe('Visual Styling', () => {
        it('has proper spinner styling', () => {
            const { container } = render(<LoadingSpinner />);
            const spinner = container.querySelector('.animate-spin');
            expect(spinner).toHaveClass('rounded-full', 'border-b-2', 'border-orange');
        });

        it('is centered in container', () => {
            const { container } = render(<LoadingSpinner />);
            const wrapper = container.firstChild as HTMLElement;
            expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center');
        });
    });
});
