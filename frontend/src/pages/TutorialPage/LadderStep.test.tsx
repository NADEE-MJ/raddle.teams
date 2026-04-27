import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createRef } from 'react';
import LadderStep from '@/pages/TutorialPage/LadderStep';
import { LadderStep as LadderStepType } from '@/types/game';

describe('LadderStep Component', () => {
    const mockOnGuessChange = vi.fn();
    const inputRef = createRef<HTMLInputElement>();

    const mockLadderStep: LadderStepType = {
        word: 'SOUTH',
        clue: 'Cardinal direction',
        transform: 'S->M',
    };

    beforeEach(() => {
        mockOnGuessChange.mockClear();
    });

    describe('Active Step (Input Mode)', () => {
        test('renders input field when active', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            expect(screen.getByRole('textbox')).toBeInTheDocument();
            expect(screen.getByTestId('word-length-indicator')).toBeInTheDocument();
            expect(screen.getByTestId('word-length-indicator')).toHaveTextContent('(5)');
        });

        test('shows hint button when active and onHintClick is provided', () => {
            const mockOnHintClick = vi.fn();

            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                    onHintClick={mockOnHintClick}
                />
            );

            expect(screen.getByTestId('hint-button')).toBeInTheDocument();
            expect(screen.getByTestId('hint-button')).toHaveTextContent('💡');
        });

        test('does not show hint button when onHintClick is not provided', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            expect(screen.queryByTestId('hint-button')).not.toBeInTheDocument();
        });

        test('calls onHintClick when hint button is clicked', async () => {
            const user = userEvent.setup();
            const mockOnHintClick = vi.fn();

            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                    onHintClick={mockOnHintClick}
                />
            );

            const hintButton = screen.getByTestId('hint-button');
            await user.click(hintButton);

            expect(mockOnHintClick).toHaveBeenCalledTimes(1);
        });

        test('shows eye icon for second hint', () => {
            const mockOnHintClick = vi.fn();

            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                    onHintClick={mockOnHintClick}
                    secondHint={true}
                />
            );

            expect(screen.getByTestId('hint-button')).toHaveTextContent('👁️');
        });

        test('shows light bulb icon for first hint', () => {
            const mockOnHintClick = vi.fn();

            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                    onHintClick={mockOnHintClick}
                    secondHint={false}
                />
            );

            expect(screen.getByTestId('hint-button')).toHaveTextContent('💡');
        });

        test('hint button has correct styling and position', () => {
            const mockOnHintClick = vi.fn();

            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                    onHintClick={mockOnHintClick}
                />
            );

            const hintButton = screen.getByTestId('hint-button');
            expect(hintButton).toHaveClass('absolute', 'top-1/2', 'right-0', 'flex', 'h-8', 'w-8');
        });

        test('calls onGuessChange when typing', async () => {
            const user = userEvent.setup();

            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, 'TEST');

            // Should call onGuessChange for each character
            expect(mockOnGuessChange).toHaveBeenCalledWith('T');
            expect(mockOnGuessChange).toHaveBeenCalledWith('TE');
            expect(mockOnGuessChange).toHaveBeenCalledWith('TES');
            expect(mockOnGuessChange).toHaveBeenCalledWith('TEST');
        });

        test('converts input to uppercase', async () => {
            const user = userEvent.setup();

            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, 'test');

            expect(input).toHaveValue('TEST');
            expect(mockOnGuessChange).toHaveBeenLastCalledWith('TEST');
        });

        test('trims whitespace from input', async () => {
            const user = userEvent.setup();

            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            const input = screen.getByRole('textbox');
            await user.type(input, ' TEST ');

            expect(mockOnGuessChange).toHaveBeenLastCalledWith('TEST');
        });

        test('shows empty transform when step has transform', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            // Transform should be present (empty span for active state)
            expect(document.querySelector('span')).toBeInTheDocument();
        });

        test('shows empty transform when step has null transform', () => {
            const stepWithoutTransform = { ...mockLadderStep, transform: null };

            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={stepWithoutTransform.word}
                    transform={stepWithoutTransform.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            // Should still show empty transform span
            expect(document.querySelector('span')).toBeInTheDocument();
        });

        test('shows hyphen in length indicator for hyphenated words', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word='X-RAY'
                    transform={null}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={false}
                />
            );

            expect(screen.getByTestId('word-length-indicator')).toHaveTextContent('(1-3)');
        });

        test('shows hyphens in length indicator for multi-hyphenated words', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word='MOBY-DICK'
                    transform={null}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={false}
                />
            );

            expect(screen.getByTestId('word-length-indicator')).toHaveTextContent('(4-4)');
        });
    });

    describe('Revealed Step (Display Mode)', () => {
        test('displays word when revealed', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={true}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            expect(screen.getByTestId('ladder-word-south')).toBeInTheDocument();
            expect(screen.getByTestId('ladder-word-south')).toHaveTextContent('SOUTH');
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });

        test('shows transform when revealed and shouldShowTransform is true', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={true}
                    isActive={false}
                    shouldShowTransform={true}
                    shouldRenderTransform={true}
                />
            );

            expect(screen.getByText('S->M')).toBeInTheDocument();
        });

        test('does not show transform when shouldShowTransform is false', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={true}
                    isCurrentAnswer={false}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            expect(screen.queryByText('S->M')).not.toBeInTheDocument();
        });
    });

    describe('Unrevealed Step (Hidden Mode)', () => {
        test('shows placeholder when unrevealed', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            expect(screen.getByTestId('unrevealed-step-input')).toBeInTheDocument();
            expect(screen.getByTestId('unrevealed-step-input')).toBeDisabled();
        });

        test('shows correct number of placeholder characters', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            const input = screen.getByTestId('unrevealed-step-input');
            expect(input).toHaveAttribute('placeholder', '◻️◻️◻️◻️◻️ (5)');
        });

        test('shows hyphen in placeholder for hyphenated words', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word='X-RAY'
                    transform={null}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={false}
                />
            );

            const input = screen.getByTestId('unrevealed-step-input');
            expect(input).toHaveAttribute('placeholder', '◻️-◻️◻️◻️ (1-3)');
        });

        test('shows hyphens in placeholder for multi-hyphenated words', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word='MOBY-DICK'
                    transform={null}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={false}
                />
            );

            const input = screen.getByTestId('unrevealed-step-input');
            expect(input).toHaveAttribute('placeholder', '◻️◻️◻️◻️-◻️◻️◻️◻️ (4-4)');
        });

        test('shows space and hyphen in placeholder for words with both', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word='MERRY-GO-ROUND'
                    transform={null}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={false}
                />
            );

            const input = screen.getByTestId('unrevealed-step-input');
            expect(input).toHaveAttribute('placeholder', '◻️◻️◻️◻️◻️-◻️◻️-◻️◻️◻️◻️◻️ (5-2-5)');
        });
    });

    describe('Question Step', () => {
        test('displays word when in question state', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={true}
                    isCurrentAnswer={false}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            expect(screen.getByTestId('ladder-word-south')).toBeInTheDocument();
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });
    });

    describe('Answer Step', () => {
        test('displays word when in answer state', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            expect(screen.getByTestId('ladder-word-south')).toBeInTheDocument();
            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });
    });

    describe('Styling Based on Status', () => {
        test('applies correct background color for question status', () => {
            const { container } = render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={true}
                    isCurrentAnswer={false}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            expect(container.firstChild).toHaveClass('bg-question-step');
        });

        test('applies correct background color for answer status', () => {
            const { container } = render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            expect(container.firstChild).toHaveClass('bg-answer-step');
        });

        test('applies correct background color for revealed status', () => {
            const { container } = render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={true}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            expect(container.firstChild).toHaveClass('bg-revealed-step');
        });

        test('applies default background color for unrevealed status', () => {
            const { container } = render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            expect(container.firstChild).toHaveClass('bg-hidden-step');
        });
    });

    describe('Transform rendering logic', () => {
        test('does not show transform when revealed with null transform', () => {
            const stepWithNullTransform = { ...mockLadderStep, transform: null };

            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={stepWithNullTransform.word}
                    transform={stepWithNullTransform.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={true}
                    isActive={false}
                    shouldShowTransform={true}
                    shouldRenderTransform={false}
                />
            );

            // Should NOT show transform span when shouldRenderTransform is false
            const transformSpan = document.querySelector('span');
            expect(transformSpan).not.toBeInTheDocument();
        });

        test('shows actual transform when revealed with transform and shouldShowTransform is true', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={true}
                    isActive={false}
                    shouldShowTransform={true}
                    shouldRenderTransform={true}
                />
            );

            expect(screen.getByText('S->M')).toBeInTheDocument();
        });

        test('shows empty transform for unrevealed step when step has transform', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            // Should have transform span even when unrevealed if step has transform
            const transformSpan = document.querySelector('span');
            expect(transformSpan).toBeInTheDocument();
        });

        test('does not show transform for unrevealed step when step has null transform', () => {
            const stepWithNullTransform = { ...mockLadderStep, transform: null };

            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={stepWithNullTransform.word}
                    transform={stepWithNullTransform.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={false}
                />
            );

            // Should not have transform span when shouldRenderTransform is false
            const transformSpan = document.querySelector('span');
            expect(transformSpan).not.toBeInTheDocument();
        });
    });

    describe('Word length handling', () => {
        test('generates correct placeholder for different word lengths', () => {
            const shortWordStep = { ...mockLadderStep, word: 'CAT' };

            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={shortWordStep.word}
                    transform={shortWordStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            const input = screen.getByTestId('unrevealed-step-input');
            expect(input).toHaveAttribute('placeholder', '◻️◻️◻️ (3)');
        });

        test('shows correct word length indicator for active step', () => {
            const longWordStep = { ...mockLadderStep, word: 'ELEPHANT' };

            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={longWordStep.word}
                    transform={longWordStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            expect(screen.getByTestId('word-length-indicator')).toHaveTextContent('(8)');
        });
    });

    describe('Input Attributes', () => {
        test('sets correct input attributes', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={true}
                    isStepRevealed={false}
                    isActive={true}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            const input = screen.getByRole('textbox');
            expect(input).toHaveAttribute('autoComplete', 'off');
            expect(input).toHaveAttribute('autoCorrect', 'off');
            expect(input).toHaveAttribute('autoCapitalize', 'off');
            expect(input).toHaveAttribute('spellCheck', 'false');
            expect(input).toHaveAttribute('data-testid', 'active-step-input');
        });

        test('sets correct attributes for unrevealed input', () => {
            render(
                <LadderStep
                    onGuessChange={mockOnGuessChange}
                    inputRef={inputRef}
                    word={mockLadderStep.word}
                    transform={mockLadderStep.transform}
                    isCurrentQuestion={false}
                    isCurrentAnswer={false}
                    isStepRevealed={false}
                    isActive={false}
                    shouldShowTransform={false}
                    shouldRenderTransform={true}
                />
            );

            const input = screen.getByTestId('unrevealed-step-input');
            expect(input).toHaveAttribute('autoComplete', 'off');
            expect(input).toHaveAttribute('autoCorrect', 'off');
            expect(input).toHaveAttribute('autoCapitalize', 'off');
            expect(input).toHaveAttribute('spellCheck', 'false');
            expect(input).toBeDisabled();
        });
    });
});
