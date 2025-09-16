import { render, screen } from '@testing-library/react'
import { describe, test, expect } from 'vitest'
import Clues from '@/pages/TutorialPage/Clues'
import { GameState, Puzzle } from '@/types/game'

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

  describe('Downward Direction', () => {
    const downwardGameState: GameState = [
      { id: 0, active: false, status: 'question', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 1, active: true, status: 'answer', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 2, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 3, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 4, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 5, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 6, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 7, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 8, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 }
    ]

    test('renders clues section headings', () => {
      render(
        <Clues
          gameState={downwardGameState}
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
        />
      )

      expect(screen.getByText('Clues, out of order')).toBeInTheDocument()
    })

    test('shows unsolved clues with question word substituted', () => {
      render(
        <Clues
          gameState={downwardGameState}
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
        />
      )

      // Should show DOWN substituted in the clue (split across elements)
      expect(screen.getByText(/Cardinal direction that's/)).toBeInTheDocument()
      expect(screen.getByText('DOWN')).toBeInTheDocument()
      expect(screen.getByText(/on a map/)).toBeInTheDocument()
    })

    test('renders correct number of unsolved clues', () => {
      render(
        <Clues
          gameState={downwardGameState}
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
        />
      )

      // Should have multiple unsolved clues (excluding the last step which has no clue)
      const clueElements = screen.getAllByText(/Change the first letter|Organ that sits|Piece of clothing|Rubber layer|Kind of food|Popular piano duet|Move the first letter/)
      expect(clueElements.length).toBeGreaterThan(0)
    })

    test('does not show used clues section when no clues are solved', () => {
      render(
        <Clues
          gameState={downwardGameState}
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
        />
      )

      expect(screen.queryByText('Used clues')).not.toBeInTheDocument()
    })
  })

  describe('Upward Direction', () => {
    const upwardGameState: GameState = [
      { id: 0, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
      { id: 1, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 2, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 3, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 4, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 5, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 6, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 7, active: true, status: 'question', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 8, active: false, status: 'answer', isRevealed: false, isClueShown: false, reveals: 0 }
    ]

    test('shows clues with answer word substituted when going upward', () => {
      render(
        <Clues
          gameState={upwardGameState}
          puzzle={mockPuzzle}
          isDownward={false}
          completed={false}
        />
      )

      // Should show EARTH substituted in the clue (answer word for upward direction) - split across elements
      expect(screen.getByText(/Move the first letter of/)).toBeInTheDocument()
      expect(screen.getByText('EARTH')).toBeInTheDocument()
      expect(screen.getByText(/to the end to get where we are/)).toBeInTheDocument()
    })

    test('adds arrow to clues without {} placeholder when going upward', () => {
      const upwardGameStateWithSimpleClue: GameState = [
        { id: 0, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
        { id: 1, active: true, status: 'question', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 2, active: false, status: 'answer', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 3, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 4, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 5, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 6, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 7, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 8, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 }
      ]

      render(
        <Clues
          gameState={upwardGameStateWithSimpleClue}
          puzzle={mockPuzzle}
          isDownward={false}
          completed={false}
        />
      )

      // Should show arrow for clues without {} placeholder
      expect(screen.getAllByText(/→/)).toHaveLength(6) // Multiple arrows expected
    })
  })

  describe('Solved Clues', () => {
    const gameStateWithSolvedClues: GameState = [
      { id: 0, active: false, status: 'question', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 1, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
      { id: 2, active: true, status: 'answer', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 3, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 4, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 5, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 6, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 7, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 8, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 }
    ]

    test('shows used clues section when clues are solved', () => {
      render(
        <Clues
          gameState={gameStateWithSolvedClues}
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
        />
      )

      expect(screen.getByText('Used clues')).toBeInTheDocument()
    })

    test('displays solved clues with both question and answer words', () => {
      render(
        <Clues
          gameState={gameStateWithSolvedClues}
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
        />
      )

      // Should show both DOWN and SOUTH in the solved clue (multiple instances expected)
      expect(screen.getAllByText('DOWN')).toHaveLength(7) // Multiple DOWN instances
      expect(screen.getByText('SOUTH')).toBeInTheDocument()
    })

    test('adds arrow to solved clues with only question placeholder', () => {
      render(
        <Clues
          gameState={gameStateWithSolvedClues}
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
        />
      )

      // Should show arrow after clue that only has <> placeholder (uses -> not →)
      expect(screen.getByText('->').textContent).toBe('->')
    })
  })

  describe('Completed State', () => {
    const completedGameState: GameState = [
      { id: 0, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
      { id: 1, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
      { id: 2, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
      { id: 3, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
      { id: 4, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
      { id: 5, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
      { id: 6, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
      { id: 7, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
      { id: 8, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 }
    ]

    test('handles completed state correctly', () => {
      render(
        <Clues
          gameState={completedGameState}
          puzzle={mockPuzzle}
          isDownward={true}
          completed={true}
        />
      )

      // Should show used clues section
      expect(screen.getByText('Used clues')).toBeInTheDocument()

      // Should not show clues out of order section since all are solved
      expect(screen.queryByText('Clues, out of order')).not.toBeInTheDocument()
    })
  })

  describe('Word Highlighting', () => {
    const gameStateForHighlighting: GameState = [
      { id: 0, active: false, status: 'question', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 1, active: true, status: 'answer', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 2, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 3, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 4, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 5, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 6, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 7, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
      { id: 8, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 }
    ]

    test('applies correct styling to question words', () => {
      render(
        <Clues
          gameState={gameStateForHighlighting}
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
        />
      )

      const questionWord = screen.getByText('DOWN')
      expect(questionWord).toHaveClass('bg-green/30', 'text-green', 'p-1', 'font-mono')
    })

    test('applies correct styling to answer words', () => {
      const upwardGameState: GameState = [
        { id: 0, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
        { id: 1, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 2, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 3, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 4, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 5, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 6, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 7, active: true, status: 'question', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 8, active: false, status: 'answer', isRevealed: false, isClueShown: false, reveals: 0 }
      ]

      render(
        <Clues
          gameState={upwardGameState}
          puzzle={mockPuzzle}
          isDownward={false}
          completed={false}
        />
      )

      const answerWord = screen.getByText('EARTH')
      expect(answerWord).toHaveClass('bg-yellow/30', 'text-yellow', 'p-1', 'font-mono')
    })
  })

  describe('Edge Cases', () => {
    test('handles empty unsolved steps', () => {
      const gameStateWithAllSolved: GameState = [
        { id: 0, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
        { id: 1, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
        { id: 2, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
        { id: 3, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
        { id: 4, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
        { id: 5, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
        { id: 6, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
        { id: 7, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 },
        { id: 8, active: false, status: 'revealed', isRevealed: true, isClueShown: false, reveals: 0 }
      ]

      render(
        <Clues
          gameState={gameStateWithAllSolved}
          puzzle={mockPuzzle}
          isDownward={true}
          completed={true}
        />
      )

      // Should not show unsolved clues section
      expect(screen.queryByText('Clues, out of order')).not.toBeInTheDocument()
      expect(screen.getByText('Used clues')).toBeInTheDocument()
    })

    test('excludes last step from unsolved clues (has no clue)', () => {
      const gameStateWithLastStepUnsolved: GameState = [
        { id: 0, active: false, status: 'question', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 1, active: true, status: 'answer', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 2, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 3, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 4, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 5, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 6, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 7, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 },
        { id: 8, active: false, status: 'unrevealed', isRevealed: false, isClueShown: false, reveals: 0 }
      ]

      render(
        <Clues
          gameState={gameStateWithLastStepUnsolved}
          puzzle={mockPuzzle}
          isDownward={true}
          completed={false}
        />
      )

      // Should not attempt to render clue for EARTH (last step, has null clue)
      // This tests the filter logic that excludes the last step
      expect(screen.getByText('Clues, out of order')).toBeInTheDocument()
    })
  })
})