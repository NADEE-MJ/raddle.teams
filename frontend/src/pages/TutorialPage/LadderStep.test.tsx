import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { createRef } from 'react'
import LadderStep from '@/pages/TutorialPage/LadderStep'
import { GameStateStep, LadderStep as LadderStepType } from '@/types/game'

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
    const activeGameStateStep: GameStateStep = {
      id: 1,
      active: true,
      status: 'answer',
      isRevealed: false,
      isClueShown: false,
      reveals: 0
    }

    test('renders input field when active', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={activeGameStateStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByText('(5)')).toBeInTheDocument() // Word length indicator
    })

    test('shows hint button when active', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={activeGameStateStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      expect(screen.getByText('💡')).toBeInTheDocument()
    })

    test('calls onGuessChange when typing', async () => {
      const user = userEvent.setup()
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={activeGameStateStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
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
          gameStateStep={activeGameStateStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
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
          gameStateStep={activeGameStateStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
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
          gameStateStep={activeGameStateStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      expect(screen.getByText('S->M')).toBeInTheDocument()
    })

    test('shows empty transform when step has null transform', () => {
      const stepWithoutTransform = { ...mockLadderStep, transform: null }
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={activeGameStateStep}
          ladderStep={stepWithoutTransform}
          ladderHeight={5}
        />
      )

      // Should render empty transform placeholder
      expect(screen.getByText('')).toBeInTheDocument()
    })
  })

  describe('Revealed Step (Display Mode)', () => {
    const revealedGameStateStep: GameStateStep = {
      id: 1,
      active: false,
      status: 'revealed',
      isRevealed: true,
      isClueShown: false,
      reveals: 0
    }

    test('displays word when revealed', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={revealedGameStateStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      expect(screen.getByText('SOUTH')).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    test('shows transform when revealed and has transform', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={revealedGameStateStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      expect(screen.getByText('SOUTH')).toBeInTheDocument()
      expect(screen.getByText('S->M')).toBeInTheDocument()
    })

    test('does not show transform when not fully revealed', () => {
      const partiallyRevealedStep = { ...revealedGameStateStep, isRevealed: false }
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={partiallyRevealedStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      expect(screen.getByText('SOUTH')).toBeInTheDocument()
      expect(screen.queryByText('S->M')).not.toBeInTheDocument()
    })
  })

  describe('Unrevealed Step (Hidden Mode)', () => {
    const unrevealedGameStateStep: GameStateStep = {
      id: 1,
      active: false,
      status: 'unrevealed',
      isRevealed: false,
      isClueShown: false,
      reveals: 0
    }

    test('shows placeholder when unrevealed', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={unrevealedGameStateStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      // Should show blocked squares for hidden word
      const input = screen.getByDisplayValue('◼️◼️◼️◼️◼️ (5)')
      expect(input).toBeDisabled()
    })

    test('shows correct number of placeholder characters', () => {
      const longWordStep = { ...mockLadderStep, word: 'TESTING' }
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={unrevealedGameStateStep}
          ladderStep={longWordStep}
          ladderHeight={7}
        />
      )

      const input = screen.getByDisplayValue('◼️◼️◼️◼️◼️◼️◼️ (7)')
      expect(input).toBeDisabled()
    })
  })

  describe('Question Step', () => {
    const questionGameStateStep: GameStateStep = {
      id: 1,
      active: false,
      status: 'question',
      isRevealed: false,
      isClueShown: false,
      reveals: 0
    }

    test('displays word when in question state', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={questionGameStateStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      expect(screen.getByText('SOUTH')).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('Answer Step', () => {
    const answerGameStateStep: GameStateStep = {
      id: 1,
      active: false,
      status: 'answer',
      isRevealed: false,
      isClueShown: false,
      reveals: 0
    }

    test('displays word when in answer state', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={answerGameStateStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      expect(screen.getByText('SOUTH')).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('Styling Based on Status', () => {
    test('applies correct background color for question status', () => {
      const questionStep: GameStateStep = {
        id: 1,
        active: false,
        status: 'question',
        isRevealed: false,
        isClueShown: false,
        reveals: 0
      }

      const { container } = render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={questionStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      expect(container.firstChild).toHaveClass('bg-green/50')
    })

    test('applies correct background color for answer status', () => {
      const answerStep: GameStateStep = {
        id: 1,
        active: false,
        status: 'answer',
        isRevealed: false,
        isClueShown: false,
        reveals: 0
      }

      const { container } = render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={answerStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      expect(container.firstChild).toHaveClass('bg-yellow/80')
    })

    test('applies correct background color for revealed status', () => {
      const revealedStep: GameStateStep = {
        id: 1,
        active: false,
        status: 'revealed',
        isRevealed: true,
        isClueShown: false,
        reveals: 0
      }

      const { container } = render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={revealedStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      expect(container.firstChild).toHaveClass('bg-grey')
    })

    test('applies default background color for unrevealed status', () => {
      const unrevealedStep: GameStateStep = {
        id: 1,
        active: false,
        status: 'unrevealed',
        isRevealed: false,
        isClueShown: false,
        reveals: 0
      }

      const { container } = render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={unrevealedStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      expect(container.firstChild).toHaveClass('bg-secondary')
    })
  })

  describe('Input Attributes', () => {
    const activeGameStateStep: GameStateStep = {
      id: 1,
      active: true,
      status: 'answer',
      isRevealed: false,
      isClueShown: false,
      reveals: 0
    }

    test('sets correct input attributes', () => {
      render(
        <LadderStep
          onGuessChange={mockOnGuessChange}
          inputRef={inputRef}
          gameStateStep={activeGameStateStep}
          ladderStep={mockLadderStep}
          ladderHeight={5}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('autoComplete', 'off')
      expect(input).toHaveAttribute('autoCorrect', 'off')
      expect(input).toHaveAttribute('autoCapitalize', 'off')
      expect(input).toHaveAttribute('spellCheck', 'false')
    })
  })
})