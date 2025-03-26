
# Email Migration System Architecture

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: PostgreSQL (Supabase)
- **External APIs**: BeehiiV API
- **Scheduling**: pg_cron for automated processing

## System Components

### Database
- **Tables**:
  - `email_migration`: Stores subscriber data and tracks migration status
  - `email_migration_automation`: Stores automation settings and heartbeat
  - `email_migration_logs`: Records detailed logs for troubleshooting
  - `email_migration_stats`: Tracks overall statistics

### Edge Functions
- **email-migration**: Multi-purpose function handling various migration operations:
  - Import subscribers
  - Process migration batches
  - Get migration statistics
  - Toggle and configure automation
- **server-automation**: Handles continuous background processing:
  - Provides heartbeat mechanism
  - Processes batches continuously
  - Detects and resets stalled records
  - Runs independently of browser sessions

### Admin Interface
- **Pages**:
  - Email Migration Dashboard: Shows overall progress
  - Import Tool: Handles subscriber data import
  - Batch Control: Manual migration processing
  - Automation Settings: Configure server-side automation
  - Troubleshooting: Tools to address migration issues

## Data Flow
1. **Import Flow**:
   - Admin uploads OnGage export → Edge Function processes data → Subscriber records created in `email_migration` table

2. **Migration Flow**:
   - Edge Function selects batch → Process subscribers through BeehiiV API → Update status in database → Repeat until complete

3. **Automation Flow**:
   - Server-side job checks for pending subscribers → Processes batches → Handles rate limits → Updates database → Automatic heartbeat → Repeats on schedule

## Integration Points
- **BeehiiV API**: Create subscribers, add tags, and verify existing subscribers
- **Admin UI**: Dashboard and controls for monitoring and management
- **Cron Job**: Scheduled tasks for continuous processing

## Background Processing
- **Edge Runtime Waitlist**: For long-running tasks without timeouts
- **pg_cron**: Scheduled jobs that run independent of browser sessions
- **Heartbeat System**: Tracks automation health and detects stalls
