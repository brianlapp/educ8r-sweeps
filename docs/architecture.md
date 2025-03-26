
# Architecture Documentation

## System Architecture

### Frontend Components
- React-based admin interface
- Tailwind CSS for styling
- ShadCN UI component library
- Real-time status monitoring

### Backend Services
- Supabase PostgreSQL database for subscriber storage
- Edge Functions for serverless processing
- Server-side automation for continuous background processing
- Scheduled cronjobs to ensure background automation runs reliably

### Data Flow
1. Admin imports subscribers via CSV/JSON upload
2. Subscribers are stored in the PostgreSQL database
3. Migration processing occurs via Edge Functions
4. BeehiiV API is used to create subscribers in the target system
5. Status updates are written back to the database
6. UI reflects current migration status

## Server-Side Automation Architecture

### Components
- `server-automation` Edge Function for continuous processing
- Heartbeat mechanism to track automation status
- Database tables for configuration and status tracking
- Cron job to ensure automation runs consistently

### Workflow
1. Automation is enabled/disabled via admin UI
2. Server-automation function processes batches of subscribers
3. Heartbeat updates confirm automation is running
4. UI displays current automation status
5. Processing continues even when browser is closed

### Resilience Features
- Automatic detection and reset of stalled migrations
- Exponential backoff for API rate limiting
- Configurable batch sizes and timing
- Processing outside browser context

## Database Schema

### Main Tables
- `email_migration_subscribers` - Stores subscriber data and migration status
- `email_migration_automation` - Stores automation configuration and status
- `email_migration_logs` - Stores detailed logs of migration activities

### Key Fields
- Status tracking (pending, in_progress, migrated, failed)
- Timestamps for monitoring and debugging
- Heartbeat tracking for automation health monitoring
