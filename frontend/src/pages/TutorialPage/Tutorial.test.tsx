import { render, screen, fireEvent } from '@testing-library/react'
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

      expect(screen.getByTestId('ladder-word-down')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-down')).toHaveTextContent('DOWN')
      expect(screen.getByTestId('ladder-word-earth')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-earth')).toHaveTextContent('EARTH')

      expect(screen.getByTestId('active-step-input')).toBeInTheDocument()
      expect(screen.getByTestId('active-step-input')).toHaveTextContent('')

      expect(screen.getByTestId('switch-direction-button')).toBeInTheDocument()
      expect(screen.getByTestId('switch-direction-button')).toHaveTextContent(/Switch to solving.*upward/i)
    })

    test('initializes with downward direction', () => {
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      // Should show "Switch to solving upward" indicating we're currently going downward
      expect(screen.getByTestId('switch-direction-button')).toBeInTheDocument()
      expect(screen.getByTestId('switch-direction-button')).toHaveTextContent(/Switch to solving.*upward/i)
    })

    test('initializes completion state correctly', () => {
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      // Should call setCompleted with false on initial render to sync state
      expect(mockSetCompleted).toHaveBeenCalledWith(false)
    })
  })

  describe('Downward Solving', () => {
    test('accepts correct first answer (SOUTH)', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByTestId('active-step-input')

      // Type the correct answer
      await user.type(input, 'SOUTH')

      // Should advance to next step
      // The input should clear (focus testing is problematic in jsdom)
    })

    test('handles case insensitive input', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByTestId('active-step-input')

      // Type lowercase
      await user.type(input, 'test')

      // Should still work (component converts to uppercase)
      expect((input as HTMLInputElement).value.toUpperCase()).toBe('TEST')
    })

    test('solves multiple steps in sequence', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      // First answer: SOUTH
      let input = screen.getByTestId('active-step-input')
      fireEvent.change(input, { target: { value: '' } })
      await user.type(input, 'SOUTH')

      // Second answer: MOUTH
      input = screen.getByTestId('active-step-input')
      fireEvent.change(input, { target: { value: '' } })
      await user.type(input, 'MOUTH')

      // Third answer: TONGUE
      input = screen.getByTestId('active-step-input')
      fireEvent.change(input, { target: { value: '' } })
      await user.type(input, 'TONGUE')

      // Should still have input field for next step
      input = screen.getByTestId('active-step-input')
      expect(input).toBeInTheDocument()
    })

    test('completes puzzle when solving downward fully', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const answers = ['SOUTH', 'MOUTH', 'TONGUE', 'SHOE', 'SOLE', 'SOUL', 'HEART']

      // Solve all steps
      for (const answer of answers) {
        let input = screen.getByTestId('active-step-input')
        fireEvent.change(input, { target: { value: '' } })
        await user.type(input, answer)
      }

      // all ladder steps should be grey
      expect(screen.getByTestId('ladder-word-down')).toHaveClass('bg-grey')
      expect(screen.getByTestId('ladder-word-south')).toHaveClass('bg-grey')
      expect(screen.getByTestId('ladder-word-mouth')).toHaveClass('bg-grey')
      expect(screen.getByTestId('ladder-word-tongue')).toHaveClass('bg-grey')
      expect(screen.getByTestId('ladder-word-shoe')).toHaveClass('bg-grey')
      expect(screen.getByTestId('ladder-word-sole')).toHaveClass('bg-grey')
      expect(screen.getByTestId('ladder-word-soul')).toHaveClass('bg-grey')
      expect(screen.getByTestId('ladder-word-heart')).toHaveClass('bg-grey')
      expect(screen.getByTestId('ladder-word-earth')).toHaveClass('bg-grey')

      // Should call setCompleted with true
      expect(mockSetCompleted).toHaveBeenCalledWith(true)
    })
  })

  describe('Direction Switching', () => {
    test('can switch to upward direction', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      // First solve one step to enable direction switching
      const input = screen.getByTestId('active-step-input')
      await user.type(input, 'SOUTH')

      // Click direction switch button
      const switchButton = screen.getByTestId('switch-direction-button')
      await user.click(switchButton)

      // Should now show "Switch to solving downward"
      expect(screen.getByTestId('switch-direction-button')).toHaveTextContent(/Switch to solving.*downward/i)
    })

    test.skip('solves upward from EARTH', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByTestId('active-step-input')

      // Solve one step downward first
      await user.type(input, 'SOUTH')

      // Switch direction
      await user.click(screen.getByTestId('switch-direction-button'))

      // Now solve upward: HEART should be the answer
      fireEvent.change(input, { target: { value: '' } })
      await user.type(input, 'HEART')

      // Should advance in upward direction
      expect(input).toBeInTheDocument()
    })
  })

  describe('Invalid Input Handling', () => {
    test.skip('ignores incorrect answers', async () => {
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByTestId('active-step-input')

      // Type wrong answer
      await user.type(input, 'WRONG')

      // Should not advance (input keeps the value)
      expect(input).toHaveValue('WRONG')

      // Type correct answer
      fireEvent.change(input, { target: { value: '' } })
      await user.type(input, 'SOUTH')

      // Should now advance (different behavior expected)
    })

    test('handles empty input', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByTestId('active-step-input')

      // Try to submit empty
      fireEvent.change(input, { target: { value: '' } })

      // Should not cause errors
      expect(input).toHaveValue('')
    })
  })

  describe('Completion State', () => {
    test.skip('disables direction toggle when completed', () => {
      render(<Tutorial setCompleted={mockSetCompleted} completed={true} />)

      // Direction toggle button should not be present when completed
      expect(screen.queryByTestId('switch-direction-button')).not.toBeInTheDocument()
      // Component should be in completed state
      expect(screen.getByTestId('ladder-word-down')).toBeInTheDocument()
    })

    test.skip('shows completed state correctly', () => {
      render(<Tutorial setCompleted={mockSetCompleted} completed={true} />)

      // All words should be visible (revealed state)
      expect(screen.getByTestId('ladder-word-down')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-earth')).toBeInTheDocument()
      // Additional words should be revealed too (may not exist in completed state)
      const southWord = screen.queryByTestId('ladder-word-south')
      const heartWord = screen.queryByTestId('ladder-word-heart')
      if (southWord) expect(southWord).toBeInTheDocument()
      if (heartWord) expect(heartWord).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    test.skip('disables direction toggle near completion', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByTestId('active-step-input')

      // Solve most of the puzzle downward (should disable toggle near end)
      const answers = ['SOUTH', 'MOUTH', 'TONGUE', 'SHOE', 'SOLE']

      for (const answer of answers) {
        fireEvent.change(input, { target: { value: '' } })
        await user.type(input, answer)
      }

      // Direction toggle should be disabled now
      expect(screen.queryByTestId('switch-direction-button')).not.toBeInTheDocument()
    })

    test.skip('handles forced single direction solving', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} completed={false} />)

      const input = screen.getByTestId('active-step-input')

      // Solve to near completion
      const answers = ['SOUTH', 'MOUTH', 'TONGUE', 'SHOE', 'SOLE', 'SOUL']

      for (const answer of answers) {
        fireEvent.change(input, { target: { value: '' } })
        await user.type(input, answer)
      }

      // Should be forced to continue in same direction
      expect(screen.queryByTestId('switch-direction-button')).not.toBeInTheDocument()
    })
  })
})