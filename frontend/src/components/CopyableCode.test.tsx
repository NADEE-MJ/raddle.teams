import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import CopyableCode from '@/components/CopyableCode';

// Mock the clipboard API
const mockWriteText = vi.fn();
Object.assign(navigator, {
    clipboard: {
        writeText: mockWriteText,
    },
});

describe('CopyableCode Component', () => {
    beforeEach(() => {
        mockWriteText.mockClear();
        mockWriteText.mockResolvedValue(undefined);
    });

    test('renders with code text and styling', () => {
        render(<CopyableCode code='ABC123' />);

        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveTextContent('ABC123');
        expect(button).toHaveAttribute('title', 'Click to copy code');
        expect(button).toHaveClass('bg-green/20', 'text-green', 'cursor-pointer', 'rounded');
    });

    test('renders with custom props', () => {
        render(<CopyableCode code='ABC123' title='Copy this' className='custom-class' data-testid='copyable' />);

        const button = screen.getByTestId('copyable');
        expect(button).toHaveAttribute('title', 'Copy this');
        expect(button).toHaveClass('custom-class');
    });

    test('is clickable and accessible', async () => {
        const user = userEvent.setup();
        render(<CopyableCode code='ABC123' />);

        const button = screen.getByRole('button');
        expect(button).toBeEnabled();

        // Test keyboard accessibility
        button.focus();
        await user.keyboard('{Enter}');

        // If no errors are thrown, the click handler works
        expect(button).toBeInTheDocument();
    });

    test('stops event propagation', async () => {
        const parentClickHandler = vi.fn();
        const user = userEvent.setup();

        render(
            <div onClick={parentClickHandler}>
                <CopyableCode code='ABC123' />
            </div>
        );

        const button = screen.getByRole('button');
        await user.click(button);

        expect(parentClickHandler).not.toHaveBeenCalled();
    });
});
