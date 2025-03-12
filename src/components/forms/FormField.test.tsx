
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormField } from './FormField';

describe('FormField', () => {
  it('renders input with correct props', () => {
    const onChange = vi.fn();
    
    render(
      <FormField
        type="text"
        placeholder="Test placeholder"
        value="Test value"
        onChange={onChange}
        required={true}
      />
    );
    
    const input = screen.getByPlaceholderText('Test placeholder');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Test value');
    expect(input).toBeRequired();
  });
  
  it('shows error message when provided', () => {
    render(
      <FormField
        type="text"
        placeholder="Test"
        value=""
        onChange={() => {}}
        error="This field is required"
      />
    );
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });
  
  it('calls onChange when input changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    
    render(
      <FormField
        type="text"
        placeholder="Test"
        value=""
        onChange={onChange}
      />
    );
    
    const input = screen.getByPlaceholderText('Test');
    await user.type(input, 'Hello');
    
    expect(onChange).toHaveBeenCalledTimes(5); // Once for each character
  });
});
