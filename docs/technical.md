
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

### Repository File Handling

#### HTTP-Based File Access
- Files are accessed via HTTP requests rather than direct filesystem access
- Supports both local development and production environments
- Uses the host's URL to dynamically determine file locations
- Works with both relative and absolute URL paths

#### Repository File Detection
- Probes for files based on common naming patterns
- Supports automatic discovery of CSV and JSON files
- Handles file detection through HEAD requests to minimize bandwidth
- Provides detailed error reporting for troubleshooting

#### Alternative Import Methods
- **Direct Import**: Specify a filename without requiring repository detection
- **URL Import**: Use a full URL to access files that may not be in the repository
- **File Upload**: Directly upload files from a local machine

#### File Processing
- Supports both CSV and JSON formats
- Automatically normalizes field names (e.g., "Email" → "email")
- Handles various common export formats from email providers
- Validates emails and skips invalid records

### Database Schema Extensions
- Added `source_file` TEXT field to `email_migration` table for tracking file origin
- Added `import_date` timestamp to `email_migration` table for import timing
- Added `last_heartbeat` timestamp to `email_migration_automation` table
- Added `status_details` JSONB field for detailed status reporting
- Added `current_batch_id` for tracking active processing batch

### UI Enhancements
- Real-time import progress tracking with progress bar
- Detailed operation status messaging
- Improved error handling and reporting
- Retry mechanisms for failed imports
- Repository file refresh button
- Direct import validation with pre-checks

### Error Handling and Logging
- Comprehensive database logging system
- Detailed error capture and reporting
- Multiple retry attempts for transient failures
- Validation before import attempts
- Clear user feedback for all operations

### Scheduled Jobs
- Cron job to ensure server-automation runs consistently
- Automatic cleanup of stalled migration records

### Import Process Database Function
- `import_subscribers` database function for efficient, transactional imports
- Handles duplicate detection
- Provides detailed import statistics
- Supports different input formats and field normalizations
