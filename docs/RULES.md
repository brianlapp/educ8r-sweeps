
# Email Migration System Rules

## Core Principles

1. **Separation of Concerns**: The email migration system must remain completely separate from the sweepstakes application functionality.

2. **No Cross-Impact**: Changes to the email migration system should never affect the sweepstakes engine or admin features in any way.

3. **Safe Rate Limits**: Always respect BeehiiV's API limits by keeping migrations between 1,000-5,000 subscribers per day maximum to avoid account security locks.

## Development Guidelines

### Code Structure

1. All email migration functionality should be isolated to:
   - `/supabase/functions/email-migration/`
   - `/src/components/admin/EmailMigration*.tsx`
   - `email_migration*` database tables

2. Do not modify any existing sweepstakes functionality, including:
   - Entry submission
   - Referral tracking
   - Campaign management
   - User authentication

### Database

1. Keep all email migration tables separate from sweepstakes tables.
2. Prefix all email migration tables with `email_migration_`.
3. Never join email migration tables with sweepstakes tables in queries.

### API Usage

1. BeehiiV API rate limits:
   - Maximum 5,000 subscribers per day
   - Add appropriate delays between requests (300ms minimum)
   - Implement exponential backoff when rate limited
   - Always check for 429 status codes and respect "Retry-After" headers

2. Database usage:
   - Use batch operations whenever possible
   - Add proper indexing for frequently queried columns
   - Implement proper error handling for all database operations

### Testing

1. Always test email migration changes in isolation before deploying to production.
2. Verify that sweepstakes functionality remains unaffected after any email migration system changes.
3. Use small test batches (10-50 subscribers) before processing larger batches.

## Error Handling

1. Log all errors to both console and database for debugging.
2. Implement proper retry mechanisms for transient failures.
3. Ensure failed operations can be easily reset for retry.
4. Monitor for unusual patterns that might indicate security concerns.

## Security

1. Protect all API keys and credentials.
2. Never expose sensitive information in logs or UI.
3. Respect user privacy by handling PII appropriately.
4. Follow BeehiiV's terms of service for API usage.
