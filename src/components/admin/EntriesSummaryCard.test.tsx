
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntriesSummaryCard } from './EntriesSummaryCard';

// Mock the ManualSyncButton component
vi.mock('@/components/ManualSyncButton', () => ({
  ManualSyncButton: () => <button>Sync</button>,
}));

describe('EntriesSummaryCard', () => {
  it('renders with correct entries count', () => {
    render(<EntriesSummaryCard entriesCount={42} />);
    
    expect(screen.getByText('User Entries')).toBeInTheDocument();
    expect(screen.getByText('Total entries: 42')).toBeInTheDocument();
  });
  
  it('includes the sync button', () => {
    render(<EntriesSummaryCard entriesCount={0} />);
    
    expect(screen.getByText('Sync')).toBeInTheDocument();
  });
});
