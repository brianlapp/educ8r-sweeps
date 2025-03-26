
# Technical Documentation

## Email Migration System

### Core Components

#### Frontend
- `EmailMigrationStatusCard` - Displays current migration statistics
- `EmailMigrationImport` - Handles subscriber CSV/JSON import
- `EmailMigrationControls` - Provides troubleshooting tools
- `EmailMigrationBatchControl` - Manages manual batch migration
- `EmailMigrationAutomation` - Controls server-side automation

#### Backend
- `email-migration` Edge Function - Handles import, stats, and migration control
- `server-automation` Edge Function - Manages continuous background processing
- PostgreSQL Tables - Store subscriber data and migration state

### Server-Side Automation

#### Implementation Details
- **Continuous Processing**: Runs independently of browser state
- **Heartbeat Mechanism**: Updates timestamp to confirm automation is running
- **Status Reporting**: JSON status details stored in database
- **Rate Limit Handling**: Smart backoff when API limits encountered
- **Stalled Record Recovery**: Automatic reset of records stuck for >30 minutes

#### Configuration Options
- Enable/disable automation
- Configure batch size range
- Set daily target limits
- Define operating hours

### Database Schema Extensions
- Added `last_heartbeat` timestamp to `email_migration_automation` table
- Added `status_details` JSONB field for detailed status reporting
- Added `current_batch_id` for tracking active processing batch
- Created `email_migration_logs` table for detailed debugging and monitoring

### UI Enhancements
- Real-time heartbeat status display with color coding
- Pulsing heart icon to indicate active automation
- Progress tracking for current batch processing
- Human-readable timestamps for better monitoring

### Scheduled Jobs
- Cron job to ensure server-automation runs consistently
- Automatic cleanup of stalled migration records

### Error Handling
- Comprehensive error reporting in UI
- Automatic retry mechanism for failed migrations
- Rate limiting detection and handling

### Data Import Process
- CSV and JSON file imports supported
- Direct file import implementation
- File parsing with proper JSONB array format handling
- Data validation before database insertion

### Known Issues & Solutions
- JSON Parsing: Import function requires subscribers data as a proper array of objects, not a stringified array
- Database Function: The `import_subscribers` function expects a JSONB array, not a string
- Testing Utilities: Added test functions for data format verification

### Logging System
- Detailed contextual logging with timestamp tracking
- Error state identification and reporting
- Performance metrics collection
- Batch processing analytics
