
/**
 * Generates a referral link with optional source_id attribution
 * 
 * @param referralCode The user's unique referral code
 * @param sourceId Optional campaign source ID for tracking
 * @returns A fully formatted referral link or null if invalid parameters
 */
export function generateReferralLink(referralCode: string, sourceId?: string): string {
  // Validate referral code
  if (!referralCode || typeof referralCode !== 'string' || referralCode.trim() === '') {
    console.error('Invalid referral code provided to generateReferralLink:', referralCode);
    return 'https://dmlearninglab.com/homesc/?utm_source=sweeps&oid=1987';
  }
  
  // Clean the referral code to prevent URL issues
  const cleanReferralCode = encodeURIComponent(referralCode.trim());
  
  // Construct the URL with required parameters
  let referralLink = `https://dmlearninglab.com/homesc/?utm_source=sweeps&oid=1987&sub1=${cleanReferralCode}`;
  
  // Add source_id parameter if provided and valid
  if (sourceId && typeof sourceId === 'string' && sourceId.trim() !== '') {
    referralLink += `&source_id=${encodeURIComponent(sourceId.trim())}`;
  }
  
  return referralLink;
}

/**
 * Validates if a referral code meets the expected format
 * 
 * @param code The referral code to validate
 * @returns Boolean indicating if the code is valid
 */
export function isValidReferralCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  
  // Trim the code and ensure it's not empty after trimming
  const trimmedCode = code.trim();
  if (trimmedCode === '') return false;
  
  // Additional validation can be added here if needed
  // For example, checking length or format requirements
  
  return true;
}
