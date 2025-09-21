import { render, screen } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import Clues from '@/pages/TutorialPage/Clues'
import { TutorialState } from '@/types/tutorialStateMachine'
import { Puzzle } from '@/types/game'

describe('Clues Component', () => {
  const mockPuzzle: Puzzle = {
    title: 'Test Puzzle',
    ladder: [
      { word: 'DOWN', clue: 'Cardinal direction that\'s <> on a map', transform: 'MEANS' },
      { word: 'SOUTH', clue: 'Change the first letter of <> to get a part of the body', transform: 'S->M' },
      { word: 'MOUTH', clue: 'Organ that sits inside the <>', transform: 'CONTAINS THE' },
      { word: 'TONGUE', clue: 'Piece of clothing that often has a <>', transform: 'IS ON A' },
      { word: 'SHOE', clue: null, transform: null }
    ]
  }

  const createMockGameState = (overrides: Partial<TutorialState> = {}): TutorialState => ({
    phase: 'DOWNWARD',
    direction: 'down',
    revealedSteps: new Set([0, 4]), // First and last steps revealed
    currentQuestion: 0,
    currentAnswer: 1,
    isCompleted: false,
    puzzle: mockPuzzle,
    ...overrides
  })

  describe('Rendering', () => {
    test('renders clues section headings when there are unsolved clues', () => {
      const gameState = createMockGameState()
      render(<Clues gameState={gameState} />)

      expect(screen.getByTestId('clues-out-of-order-heading')).toBeInTheDocument()
      expect(screen.getByText('Clues, out of order')).toBeInTheDocument()
    })

    test('does not show used clues section when no clues are solved', () => {
      const gameState = createMockGameState()
      render(<Clues gameState={gameState} />)

      expect(screen.queryByTestId('used-clues-heading')).not.toBeInTheDocument()
    })

    test('shows used clues section when some clues are solved', () => {
      const gameState = createMockGameState({
        revealedSteps: new Set([0, 1, 4]) // Two consecutive steps revealed
      })
      render(<Clues gameState={gameState} />)

      expect(screen.getByTestId('used-clues-heading')).toBeInTheDocument()
      expect(screen.getByText('Used clues')).toBeInTheDocument()
    })
  })

  describe('Direction-based rendering', () => {
    test('shows question word when going downward', () => {
      const gameState = createMockGameState()
      render(<Clues gameState={gameState} />)

      // Should show the question word in green highlighting
      const questionWords = screen.getAllByTestId('question-word-down')
      expect(questionWords.length).toBeGreaterThan(0)
      expect(questionWords[0]).toHaveTextContent('DOWN')
    })

    test('shows answer word when going upward', () => {
      const gameState = createMockGameState({ direction: 'up' })
      render(<Clues gameState={gameState} />)

      // Should show the answer word in yellow highlighting
      const answerWords = screen.getAllByTestId('answer-word-south')
      expect(answerWords.length).toBeGreaterThan(0)
      expect(answerWords[0]).toHaveTextContent('SOUTH')
    })
  })

  describe('Word highlighting', () => {
    test('applies correct styling to question words', () => {
      const gameState = createMockGameState()
      render(<Clues gameState={gameState} />)

      const questionWords = screen.getAllByTestId('question-word-down')
      expect(questionWords[0]).toHaveClass('bg-green/30', 'text-green')
    })

    test('applies correct styling to answer words', () => {
      const gameState = createMockGameState({ direction: 'up' })
      render(<Clues gameState={gameState} />)

      const answerWords = screen.getAllByTestId('answer-word-south')
      expect(answerWords[0]).toHaveClass('bg-yellow/30', 'text-yellow')
    })
  })

  describe('Completed state', () => {
    test('handles completed state correctly', () => {
      const gameState = createMockGameState({
        isCompleted: true,
        revealedSteps: new Set([0, 1, 2, 3, 4]),
        currentQuestion: -1,
        currentAnswer: -1
      })
      render(<Clues gameState={gameState} />)

      // When completed, should show used clues section
      expect(screen.getByTestId('used-clues-heading')).toBeInTheDocument()
    })

    test('does not show unsolved clues when completed', () => {
      const gameState = createMockGameState({
        isCompleted: true,
        revealedSteps: new Set([0, 1, 2, 3, 4]),
        currentQuestion: -1,
        currentAnswer: -1
      })
      render(<Clues gameState={gameState} />)

      // Should not show unsolved clues section when all are solved
      expect(screen.queryByTestId('clues-out-of-order-heading')).not.toBeInTheDocument()
    })
  })

  describe('Clue rendering logic', () => {
    test('renders clue with <> placeholder correctly in downward mode', () => {
      const gameState = createMockGameState()
      render(<Clues gameState={gameState} />)

      // Check that the clue text is present
      expect(screen.getByText(/Cardinal direction that's/)).toBeInTheDocument()
      expect(screen.getByText(/on a map/)).toBeInTheDocument()
    })

    test('renders clue with {} placeholder correctly in upward mode', () => {
      const puzzleWithBracePlaceholder: Puzzle = {
        title: 'Test Puzzle',
        ladder: [
          { word: 'DOWN', clue: 'Popular piano duet "Heart and {}"', transform: 'MEANS' },
          { word: 'SOUL', clue: 'Test clue', transform: 'S->M' },
          { word: 'LAST', clue: null, transform: null }
        ]
      }

      const gameState = createMockGameState({
        direction: 'up',
        currentQuestion: 1,
        currentAnswer: 0,
        revealedSteps: new Set([2]),
        puzzle: puzzleWithBracePlaceholder
      })
      render(<Clues gameState={gameState} />)

      expect(screen.getByText(/Popular piano duet "Heart and/)).toBeInTheDocument()
    })

    test('adds arrow to upward clue when no {} placeholder is present', () => {
      const puzzleWithoutBrace: Puzzle = {
        title: 'Test Puzzle',
        ladder: [
          { word: 'DOWN', clue: 'Cardinal direction that\'s <> on a map', transform: 'MEANS' },
          { word: 'SOUTH', clue: 'Test clue without braces', transform: 'S->M' },
          { word: 'LAST', clue: null, transform: null }
        ]
      }

      const gameState = createMockGameState({
        direction: 'up',
        currentQuestion: 1,
        currentAnswer: 0,
        revealedSteps: new Set([2]),
        puzzle: puzzleWithoutBrace
      })
      render(<Clues gameState={gameState} />)

      // Should contain both the clue text and the arrow with answer word
      const clueElement = screen.getByTestId('unsolved-clue-0')
      expect(clueElement).toHaveTextContent('→')
      expect(clueElement).toHaveTextContent('DOWN')
    })

    test('adds arrow to solved clue when only <> placeholder is present', () => {
      const gameState = createMockGameState({
        revealedSteps: new Set([0, 1, 4]) // DOWN and SOUTH both revealed
      })
      render(<Clues gameState={gameState} />)

      const solvedClue = screen.getByTestId('solved-clue-0')
      expect(solvedClue).toHaveTextContent('->')
      expect(solvedClue).toHaveTextContent('SOUTH')
    })

    test('does not add arrow to solved clue when {} placeholder is present', () => {
      const puzzleWithBothPlaceholders: Puzzle = {
        title: 'Test Puzzle',
        ladder: [
          { word: 'DOWN', clue: 'Popular piano duet "{} and <>"', transform: 'MEANS' },
          { word: 'SOUTH', clue: 'Test clue', transform: 'S->M' },
          { word: 'LAST', clue: null, transform: null }
        ]
      }

      const gameState = createMockGameState({
        revealedSteps: new Set([0, 1, 2]),
        puzzle: puzzleWithBothPlaceholders
      })
      render(<Clues gameState={gameState} />)

      const solvedClue = screen.getByTestId('solved-clue-0')
      expect(solvedClue).toHaveTextContent('SOUTH')
      expect(solvedClue).toHaveTextContent('DOWN')
      // Should not have extra arrow since {} placeholder is present
      expect(solvedClue.textContent).not.toMatch(/.*SOUTH.*→.*SOUTH/)
    })
  })

  describe('Edge cases', () => {
    test('handles state with no current question/answer', () => {
      const gameState = createMockGameState({
        currentQuestion: -1,
        currentAnswer: -1,
        revealedSteps: new Set([0, 4])
      })
      render(<Clues gameState={gameState} />)

      // Should render without crashing
      expect(screen.getByTestId('clues-out-of-order-heading')).toBeInTheDocument()
    })

    test('excludes steps with null clues from rendering', () => {
      const gameState = createMockGameState({
        revealedSteps: new Set([0]) // Only first step revealed
      })
      render(<Clues gameState={gameState} />)

      // Should render clues but exclude the last step (index 4) which has null clue
      const unsolvedClues = screen.getAllByTestId(/^unsolved-clue-/)
      expect(unsolvedClues.length).toBeGreaterThan(0)

      // Should not include a clue for step 4 (index 4 which has null clue)
      expect(screen.queryByTestId('unsolved-clue-4')).not.toBeInTheDocument()
    })

    test('handles empty clue parts gracefully', () => {
      const puzzleWithEmptyParts: Puzzle = {
        title: 'Test Puzzle',
        ladder: [
          { word: 'DOWN', clue: '<><>', transform: 'MEANS' },
          { word: 'SOUTH', clue: 'Test', transform: 'S->M' },
          { word: 'LAST', clue: null, transform: null }
        ]
      }

      const gameState = createMockGameState({
        revealedSteps: new Set([2]),
        puzzle: puzzleWithEmptyParts
      })
      render(<Clues gameState={gameState} />)

      // Should render without crashing
      expect(screen.getByTestId('unsolved-clue-0')).toBeInTheDocument()
    })
  })
})