import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import Select from '@/components/Select'

describe('Select Component', () => {
  const mockOnChange = vi.fn()
  const mockOptions = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' },
  ]

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe('Basic Rendering', () => {
    test('renders select with options', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} />)

      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()

      expect(screen.getByText('Option 1')).toBeInTheDocument()
      expect(screen.getByText('Option 2')).toBeInTheDocument()
      expect(screen.getByText('Option 3')).toBeInTheDocument()
    })

    test('renders with string value selected', () => {
      render(<Select value="2" onChange={mockOnChange} options={mockOptions} />)

      const select = screen.getByRole('combobox')
      expect(select).toHaveValue('2')
    })

    test('renders with number value selected', () => {
      const numericOptions = [
        { value: 1, label: 'One' },
        { value: 2, label: 'Two' },
        { value: 3, label: 'Three' },
      ]

      render(<Select value={2} onChange={mockOnChange} options={numericOptions} />)

      const select = screen.getByRole('combobox')
      expect(select).toHaveValue('2') // DOM value is always string
    })
  })

  describe('Label Rendering', () => {
    test('renders without label by default', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} />)

      expect(screen.queryByText(/label/i)).not.toBeInTheDocument()
    })

    test('renders with label', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} label="Choose option" />)

      expect(screen.getByText('Choose option')).toBeInTheDocument()
    })

    test('associates label with select using id', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} id="test-select" label="Choose option" />)

      const label = screen.getByText('Choose option')
      const select = screen.getByRole('combobox')

      expect(label).toHaveAttribute('for', 'test-select')
      expect(select).toHaveAttribute('id', 'test-select')
    })

    test('shows required indicator when required', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} label="Choose option" required />)

      expect(screen.getByText('*')).toBeInTheDocument()
      expect(screen.getByText('*')).toHaveClass('text-red', 'ml-1')
    })

    test('does not show required indicator when not required', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} label="Choose option" required={false} />)

      expect(screen.queryByText('*')).not.toBeInTheDocument()
    })
  })

  describe('Placeholder', () => {
    test('renders without placeholder by default', () => {
      render(<Select value="1" onChange={mockOnChange} options={mockOptions} />)

      // No placeholder option should be present
      expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument()
    })

    test('renders with placeholder', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} placeholder="Select an option" />)

      expect(screen.getByText('Select an option')).toBeInTheDocument()
    })

    test('placeholder is disabled when required', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} placeholder="Select an option" required />)

      const placeholderOption = screen.getByText('Select an option')
      expect(placeholderOption).toHaveAttribute('disabled')
    })

    test('placeholder is not disabled when not required', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} placeholder="Select an option" required={false} />)

      const placeholderOption = screen.getByText('Select an option')
      expect(placeholderOption).not.toHaveAttribute('disabled')
    })
  })

  describe('Select States', () => {
    test('handles disabled state', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} disabled />)

      const select = screen.getByRole('combobox')
      expect(select).toBeDisabled()
      expect(select).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed', 'disabled:hover:border-border-light')
    })

    test('handles required state', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} required />)

      const select = screen.getByRole('combobox')
      expect(select).toBeRequired()
    })
  })

  describe('Change Handling', () => {
    test('calls onChange with string value when option is selected', async () => {
      const user = userEvent.setup()
      render(<Select value="" onChange={mockOnChange} options={mockOptions} />)

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '2')

      expect(mockOnChange).toHaveBeenCalledWith('2')
    })

    test('calls onChange with number value when original value was number', async () => {
      const user = userEvent.setup()
      const numericOptions = [
        { value: 1, label: 'One' },
        { value: 2, label: 'Two' },
        { value: 3, label: 'Three' },
      ]

      render(<Select value={1} onChange={mockOnChange} options={numericOptions} />)

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '2')

      expect(mockOnChange).toHaveBeenCalledWith(2) // Should be parsed as number
    })

    test('calls onChange with string value when original value was string', async () => {
      const user = userEvent.setup()
      render(<Select value="1" onChange={mockOnChange} options={mockOptions} />)

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '2')

      expect(mockOnChange).toHaveBeenCalledWith('2') // Should remain as string
    })

    test('handles non-numeric string values correctly', async () => {
      const user = userEvent.setup()
      const stringOptions = [
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana' },
        { value: 'cherry', label: 'Cherry' },
      ]

      render(<Select value="apple" onChange={mockOnChange} options={stringOptions} />)

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'banana')

      expect(mockOnChange).toHaveBeenCalledWith('banana')
    })

    test('handles mixed numeric/string options', async () => {
      const user = userEvent.setup()
      const mixedOptions = [
        { value: 1, label: 'Number One' },
        { value: 'two', label: 'String Two' },
        { value: 3, label: 'Number Three' },
      ]

      render(<Select value={1} onChange={mockOnChange} options={mixedOptions} />)

      const select = screen.getByRole('combobox')

      // Select numeric value
      await user.selectOptions(select, '3')
      expect(mockOnChange).toHaveBeenCalledWith(3)

      // Select string value
      await user.selectOptions(select, 'two')
      expect(mockOnChange).toHaveBeenCalledWith('two')
    })
  })

  describe('Styling and Classes', () => {
    test('applies base select classes', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} />)

      const select = screen.getByRole('combobox')
      expect(select).toHaveClass(
        'px-2',
        'py-1',
        'border',
        'border-border-light',
        'bg-secondary',
        'text-tx-primary',
        'rounded',
        'text-xs',
        'cursor-pointer',
        'transition-all',
        'duration-200',
        'hover:border-accent',
        'focus:duration-1',
        'focus:outline-none',
        'focus:border-accent',
        'focus:ring-1',
        'focus:ring-accent'
      )
    })

    test('applies custom className', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} className="custom-class" />)

      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('custom-class')
      expect(select).toHaveClass('px-2', 'py-1', 'border') // Base classes should still be present
    })

    test('applies disabled classes when disabled', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} disabled />)

      const select = screen.getByRole('combobox')
      expect(select).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed', 'disabled:hover:border-border-light')
    })
  })

  describe('Test ID Support', () => {
    test('applies data-testid when provided', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} data-testid="test-select" />)

      expect(screen.getByTestId('test-select')).toBeInTheDocument()
    })

    test('works without data-testid', () => {
      render(<Select value="" onChange={mockOnChange} options={mockOptions} />)

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('Options Rendering', () => {
    test('renders all provided options', () => {
      const manyOptions = [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
        { value: 'c', label: 'Gamma' },
      ]

      render(<Select value="" onChange={mockOnChange} options={manyOptions} />)

      expect(screen.getByText('Alpha')).toBeInTheDocument()
      expect(screen.getByText('Beta')).toBeInTheDocument()
      expect(screen.getByText('Gamma')).toBeInTheDocument()
    })
  })

  describe('Complex Scenarios', () => {
    test('handles combined props correctly', () => {
      render(
        <Select
          id="complex-select"
          value="2"
          onChange={mockOnChange}
          options={mockOptions}
          placeholder="Choose one"
          label="Selection"
          required
          disabled
          className="custom-select"
          data-testid="complex-select"
        />
      )

      const select = screen.getByTestId('complex-select')
      expect(select).toBeInTheDocument()
      expect(select).toHaveValue('2')
      expect(select).toBeRequired()
      expect(select).toBeDisabled()
      expect(select).toHaveClass('custom-select')

      expect(screen.getByText('Selection')).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument()
      expect(screen.getByText('Choose one')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('is keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<Select value="" onChange={mockOnChange} options={mockOptions} />)

      const select = screen.getByRole('combobox')
      await user.tab()
      expect(select).toHaveFocus()
    })
  })

  describe('Edge Cases', () => {
    test('handles options with special characters', async () => {
      const specialOptions = [
        { value: '!@#', label: 'Special !@#' },
        { value: '<>&', label: 'HTML <>&' },
        { value: '""\'', label: 'Quotes ""\\' },
      ]

      const user = userEvent.setup()
      render(<Select value="" onChange={mockOnChange} options={specialOptions} />)

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '!@#')

      expect(mockOnChange).toHaveBeenCalledWith('!@#')
    })

    test('handles very long option labels', () => {
      const longLabelOptions = [
        { value: '1', label: 'A'.repeat(100) },
        { value: '2', label: 'B'.repeat(50) },
      ]

      render(<Select value="" onChange={mockOnChange} options={longLabelOptions} />)

      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument()
      expect(screen.getByText('B'.repeat(50))).toBeInTheDocument()
    })

    test('handles numeric zero values correctly', async () => {
      const zeroOptions = [
        { value: 0, label: 'Zero' },
        { value: 1, label: 'One' },
      ]

      const user = userEvent.setup()
      render(<Select value={1} onChange={mockOnChange} options={zeroOptions} />)

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '0')

      expect(mockOnChange).toHaveBeenCalledWith(0)
    })
  })
})