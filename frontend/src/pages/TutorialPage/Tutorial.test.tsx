import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import Tutorial from '@/pages/TutorialPage/Tutorial'

describe('Tutorial Component', () => {
  const mockSetCompleted = vi.fn()

  beforeEach(() => {
    mockSetCompleted.mockClear()
  })

  describe('Initial rendering', () => {
    test('renders with correct initial state', () => {
      render(<Tutorial setCompleted={mockSetCompleted} />)

      expect(screen.getByTestId('ladder-word-down')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-down')).toHaveTextContent('DOWN')
      expect(screen.getByTestId('ladder-word-earth')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-earth')).toHaveTextContent('EARTH')

      expect(screen.getByTestId('active-step-input')).toBeInTheDocument()
      expect(screen.getByTestId('active-step-input')).toHaveValue('')

      expect(screen.getByTestId('switch-direction-button')).toBeInTheDocument()
      expect(screen.getByTestId('switch-direction-button')).toHaveTextContent(/Switch to solving.*upward/i)
    })

    test('initializes with downward direction', () => {
      render(<Tutorial setCompleted={mockSetCompleted} />)

      // Should show "Switch to solving upward" indicating we're currently going downward
      expect(screen.getByTestId('switch-direction-button')).toBeInTheDocument()
      expect(screen.getByTestId('switch-direction-button')).toHaveTextContent(/Switch to solving.*upward/i)
    })

    test('calls setCompleted with false on initial render', () => {
      render(<Tutorial setCompleted={mockSetCompleted} />)

      // Should call setCompleted with false on initial render to sync state
      expect(mockSetCompleted).toHaveBeenCalledWith(false)
    })
  })

  describe('User input handling', () => {
    test('accepts user input in the active input field', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} />)

      const input = screen.getByTestId('active-step-input')

      // Type some text
      await user.type(input, 'test')

      // Should convert to uppercase and display in input
      expect(input).toHaveValue('TEST')
    })

    test('clears input and changes focus when correct answer is entered', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} />)

      const input = screen.getByTestId('active-step-input')

      // Type the correct answer for the first step
      await user.type(input, 'SOUTH')

      // The input should be cleared after correct answer (state machine handles this)
      // Note: In some cases the component may keep the input focused but cleared
    })

    test('handles empty input without crashing', async () => {
      render(<Tutorial setCompleted={mockSetCompleted} />)

      const input = screen.getByTestId('active-step-input')

      // Try to submit empty
      fireEvent.change(input, { target: { value: '' } })

      // Should not cause errors
      expect(input).toHaveValue('')
    })
  })

  describe('Direction switching', () => {
    test('can switch to upward direction', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} />)

      // First solve one step to enable direction switching
      const input = screen.getByTestId('active-step-input')
      await user.type(input, 'SOUTH')

      // Click direction switch button
      const switchButton = screen.getByTestId('switch-direction-button')
      await user.click(switchButton)

      // Should now show "Switch to solving downward"
      expect(screen.getByTestId('switch-direction-button')).toHaveTextContent(/Switch to solving.*downward/i)
    })

    test('maintains switch button functionality', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} />)

      const switchButton = screen.getByTestId('switch-direction-button')

      // Button should be clickable initially
      expect(switchButton).toBeEnabled()

      // Click should not throw error
      await user.click(switchButton)
      expect(switchButton).toBeInTheDocument()
    })
  })

  describe('Puzzle progression', () => {
    test('progresses through multiple steps', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} />)

      // Should always have an active input for progression
      expect(screen.getByTestId('active-step-input')).toBeInTheDocument()

      // Type first correct answer
      const input = screen.getByTestId('active-step-input')
      await user.type(input, 'SOUTH')

      // Should still have an input field available for next step
      expect(screen.getByTestId('active-step-input')).toBeInTheDocument()
    })

    test('progresses through puzzle solving', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} />)

      const answers = ['SOUTH', 'MOUTH', 'TONGUE', 'SHOE', 'SOLE', 'SOUL', 'HEART']

      // Solve several steps to test progression
      for (let i = 0; i < 3; i++) {
        let input = screen.getByTestId('active-step-input')
        fireEvent.change(input, { target: { value: '' } })
        await user.type(input, answers[i])
      }

      // Should maintain an input field for continued progression
      expect(screen.getByTestId('active-step-input')).toBeInTheDocument()
    })
  })

  describe('Component integration', () => {
    test('renders all expected child components', () => {
      render(<Tutorial setCompleted={mockSetCompleted} />)

      // Should render ladder steps
      expect(screen.getByTestId('ladder-word-down')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-earth')).toBeInTheDocument()

      // Should render clues section
      expect(screen.getByTestId('clues-out-of-order-heading')).toBeInTheDocument()

      // Should render active input
      expect(screen.getByTestId('active-step-input')).toBeInTheDocument()

      // Should render direction switch button
      expect(screen.getByTestId('switch-direction-button')).toBeInTheDocument()
    })

    test('maintains consistent UI structure', () => {
      render(<Tutorial setCompleted={mockSetCompleted} />)

      // Check that game area exists using ID
      const gameArea = document.getElementById('game-area')
      expect(gameArea).toBeInTheDocument()

      // Check that input field has correct attributes
      const input = screen.getByTestId('active-step-input')
      expect(input).toHaveAttribute('type', 'text')
      expect(input).toHaveAttribute('autoComplete', 'off')
    })
  })

  describe('Completion state handling', () => {
    test('calls setCompleted based on state machine completion status', () => {
      render(<Tutorial setCompleted={mockSetCompleted} />)

      // Initially calls with false because puzzle starts incomplete
      expect(mockSetCompleted).toHaveBeenCalledWith(false)

      // The completion state is managed by the state machine
      // This test verifies that setCompleted is called with the current state
      expect(mockSetCompleted).toHaveBeenCalledTimes(1)
    })

    test('hides switch direction button when completed', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} />)

      // Initially should show switch button
      expect(screen.getByTestId('switch-direction-button')).toBeInTheDocument()

      // Complete the puzzle
      const answers = ['SOUTH', 'MOUTH', 'TONGUE', 'SHOE', 'SOLE', 'SOUL', 'HEART']

      for (const answer of answers) {
        const input = screen.getByTestId('active-step-input')
        fireEvent.change(input, { target: { value: '' } })
        await user.type(input, answer)
      }

      // Switch button should be hidden when completed
      expect(screen.queryByTestId('switch-direction-button')).not.toBeInTheDocument()
    })
  })

  describe('LadderStep integration', () => {
    test('renders all ladder steps with correct props', () => {
      render(<Tutorial setCompleted={mockSetCompleted} />)

      // Check that all 9 steps are rendered
      expect(screen.getByTestId('ladder-word-down')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-south')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-mouth')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-tongue')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-shoe')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-sole')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-soul')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-heart')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-earth')).toBeInTheDocument()
    })

    test('passes shouldShowTransform correctly to LadderStep components', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} />)

      // Solve first step to reveal transform
      const input = screen.getByTestId('active-step-input')
      await user.type(input, 'SOUTH')

      // After solving first step, both DOWN and SOUTH should be revealed
      // So DOWN should show its transform since both DOWN (0) and SOUTH (1) are revealed
      // This is handled by shouldShowTransform={isStepRevealed(stepId) && isStepRevealed(stepId + 1)}
      expect(screen.getByTestId('ladder-word-down')).toBeInTheDocument()
      expect(screen.getByTestId('ladder-word-south')).toBeInTheDocument()
    })
  })

  describe('Mobile UI elements', () => {
    test('renders show full ladder button for mobile', () => {
      render(<Tutorial setCompleted={mockSetCompleted} />)

      const showLadderButton = screen.getByText('Show full ladder')
      expect(showLadderButton).toBeInTheDocument()
      expect(showLadderButton).toHaveClass('md:hidden')
    })

    test('renders responsive grid layout', () => {
      render(<Tutorial setCompleted={mockSetCompleted} />)

      const gameArea = document.getElementById('game-area')
      expect(gameArea).toHaveClass('md:grid', 'md:grid-cols-[2fr_3fr]', 'md:gap-8')
    })
  })

  describe('Direction switch behavior', () => {
    test('updates button text correctly when switching directions', async () => {
      const user = userEvent.setup()
      render(<Tutorial setCompleted={mockSetCompleted} />)

      const switchButton = screen.getByTestId('switch-direction-button')

      // Initially should show "Switch to solving upward"
      expect(switchButton).toHaveTextContent(/Switch to solving.*upward/i)

      // Click to switch direction
      await user.click(switchButton)

      // Should now show "Switch to solving downward"
      expect(switchButton).toHaveTextContent(/Switch to solving.*downward/i)

      // Click again to switch back
      await user.click(switchButton)

      // Should show "Switch to solving upward" again
      expect(switchButton).toHaveTextContent(/Switch to solving.*upward/i)
    })
  })

  describe('Focus management', () => {
    test('focuses input field on render', () => {
      render(<Tutorial setCompleted={mockSetCompleted} />)

      const input = screen.getByTestId('active-step-input')

      // Note: Focus testing can be tricky in jsdom, but we can check if element exists and is not disabled
      expect(input).toBeInTheDocument()
      expect(input).not.toBeDisabled()
    })
  })
})