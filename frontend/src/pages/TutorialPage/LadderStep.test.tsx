import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { createRef } from 'react'
import LadderStep from '@/pages/TutorialPage/LadderStep'
import { LadderStep as LadderStepType } from '@/types/game'

describe('LadderStep Component', () => {
  const mockOnGuessChange = vi.fn()
  const inputRef = createRef<HTMLInputElement>()

  const mockLadderStep: LadderStepType = {
    word: 'SOUTH',
    clue: 'Cardinal direction',
    transform: 'S->M'
  }

  beforeEach(() => {
    mockOnGuessChange.mockClear()
  })

  describe('Active Step (Input Mode)', () => {
    test('renders input field when active', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={true}
          isStepRevealed={false}
          isActive={true}
        />
      )

      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByTestId('word-length-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('word-length-indicator')).toHaveTextContent('(5)')
    })

    test('shows hint button when active', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={true}
          isStepRevealed={false}
          isActive={true}
        />
      )

      expect(screen.getByTestId('hint-button')).toBeInTheDocument()
      expect(screen.getByTestId('hint-button')).toHaveTextContent('💡')
    })

    test('calls onGuessChange when typing', async () => {
      const user = userEvent.setup()

      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={true}
          isStepRevealed={false}
          isActive={true}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'TEST')

      // Should call onGuessChange for each character
      expect(mockOnGuessChange).toHaveBeenCalledWith('T')
      expect(mockOnGuessChange).toHaveBeenCalledWith('TE')
      expect(mockOnGuessChange).toHaveBeenCalledWith('TES')
      expect(mockOnGuessChange).toHaveBeenCalledWith('TEST')
    })

    test('converts input to uppercase', async () => {
      const user = userEvent.setup()

      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={true}
          isStepRevealed={false}
          isActive={true}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'test')

      expect(input).toHaveValue('TEST')
      expect(mockOnGuessChange).toHaveBeenLastCalledWith('TEST')
    })

    test('trims whitespace from input', async () => {
      const user = userEvent.setup()

      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={true}
          isStepRevealed={false}
          isActive={true}
        />
      )

      const input = screen.getByRole('textbox')
      await user.type(input, ' TEST ')

      expect(mockOnGuessChange).toHaveBeenLastCalledWith('TEST')
    })

    test('shows transform when step has transform', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={true}
          isStepRevealed={false}
          isActive={true}
        />
      )

      // Transform should be present (empty span for active state)
      expect(document.querySelector('span')).toBeInTheDocument()
    })

    test('shows empty transform when step has null transform', () => {
      const stepWithoutTransform = { ...mockLadderStep, transform: null }

      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={stepWithoutTransform}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={true}
          isStepRevealed={false}
          isActive={true}
        />
      )

      // Should still show empty transform span
      expect(document.querySelector('span')).toBeInTheDocument()
    })
  })

  describe('Revealed Step (Display Mode)', () => {
    test('displays word when revealed', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={false}
          isStepRevealed={true}
          isActive={false}
        />
      )

      expect(screen.getByTestId('ladder-word-south')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-south')).toHaveTextContent('SOUTH')
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    test('shows transform when revealed and has transform', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={false}
          isStepRevealed={true}
          isActive={false}
        />
      )

      expect(screen.getByText('S->M')).toBeInTheDocument()
    })

    test('does not show transform when not fully revealed', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={true}
          isCurrentAnswer={false}
          isStepRevealed={false}
          isActive={false}
        />
      )

      expect(screen.queryByText('S->M')).not.toBeInTheDocument()
    })
  })

  describe('Unrevealed Step (Hidden Mode)', () => {
    test('shows placeholder when unrevealed', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={false}
          isStepRevealed={false}
          isActive={false}
        />
      )

      expect(screen.getByTestId('unrevealed-step-input')).toBeInTheDocument()
      expect(screen.getByTestId('unrevealed-step-input')).toBeDisabled()
    })

    test('shows correct number of placeholder characters', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={false}
          isStepRevealed={false}
          isActive={false}
        />
      )

      const input = screen.getByTestId('unrevealed-step-input')
      expect(input).toHaveAttribute('placeholder', '◼️◼️◼️◼️◼️ (5)')
    })
  })

  describe('Question Step', () => {
    test('displays word when in question state', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={true}
          isCurrentAnswer={false}
          isStepRevealed={false}
          isActive={false}
        />
      )

      expect(screen.getByTestId('ladder-word-south')).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('Answer Step', () => {
    test('displays word when in answer state', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={true}
          isStepRevealed={false}
          isActive={false}
        />
      )

      expect(screen.getByTestId('ladder-word-south')).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('Styling Based on Status', () => {
    test('applies correct background color for question status', () => {
      const { container } = render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={true}
          isCurrentAnswer={false}
          isStepRevealed={false}
          isActive={false}
        />
      )

      expect(container.firstChild).toHaveClass('bg-green/50')
    })

    test('applies correct background color for answer status', () => {
      const { container } = render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={true}
          isStepRevealed={false}
          isActive={false}
        />
      )

      expect(container.firstChild).toHaveClass('bg-yellow/80')
    })

    test('applies correct background color for revealed status', () => {
      const { container } = render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={false}
          isStepRevealed={true}
          isActive={false}
        />
      )

      expect(container.firstChild).toHaveClass('bg-grey')
    })

    test('applies default background color for unrevealed status', () => {
      const { container } = render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={false}
          isStepRevealed={false}
          isActive={false}
        />
      )

      expect(container.firstChild).toHaveClass('bg-secondary')
    })
  })

  describe('Input Attributes', () => {
    test('sets correct input attributes', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          stepId={1}
          ladderStep={mockLadderStep}
          ladderHeight={5}
          isCurrentQuestion={false}
          isCurrentAnswer={true}
          isStepRevealed={false}
          isActive={true}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('autoComplete', 'off')
      expect(input).toHaveAttribute('autoCorrect', 'off')
      expect(input).toHaveAttribute('autoCapitalize', 'off')
      expect(input).toHaveAttribute('spellCheck', 'false')
      expect(input).toHaveAttribute('data-testid', 'active-step-input')
    })
  })
})