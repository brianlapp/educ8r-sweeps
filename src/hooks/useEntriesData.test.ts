
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEntriesData } from './useEntriesData';
import { createClient } from '@supabase/supabase-js';

// Mock the Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

// Mock data
const mockEntries = [
  { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
  { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
];

describe('useEntriesData', () => {
  beforeEach(() => {
    // Setup mock implementation for Supabase client
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          data: mockEntries,
          error: null,
        }),
      }),
    });
    
    (createClient as any).mockReturnValue({
      from: mockFrom,
    });
  });
  
  it('fetches entries data', async () => {
    const { result } = renderHook(() => useEntriesData());
    
    await waitFor(() => {
      expect(result.current.entries).toEqual(mockEntries);
      expect(result.current.isLoading).toBe(false);
    });
  });
  
  // Add more tests for error cases, filtering, etc.
});
