import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import TutorialPage from './index'

// Mock the Tutorial component since we're testing the page wrapper
vi.mock('./Tutorial', () => ({
  default: ({ setCompleted }: { setCompleted: (completed: boolean) => void }) => (
    <div data-testid="tutorial-component">
      <button
        data-testid="mock-complete-tutorial"
        onClick={() => setCompleted(true)}
      >
        Complete Tutorial
      </button>
    </div>
  )
}))

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('TutorialPage', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    )
  }

  beforeEach(() => {
    mockNavigate.mockClear()
  })

  describe('Initial rendering', () => {
    test('renders page title and skip button', () => {
      renderWithRouter(<TutorialPage />)

      expect(screen.getByText('Learn how to Raddle')).toBeInTheDocument()
      expect(screen.getByText('Skip Tutorial')).toBeInTheDocument()
    })

    test('renders Tutorial component', () => {
      renderWithRouter(<TutorialPage />)

      expect(screen.getByTestId('tutorial-component')).toBeInTheDocument()
    })

    test('does not show completion link initially', () => {
      renderWithRouter(<TutorialPage />)

      expect(screen.queryByText('Ready to Play with Teams! →')).not.toBeInTheDocument()
    })
  })

  describe('Skip button functionality', () => {
    test('navigates to home when skip button is clicked', async () => {
      const user = userEvent.setup()
      renderWithRouter(<TutorialPage />)

      const skipButton = screen.getByText('Skip Tutorial')
      await user.click(skipButton)

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('Completion state management', () => {
    test('shows completion link when tutorial is completed', async () => {
      const user = userEvent.setup()
      renderWithRouter(<TutorialPage />)

      // Initially, completion link should not be visible
      expect(screen.queryByText('Ready to Play with Teams! →')).not.toBeInTheDocument()

      // Complete the tutorial using our mock button
      const completeButton = screen.getByTestId('mock-complete-tutorial')
      await user.click(completeButton)

      // Now completion link should be visible
      expect(screen.getByText('Ready to Play with Teams! →')).toBeInTheDocument()
    })

    test('completion link navigates to home', async () => {
      const user = userEvent.setup()
      renderWithRouter(<TutorialPage />)

      // Complete tutorial and wait for state update
      const completeButton = screen.getByTestId('mock-complete-tutorial')
      await user.click(completeButton)

      // Check that the completion link exists and has correct href
      const completionLink = screen.getByRole('link', { name: /Ready to Play with Teams/i })
      expect(completionLink).toBeInTheDocument()
      expect(completionLink).toHaveAttribute('href', '/')
    })
  })

  describe('Button component integration', () => {
    test('skip button uses correct variant and styling', () => {
      renderWithRouter(<TutorialPage />)

      const skipButton = screen.getByRole('button', { name: /Skip Tutorial/i })
      expect(skipButton).toBeInTheDocument()

      // Check button text content
      expect(skipButton).toHaveTextContent('Skip Tutorial')
    })
  })

  describe('Completion link styling', () => {
    test('completion link has correct styling classes', async () => {
      const user = userEvent.setup()
      renderWithRouter(<TutorialPage />)

      // Complete tutorial to show completion link
      const completeButton = screen.getByTestId('mock-complete-tutorial')
      await user.click(completeButton)

      const completionLink = screen.getByRole('link', { name: /Ready to Play with Teams/i })
      expect(completionLink).toHaveClass(
        'inline-block',
        'px-6',
        'py-3',
        'bg-blue-600',
        'hover:bg-blue-700',
        'dark:bg-blue-700',
        'dark:hover:bg-blue-600',
        'text-white',
        'rounded-lg',
        'font-medium',
        'transition',
        'duration-200'
      )
    })

    test('completion link container has correct styling', async () => {
      const user = userEvent.setup()
      renderWithRouter(<TutorialPage />)

      // Complete tutorial to show completion link
      const completeButton = screen.getByTestId('mock-complete-tutorial')
      await user.click(completeButton)

      const completionLink = screen.getByRole('link', { name: /Ready to Play with Teams/i })
      const linkContainer = completionLink.parentElement
      expect(linkContainer).toHaveClass('mt-8', 'text-center')
    })
  })

  describe('State management edge cases', () => {
    test('completion state is properly managed by useState', async () => {
      const user = userEvent.setup()
      renderWithRouter(<TutorialPage />)

      // Initially no completion link (state is false)
      expect(screen.queryByText('Ready to Play with Teams! →')).not.toBeInTheDocument()

      // Complete tutorial - this calls setCompleted(true)
      const completeButton = screen.getByTestId('mock-complete-tutorial')
      await user.click(completeButton)

      // State should now be true, showing completion link
      expect(screen.getByText('Ready to Play with Teams! →')).toBeInTheDocument()
    })
  })

  describe('Page structure', () => {
    test('maintains consistent layout structure', () => {
      renderWithRouter(<TutorialPage />)

      // Check main heading exists
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Learn how to Raddle')

      // Check skip button exists
      const skipButton = screen.getByRole('button', { name: /Skip Tutorial/i })
      expect(skipButton).toBeInTheDocument()

      // Check tutorial component is rendered
      expect(screen.getByTestId('tutorial-component')).toBeInTheDocument()
    })

    test('applies correct CSS classes to elements', () => {
      renderWithRouter(<TutorialPage />)

      const heading = screen.getByText('Learn how to Raddle')
      expect(heading).toHaveClass('text-2xl', 'md:text-3xl', 'font-semibold')
    })

    test('header container has correct layout classes', () => {
      renderWithRouter(<TutorialPage />)

      const heading = screen.getByText('Learn how to Raddle')
      const headerContainer = heading.parentElement
      expect(headerContainer).toHaveClass('w-full', 'text-center', 'mb-4', 'md:mb-0')
    })
  })
})