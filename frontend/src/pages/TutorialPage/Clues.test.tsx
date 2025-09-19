import { render, screen } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import Clues from '@/pages/TutorialPage/Clues'
import { Puzzle } from '@/types/game'

describe('Clues Component', () => {
  const mockPuzzle: Puzzle = {
    title: 'Test Puzzle',
    ladder: [
      { word: 'DOWN', clue: 'Cardinal direction that\'s <> on a map', transform: 'MEANS' },
      { word: 'SOUTH', clue: 'Change the first letter of <> to get a part of the body', transform: 'S->M' },
      { word: 'MOUTH', clue: 'Organ that sits inside the <>', transform: 'CONTAINS THE' },
      { word: 'TONGUE', clue: 'Piece of clothing that often has a <>', transform: 'IS ON A' },
      { word: 'SHOE', clue: 'Rubber layer on the bottom of a <>', transform: 'CONTAINS A' },
      { word: 'SOLE', clue: 'Kind of food or music that sounds like <>', transform: 'SOUNDS LIKE' },
      { word: 'SOUL', clue: 'Popular piano duet "{} and <>"', transform: 'IS' },
      { word: 'HEART', clue: 'Move the first letter of <> to the end to get where we are', transform: 'H -> END' },
      { word: 'EARTH', clue: null, transform: null }
    ]
  }

  // Mock functions for tutorial state machine methods
  const mockIsStepRevealed = (stepId: number) => stepId === 0 || stepId === 8 // First and last steps revealed
  const mockIsCurrentQuestion = (stepId: number) => stepId === 0
  const mockIsCurrentAnswer = (stepId: number) => stepId === 1

  describe('Downward Direction', () => {
    test('renders clues section headings', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
          isStepRevealed={mockIsStepRevealed}
          isCurrentQuestion={mockIsCurrentQuestion}
          isCurrentAnswer={mockIsCurrentAnswer}
          questionWord="DOWN"
          answerWord="SOUTH"
        />
      )

      expect(screen.getByTestId('clues-out-of-order-heading')).toBeInTheDocument()
      expect(screen.getByText('Clues, out of order')).toBeInTheDocument()
    })

    test('shows unsolved clues with question word substituted', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
          isStepRevealed={mockIsStepRevealed}
          isCurrentQuestion={mockIsCurrentQuestion}
          isCurrentAnswer={mockIsCurrentAnswer}
          questionWord="DOWN"
          answerWord="SOUTH"
        />
      )

      // Should show the question word in green highlighting
      expect(screen.getByTestId('question-word-down')).toBeInTheDocument()
      expect(screen.getByTestId('question-word-down')).toHaveTextContent('DOWN')
    })

    test('renders correct number of unsolved clues', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
          isStepRevealed={mockIsStepRevealed}
          isCurrentQuestion={mockIsCurrentQuestion}
          isCurrentAnswer={mockIsCurrentAnswer}
          questionWord="DOWN"
          answerWord="SOUTH"
        />
      )

      // Should have unsolved clues for steps 1-7 (excluding last step which has no clue)
      const unsolvedClues = screen.getAllByTestId(/^unsolved-clue-/)
      expect(unsolvedClues).toHaveLength(6) // Steps 1,2,3,4,5,6 (7 steps total minus step 0 which is revealed)
    })

    test('does not show used clues section when no clues are solved', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
          isStepRevealed={mockIsStepRevealed}
          isCurrentQuestion={mockIsCurrentQuestion}
          isCurrentAnswer={mockIsCurrentAnswer}
          questionWord="DOWN"
          answerWord="SOUTH"
        />
      )

      expect(screen.queryByTestId('used-clues-heading')).not.toBeInTheDocument()
    })
  })

  describe('Upward Direction', () => {
    test('shows clues with answer word substituted when going upward', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={false}
          completed={false}
          isStepRevealed={mockIsStepRevealed}
          isCurrentQuestion={mockIsCurrentQuestion}
          isCurrentAnswer={mockIsCurrentAnswer}
          questionWord="DOWN"
          answerWord="SOUTH"
        />
      )

      // Should show the answer word in yellow highlighting
      expect(screen.getByTestId('answer-word-south')).toBeInTheDocument()
      expect(screen.getByTestId('answer-word-south')).toHaveTextContent('SOUTH')
    })

    test('adds arrow to clues without {} placeholder when going upward', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={false}
          completed={false}
          isStepRevealed={mockIsStepRevealed}
          isCurrentQuestion={mockIsCurrentQuestion}
          isCurrentAnswer={mockIsCurrentAnswer}
          questionWord="DOWN"
          answerWord="SOUTH"
        />
      )

      // Should contain arrow symbol for clues without {} placeholder
      expect(screen.getByText('→')).toBeInTheDocument()
    })
  })

  describe('Solved Clues', () => {
    const mockIsStepRevealedWithSolved = (stepId: number) => stepId === 0 || stepId === 1 || stepId === 8

    test('shows used clues section when clues are solved', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
          isStepRevealed={mockIsStepRevealedWithSolved}
          isCurrentQuestion={mockIsCurrentQuestion}
          isCurrentAnswer={mockIsCurrentAnswer}
          questionWord="DOWN"
          answerWord="SOUTH"
        />
      )

      expect(screen.getByTestId('used-clues-heading')).toBeInTheDocument()
      expect(screen.getByText('Used clues')).toBeInTheDocument()
    })

    test('displays solved clues with both question and answer words', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
          isStepRevealed={mockIsStepRevealedWithSolved}
          isCurrentQuestion={mockIsCurrentQuestion}
          isCurrentAnswer={mockIsCurrentAnswer}
          questionWord="DOWN"
          answerWord="SOUTH"
        />
      )

      // Should show solved clue
      expect(screen.getByTestId('solved-clue-0')).toBeInTheDocument()
    })

    test('adds arrow to solved clues with only question placeholder', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
          isStepRevealed={mockIsStepRevealedWithSolved}
          isCurrentQuestion={mockIsCurrentQuestion}
          isCurrentAnswer={mockIsCurrentAnswer}
          questionWord="DOWN"
          answerWord="SOUTH"
        />
      )

      // Should contain arrow symbol for solved clues
      expect(screen.getByText(' -> ')).toBeInTheDocument()
    })
  })

  describe('Completed State', () => {
    test('handles completed state correctly', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={true}
          completed={true}
          isStepRevealed={() => true}
          isCurrentQuestion={() => false}
          isCurrentAnswer={() => false}
          questionWord={null}
          answerWord={null}
        />
      )

      // When completed, should show used clues section
      expect(screen.getByTestId('used-clues-heading')).toBeInTheDocument()
    })
  })

  describe('Word Highlighting', () => {
    test('applies correct styling to question words', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
          isStepRevealed={mockIsStepRevealed}
          isCurrentQuestion={mockIsCurrentQuestion}
          isCurrentAnswer={mockIsCurrentAnswer}
          questionWord="DOWN"
          answerWord="SOUTH"
        />
      )

      const questionWord = screen.getByTestId('question-word-down')
      expect(questionWord).toHaveClass('bg-green/30', 'text-green')
    })

    test('applies correct styling to answer words', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={false}
          completed={false}
          isStepRevealed={mockIsStepRevealed}
          isCurrentQuestion={mockIsCurrentQuestion}
          isCurrentAnswer={mockIsCurrentAnswer}
          questionWord="DOWN"
          answerWord="SOUTH"
        />
      )

      const answerWord = screen.getByTestId('answer-word-south')
      expect(answerWord).toHaveClass('bg-yellow/30', 'text-yellow')
    })
  })

  describe('Edge Cases', () => {
    const mockIsStepRevealedAll = () => false
    const mockIsCurrentQuestionNone = () => false
    const mockIsCurrentAnswerNone = () => false

    test('handles empty unsolved steps', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
          isStepRevealed={() => true} // All steps revealed
          isCurrentQuestion={mockIsCurrentQuestionNone}
          isCurrentAnswer={mockIsCurrentAnswerNone}
          questionWord="DOWN"
          answerWord="SOUTH"
        />
      )

      // Should not show unsolved clues section when all are solved
      expect(screen.queryByTestId('clues-out-of-order-heading')).not.toBeInTheDocument()
    })

    test('excludes last step from unsolved clues (has no clue)', () => {
      render(
        <Clues
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
          isStepRevealed={mockIsStepRevealedAll}
          isCurrentQuestion={mockIsCurrentQuestion}
          isCurrentAnswer={mockIsCurrentAnswer}
          questionWord="DOWN"
          answerWord="SOUTH"
        />
      )

      // Should show unsolved clues for steps 0-6 only (step 7 excluded as it has no clue)
      const unsolvedClues = screen.getAllByTestId(/^unsolved-clue-/)
      expect(unsolvedClues).toHaveLength(7) // Steps 0,1,2,3,4,5,6
    })
  })
})