
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubmitButton } from './SubmitButton';
import { useAnalytics } from '@/hooks/use-analytics';

// Mock the useAnalytics hook
vi.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackButtonClick: vi.fn(),
  }),
}));

describe('SubmitButton', () => {
  it('renders with correct text when not submitting', () => {
    render(<SubmitButton isSubmitting={false} />);
    
    expect(screen.getByText('Enter Now for FREE!')).toBeInTheDocument();
  });
  
  it('renders with loading text when submitting', () => {
    render(<SubmitButton isSubmitting={true} />);
    
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });
  
  it('is disabled when submitting', () => {
    render(<SubmitButton isSubmitting={true} />);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });
  
  it('calls onClick handler when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    
    render(<SubmitButton isSubmitting={false} onClick={onClick} />);
    
    await user.click(screen.getByRole('button'));
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });
  
  it('tracks button click in analytics', async () => {
    const mockAnalytics = useAnalytics();
    const onClick = vi.fn();
    const user = userEvent.setup();
    
    render(<SubmitButton isSubmitting={false} onClick={onClick} />);
    
    await user.click(screen.getByRole('button'));
    
    expect(mockAnalytics.trackButtonClick).toHaveBeenCalledWith('entry_submit_button');
  });
});
