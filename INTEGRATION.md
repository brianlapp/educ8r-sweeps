
# Partner Integration Guide

## Overview
This guide provides step-by-step instructions for implementing the referral tracking system using Everflow SDK in your landing pages and conversion points.

## Quick Start
1. Include Everflow SDK in your landing page
2. Set up impression tracking
3. Implement click tracking
4. Configure conversion tracking
5. Test your implementation

## Detailed Implementation Steps

### 1. Including Everflow SDK
Add the following script to your HTML `<head>` section:
```html
<script src="https://get.free.ca/scripts/sdk/everflow.js" async></script>
```

### 2. Impression Tracking
Implement impression tracking when your landing page loads:

```javascript
// Initialize tracking with these required parameters
const impressionData = {
  offer_id: '1987', // Educ8r Campaign ID
  affiliate_id: 'FPS', // Free Parent Search
  sub1: window.EF.urlParameter('sub1'), // This contains the referral code
  transaction_id: generateUniqueId(), // Generate a unique transaction ID
  // Optional parameters
  sub2: window.EF.urlParameter('sub2'),
  sub3: window.EF.urlParameter('sub3'),
  sub4: window.EF.urlParameter('sub4'),
  sub5: window.EF.urlParameter('sub5'),
  source_id: window.EF.urlParameter('source_id')
};

window.EF.impression(impressionData);
```

### 3. Click Tracking
Implement click tracking when users interact with your offer:

```javascript
const clickData = {
  offer_id: '1987',
  affiliate_id: 'FPS',
  sub1: window.EF.urlParameter('sub1'),
  transaction_id: YOUR_TRANSACTION_ID, // Use the same ID from impression
  uid: window.EF.urlParameter('uid'),
  source_id: window.EF.urlParameter('source_id')
};

window.EF.click(clickData);
```

### 4. Conversion Tracking
Implement conversion tracking at your conversion point (e.g., after form submission):

```javascript
const conversionData = {
  offer_id: '1987',
  affiliate_id: 'FPS',
  transaction_id: YOUR_TRANSACTION_ID, // Use the same ID from impression/click
  sub1: window.EF.urlParameter('sub1')
};

window.EF.conversion(conversionData);
```

### 5. Required Parameters
- `offer_id`: '1987' (Educ8r Campaign ID)
- `affiliate_id`: 'FPS' (Free Parent Search)
- `sub1`: Contains the referral code (CRITICAL for referral tracking)
- `transaction_id`: Must be unique per user session and consistent across all tracking calls

### 6. Sample Implementation

Here's a complete example showing how to implement tracking:

```javascript
// When your page loads
document.addEventListener('DOMContentLoaded', async () => {
  // Generate a unique transaction ID for this session
  const transactionId = Math.random().toString(36).substring(2);
  
  // Track impression
  const impressionData = {
    offer_id: '1987',
    affiliate_id: 'FPS',
    sub1: window.EF.urlParameter('sub1'),
    transaction_id: transactionId
  };
  
  window.EF.impression(impressionData);
  
  // Track click when user interacts with offer
  document.getElementById('offerButton').addEventListener('click', () => {
    const clickData = {
      offer_id: '1987',
      affiliate_id: 'FPS',
      sub1: window.EF.urlParameter('sub1'),
      transaction_id: transactionId
    };
    
    window.EF.click(clickData);
  });
  
  // Track conversion after successful form submission
  document.getElementById('offerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Your form submission logic here
    
    // Track conversion
    const conversionData = {
      offer_id: '1987',
      affiliate_id: 'FPS',
      transaction_id: transactionId,
      sub1: window.EF.urlParameter('sub1')
    };
    
    window.EF.conversion(conversionData);
  });
});
```

## Testing Your Implementation

### Test Checklist
1. ✓ Everflow SDK loads successfully
2. ✓ Impression fires on page load
3. ✓ Click tracking works on interaction
4. ✓ Conversion tracking fires after form submission
5. ✓ All tracking calls include the required parameters
6. ✓ Transaction ID remains consistent across all tracking calls
7. ✓ Referral code (sub1) is properly passed through all tracking calls

### Debugging Tips
1. Open your browser's developer tools (F12)
2. Check the Console tab for any errors
3. Network tab will show tracking requests to Everflow
4. Verify all required parameters are present in tracking calls
5. Ensure transaction_id is consistent across all three tracking events

## Common Issues and Solutions

### SDK Not Loading
- Verify the script tag is properly placed in the `<head>`
- Check for any Content Security Policy (CSP) blocking the script
- Ensure the SDK URL is correct

### Missing Parameters
- Always check that 'oid' (1987) and referral code ('sub1') are present in URL
- Verify affiliate_id is correctly set to 'FPS'
- Ensure transaction_id is generated and stored properly

### Tracking Not Firing
- Confirm SDK is fully loaded before making tracking calls
- Check browser console for JavaScript errors
- Verify event listeners are properly attached

## Support
If you encounter any issues during implementation:
1. Review the debugging checklist above
2. Check browser console logs for errors
3. Verify all required parameters are present
4. Contact our support team with:
   - Your implementation code
   - Browser console logs
   - Network request logs
   - URL parameters used for testing
