
# Email Migration Technical Documentation

## Key Dependencies
- **@supabase/supabase-js**: Database and Edge Function interaction
- **shadcn/ui**: UI component library 
- **Tailwind CSS**: Styling framework
- **React**: Frontend framework
- **TypeScript**: Type-safe programming language

## API Integration Details

### BeehiiV API
- **Base URL**: `https://api.beehiiv.com/v2`
- **Required Headers**:
  - `Authorization: Bearer <API_KEY>`
  - `Content-Type: application/json`
- **Rate Limits**:
  - 5,000 subscribers per day maximum
  - Recommended batch size: 10-100 subscribers

### Critical Implementation Notes
- **Custom Fields Format**: Must be array of objects with name/value pairs
  ```javascript
  custom_fields: [
    { name: 'first_name', value: 'John' },
    { name: 'last_name', value: 'Doe' }
  ]
  ```
- **Preventing Welcome Emails**: Use `suppress_welcome: true` in API requests
- **Required Tags**: 'comprendi' and 'sweeps' for all subscribers

## Database Schema

### email_migration Table
```sql
CREATE TABLE email_migration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  migration_batch TEXT,
  error TEXT,
  error_message TEXT,
  subscriber_id TEXT,
  migrated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### email_migration_automation Table
```sql
CREATE TABLE email_migration_automation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  daily_total_target INTEGER NOT NULL DEFAULT 1000,
  start_hour INTEGER NOT NULL DEFAULT 9,
  end_hour INTEGER NOT NULL DEFAULT 17,
  min_batch_size INTEGER NOT NULL DEFAULT 10,
  max_batch_size INTEGER NOT NULL DEFAULT 100,
  last_automated_run TIMESTAMP WITH TIME ZONE,
  publication_id TEXT,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  status_details JSONB DEFAULT '{}'::jsonb,
  current_batch_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Server-Side Automation

### Heartbeat System
- Records a timestamp with each batch processing
- Provides visibility into automation status even when admin UI is closed
- Allows detection of stalled processing

### Stalled Record Recovery
- Detects records stuck in "in_progress" state for >30 minutes
- Automatically resets them to "pending" for reprocessing
- Prevents migration from being blocked by stuck records

### Continuous Processing
- Uses pg_cron for scheduled execution every 5 minutes
- Runs in background independent of browser sessions
- Respects configured operating hours (start_hour to end_hour)

## Error Handling Strategy
- Detailed error logging with context
- Categorization of errors (API, validation, server)
- Automatic retry for transient failures
- Manual intervention for persistent issues

## Key Functions
- `get_status_counts()`: Returns counts and percentages by status
- `get_migration_batches()`: Returns batch information with success rates
- `resetStalledRecords()`: Detects and resets stuck records
