
/**
 * Generates a referral link with optional source_id attribution
 * 
 * @param referralCode The user's unique referral code
 * @param sourceId Optional campaign source ID for tracking
 * @returns A fully formatted referral link
 */
export function generateReferralLink(referralCode: string, sourceId?: string): string {
  // Base URL with the required parameters
  let referralLink = `https://dmlearninglab.com/homesc/?utm_source=sweeps&oid=1987&sub1=${referralCode}`;
  
  // Add source_id parameter if provided
  if (sourceId && sourceId.trim() !== '') {
    referralLink += `&source_id=${encodeURIComponent(sourceId.trim())}`;
  }
  
  return referralLink;
}
