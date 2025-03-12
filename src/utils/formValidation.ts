
// Common disposable email domains to check against
export const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'sharklasers.com',
  'yopmail.com',
  'trashmail.com',
  'throwawaymail.com',
  'fakeinbox.com',
  'mailnesia.com',
  'getnada.com',
  'tempinbox.com',
  'dispostable.com',
  '10minutemail.com',
  'grr.la',
  'maildrop.cc',
  '33mail.com',
  'spamgourmet.com',
  'emailondeck.com',
  'mailforspam.com'
];

/**
 * Validates an email address for proper format and against disposable email domains
 * @param email The email address to validate
 * @returns An object with isValid boolean and error message if invalid
 */
export const validateEmail = (email: string): { isValid: boolean; errorMessage: string } => {
  // Basic regex check for email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      errorMessage: "Please enter a valid email address"
    };
  }

  // Check for disposable email domains
  const domain = email.split('@')[1].toLowerCase();
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    return {
      isValid: false,
      errorMessage: "Please use a non-disposable email address"
    };
  }

  // Valid email
  return {
    isValid: true,
    errorMessage: ""
  };
};
