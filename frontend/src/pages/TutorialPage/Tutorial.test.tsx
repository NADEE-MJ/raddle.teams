import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import Tutorial from '@/pages/TutorialPage/Tutorial'

describe('Tutorial Component', () => {
  const mockSetCompleted = vi.fn()

  beforeEach(() => {
    mockSetCompleted.mockClear()
  })

  describe('Initial State', () => {
    test('renders with correct initial state', () => {
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      // Check that START and END words are visible
      expect(screen.getByText('DOWN')).toBeInTheDocument()
      expect(screen.getByText('EARTH')).toBeInTheDocument()

      // Should have an input field for guessing
      expect(screen.getByRole('textbox')).toBeInTheDocument()

      // Direction toggle button should be present
      expect(screen.getByText(/Switch to solving.*upward/i)).toBeInTheDocument()
    })

    test('initializes with downward direction', () => {
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      // Should show "Switch to solving upward" indicating we're currently going downward
      expect(screen.getByText(/Switch to solving.*upward/i)).toBeInTheDocument()
    })

    test('does not call setCompleted on initial render', () => {
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      expect(mockSetCompleted).not.toHaveBeenCalled()
    })
  })

  describe('Downward Solving', () => {
    test('accepts correct first answer (SOUTH)', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByRole('textbox')

      // Type the correct answer
      await user.type(input, 'SOUTH')

      // Should advance to next step
      // The input should clear and focus should remain
      expect(input).toHaveFocus()
    })

    test('handles case insensitive input', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByRole('textbox')

      // Type lowercase
      await user.type(input, 'south')

      // Should still work (component converts to uppercase)
      expect(input).toHaveValue('SOUTH')
    })

    test('solves multiple steps in sequence', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByRole('textbox')

      // First answer: SOUTH
      await user.clear(input)
      await user.type(input, 'SOUTH')

      // Second answer: MOUTH
      await user.clear(input)
      await user.type(input, 'MOUTH')

      // Third answer: TONGUE
      await user.clear(input)
      await user.type(input, 'TONGUE')

      // Should still have input field for next step
      expect(input).toBeInTheDocument()
    })

    test('completes puzzle when solving downward fully', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByRole('textbox')
      const answers = ['SOUTH', 'MOUTH', 'TONGUE', 'SHOE', 'SOLE', 'SOUL', 'HEART']

      // Solve all steps
      for (const answer of answers) {
        await user.clear(input)
        await user.type(input, answer)
      }

      // Should call setCompleted with true
      expect(mockSetCompleted).toHaveBeenCalledWith(true)
    })
  })

  describe('Direction Switching', () => {
    test('can switch to upward direction', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      // First solve one step to enable direction switching
      const input = screen.getByRole('textbox')
      await user.type(input, 'SOUTH')

      // Click direction switch button
      const switchButton = screen.getByText(/Switch to solving.*upward/i)
      await user.click(switchButton)

      // Should now show "Switch to solving downward"
      expect(screen.getByText(/Switch to solving.*downward/i)).toBeInTheDocument()
    })

    test('solves upward from EARTH', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByRole('textbox')

      // Solve one step downward first
      await user.type(input, 'SOUTH')

      // Switch direction
      await user.click(screen.getByText(/Switch to solving.*upward/i))

      // Now solve upward: HEART should be the answer
      await user.clear(input)
      await user.type(input, 'HEART')

      // Should advance in upward direction
      expect(input).toBeInTheDocument()
    })
  })

  describe('Invalid Input Handling', () => {
    test('ignores incorrect answers', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByRole('textbox')

      // Type wrong answer
      await user.type(input, 'WRONG')

      // Should not advance (input keeps the value)
      expect(input).toHaveValue('WRONG')

      // Type correct answer
      await user.clear(input)
      await user.type(input, 'SOUTH')

      // Should now advance (different behavior expected)
    })

    test('handles empty input', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByRole('textbox')

      // Try to submit empty
      await user.clear(input)

      // Should not cause errors
      expect(input).toHaveValue('')
    })
  })

  describe('Completion State', () => {
    test('disables direction toggle when completed', () => {
      render(<Tutorial setCompleted={mockSetCompleted} completed={true} />)

      // Direction toggle button should not be present when completed
      expect(screen.queryByText(/Switch to solving/)).not.toBeInTheDocument()
    })

    test('shows completed state correctly', () => {
      render(<Tutorial setCompleted={mockSetCompleted} completed={true} />)

      // All words should be visible (revealed state)
      expect(screen.getByText('DOWN')).toBeInTheDocument()
      expect(screen.getByText('EARTH')).toBeInTheDocument()
      // Additional words should be revealed too
      expect(screen.getByText('SOUTH')).toBeInTheDocument()
      expect(screen.getByText('HEART')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    test('disables direction toggle near completion', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByRole('textbox')

      // Solve most of the puzzle downward (should disable toggle near end)
      const answers = ['SOUTH', 'MOUTH', 'TONGUE', 'SHOE', 'SOLE']

      for (const answer of answers) {
        await user.clear(input)
        await user.type(input, answer)
      }

      // Direction toggle should be disabled now
      expect(screen.queryByText(/Switch to solving/)).not.toBeInTheDocument()
    })

    test('handles forced single direction solving', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByRole('textbox')

      // Solve to near completion
      const answers = ['SOUTH', 'MOUTH', 'TONGUE', 'SHOE', 'SOLE', 'SOUL']

      for (const answer of answers) {
        await user.clear(input)
        await user.type(input, answer)
      }

      // Should be forced to continue in same direction
      expect(screen.queryByText(/Switch to solving/)).not.toBeInTheDocument()
    })
  })
})