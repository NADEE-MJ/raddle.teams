import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import Modal from '@/components/Modal'

// Mock LoadingSpinner since it's imported
vi.mock('@/components/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>
}))

describe('Modal Component', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    // Reset body overflow style before each test
    document.body.style.overflow = ''
    // Clear any existing event listeners
    document.removeEventListener('keydown', vi.fn())
  })

  describe('Basic Rendering', () => {
    test('renders nothing when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      )

      expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
    })

    test('renders modal content when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Modal content</div>
        </Modal>
      )

      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })

    test('renders with default maxWidth', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      const modalContainer = document.querySelector('.max-w-4xl')
      expect(modalContainer).toBeInTheDocument()
    })

    test('renders with custom maxWidth', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} maxWidth="max-w-sm">
          <div>Content</div>
        </Modal>
      )

      const modalContainer = document.querySelector('.max-w-sm')
      expect(modalContainer).toBeInTheDocument()
      expect(document.querySelector('.max-w-4xl')).not.toBeInTheDocument()
    })
  })

  describe('Close Button', () => {
    test('renders close button', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      expect(screen.getByTestId('modal-close-button')).toBeInTheDocument()
    })

    test('close button has correct styling', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      const closeButton = screen.getByTestId('modal-close-button')
      expect(closeButton).toHaveClass('text-tx-muted', 'hover:text-tx-primary', 'hover:bg-elevated', 'rounded-full', 'p-2')
    })

    test('close button contains SVG icon', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('h-4', 'w-4')
    })

    test('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      await user.click(screen.getByTestId('modal-close-button'))

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading State', () => {
    test('shows LoadingSpinner when isLoading is true', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} isLoading={true}>
          <div>Content</div>
        </Modal>
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.queryByText('Content')).not.toBeInTheDocument()
    })

    test('shows children when isLoading is false', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose} isLoading={false}>
          <div>Content</div>
        </Modal>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    })

    test('shows children by default (isLoading defaults to false)', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
    })
  })

  describe('Keyboard Interactions', () => {
    test('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup()
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      await user.keyboard('{Escape}')

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    test('does not call onClose for other keys', async () => {
      const user = userEvent.setup()
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      await user.keyboard('{Enter}')
      await user.keyboard(' ')
      await user.keyboard('a')

      expect(mockOnClose).not.toHaveBeenCalled()
    })

    test('removes event listener when modal closes', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const { rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      rerender(
        <Modal isOpen={false} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    test('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Body Overflow Management', () => {
    test('sets body overflow to hidden when modal opens', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      expect(document.body.style.overflow).toBe('hidden')
    })

    test('restores body overflow when modal closes', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      expect(document.body.style.overflow).toBe('hidden')

      rerender(
        <Modal isOpen={false} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      expect(document.body.style.overflow).toBe('')
    })

    test('restores body overflow on unmount', () => {
      const { unmount } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      expect(document.body.style.overflow).toBe('hidden')

      unmount()

      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('Click Outside to Close', () => {
    test('calls onClose when clicking on backdrop', async () => {
      const user = userEvent.setup()
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      // Click on the backdrop (the outer container)
      const backdrop = document.querySelector('.pointer-events-auto.fixed.inset-0')
      expect(backdrop).toBeInTheDocument()

      await user.click(backdrop!)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    test('does not call onClose when clicking on modal content', async () => {
      const user = userEvent.setup()
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      await user.click(screen.getByText('Content'))

      expect(mockOnClose).not.toHaveBeenCalled()
    })

    test('event propagation is stopped for content clicks', async () => {
      const parentClickHandler = vi.fn()
      const user = userEvent.setup()

      render(
        <div onClick={parentClickHandler}>
          <Modal isOpen={true} onClose={mockOnClose}>
            <div>Content</div>
          </Modal>
        </div>
      )

      // Click on the modal content area (not the backdrop)
      await user.click(screen.getByText('Content'))

      // Parent click handler should not be called due to stopPropagation
      expect(parentClickHandler).not.toHaveBeenCalled()
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Modal Structure and Styling', () => {
    test('has correct modal structure and classes', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      // Outer container
      const outerContainer = document.querySelector('.pointer-events-auto.fixed.inset-0.z-999')
      expect(outerContainer).toBeInTheDocument()
      expect(outerContainer).toHaveClass('flex', 'items-center', 'justify-center', 'md:items-start', 'md:pt-24')

      // Backdrop
      const backdrop = document.querySelector('.pointer-events-none.absolute.inset-0.backdrop-blur-sm')
      expect(backdrop).toBeInTheDocument()

      // Modal content container
      const modalContent = document.querySelector('.relative.w-full.bg-secondary.border-border.pointer-events-auto')
      expect(modalContent).toBeInTheDocument()
      expect(modalContent).toHaveClass('max-h-[90vh]', 'overflow-auto', 'rounded-lg', 'border', 'shadow-xl')
    })

    test('modal is properly positioned and styled', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      const modalContent = document.querySelector('.relative.w-full')
      expect(modalContent).toHaveClass('bg-secondary', 'border-border', 'max-h-[90vh]', 'overflow-auto', 'rounded-lg', 'border', 'shadow-xl')
    })
  })

  describe('Complex Children', () => {
    test('renders complex children correctly', () => {
      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>
            <h1>Modal Title</h1>
            <p>Modal description</p>
            <button>Action Button</button>
          </div>
        </Modal>
      )

      expect(screen.getByText('Modal Title')).toBeInTheDocument()
      expect(screen.getByText('Modal description')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument()
    })

    test('renders React components as children', () => {
      const CustomComponent = () => <div data-testid="custom-component">Custom</div>

      render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <CustomComponent />
        </Modal>
      )

      expect(screen.getByTestId('custom-component')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    test('handles rapid open/close state changes', () => {
      const { rerender } = render(
        <Modal isOpen={false} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      // Rapidly toggle state
      rerender(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      rerender(
        <Modal isOpen={false} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      rerender(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(document.body.style.overflow).toBe('hidden')
    })

    test('handles changing onClose callback', async () => {
      const newOnClose = vi.fn()
      const user = userEvent.setup()

      const { rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose}>
          <div>Content</div>
        </Modal>
      )

      rerender(
        <Modal isOpen={true} onClose={newOnClose}>
          <div>Content</div>
        </Modal>
      )

      await user.keyboard('{Escape}')

      expect(mockOnClose).not.toHaveBeenCalled()
      expect(newOnClose).toHaveBeenCalledTimes(1)
    })
  })
})