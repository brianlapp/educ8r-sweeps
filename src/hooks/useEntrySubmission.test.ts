
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEntrySubmission } from './useEntrySubmission';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/use-analytics';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(),
}));

vi.mock('@/hooks/use-analytics', () => ({
  useAnalytics: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('useEntrySubmission', () => {
  const mockToast = { toast: vi.fn() };
  const mockAnalytics = { 
    trackEvent: vi.fn(),
    trackFormSubmission: vi.fn()
  };
  const mockNavigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    (useToast as any).mockReturnValue(mockToast);
    (useAnalytics as any).mockReturnValue(mockAnalytics);
    (useNavigate as any).mockReturnValue(mockNavigate);
    
    // Mock localStorage
    vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(Storage.prototype, 'getItem');
    
    // Reset supabase mock
    (supabase.functions.invoke as any).mockReset();
  });
  
  it('should handle successful form submission', async () => {
    // Mock successful response from Supabase function
    const mockReferralCode = 'TEST123';
    (supabase.functions.invoke as any).mockResolvedValue({
      data: {
        success: true,
        data: { referral_code: mockReferralCode, id: '123' },
        isExisting: false,
        message: 'Success'
      }
    });
    
    // Render the hook
    const { result } = renderHook(() => useEntrySubmission('REF789', 'campaign-123'));
    
    // Submit form
    await act(async () => {
      const submissionResult = await result.current.submitEntry({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      }, true);
      
      expect(submissionResult).toBe(true);
    });
    
    // Verify Supabase function was called with correct parameters
    expect(supabase.functions.invoke).toHaveBeenCalledWith('submit-entry', {
      body: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        referredBy: 'REF789',
        campaignId: 'campaign-123'
      }
    });
    
    // Verify localStorage was updated
    expect(localStorage.setItem).toHaveBeenCalledWith('referralCode', mockReferralCode);
    expect(localStorage.setItem).toHaveBeenCalledWith('isReturningUser', 'false');
    
    // Verify navigation happened
    expect(mockNavigate).toHaveBeenCalledWith('/thank-you');
    
    // Verify analytics were tracked
    expect(mockAnalytics.trackFormSubmission).toHaveBeenCalledWith('entry_form', true);
  });
  
  it('should handle form submission without agreeing to terms', async () => {
    // Render the hook
    const { result } = renderHook(() => useEntrySubmission(null, undefined));
    
    // Submit form without agreeing to terms
    await act(async () => {
      const submissionResult = await result.current.submitEntry({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com'
      }, false);
      
      expect(submissionResult).toBe(false);
    });
    
    // Verify error toast was shown
    expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Terms & Conditions",
      variant: "destructive"
    }));
    
    // Verify Supabase function was NOT called
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
  
  it('should handle API errors', async () => {
    // Mock error response from Supabase function
    (supabase.functions.invoke as any).mockRejectedValue(new Error('API Error'));
    
    // Render the hook
    const { result } = renderHook(() => useEntrySubmission(null, undefined));
    
    // Submit form
    await act(async () => {
      const submissionResult = await result.current.submitEntry({
        firstName: 'Error',
        lastName: 'Test',
        email: 'error@example.com'
      }, true);
      
      expect(submissionResult).toBe(false);
    });
    
    // Verify error toast was shown
    expect(mockToast.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Error",
      variant: "destructive"
    }));
    
    // Verify analytics tracked the error
    expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('form_submission_error', expect.any(Object));
  });
});
