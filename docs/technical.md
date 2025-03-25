
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

## Key Functions
- `get_status_counts()`: Returns counts and percentages by status
- `get_migration_batches()`: Returns batch information with success rates

## Error Handling Strategy
- Detailed error logging with context
- Categorization of errors (API, validation, server)
- Automatic retry for transient failures
- Manual intervention for persistent issues
