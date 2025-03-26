
# Product Requirements Document

## Project Overview
The Email Migration Tool provides a seamless way to migrate email subscribers from OnGage to BeehiiV. The tool manages the complexities of API rate limiting, error recovery, and provides a user-friendly interface for monitoring migration progress.

## Core Features

### Subscriber Import
- Support for CSV and JSON import formats
- Data validation and error handling
- Duplicate detection

### Manual Migration
- Manual migration of subscriber batches
- Configuration of batch size
- Visual progress tracking

### Troubleshooting
- Tools to identify and fix failed migrations
- Ability to reset stalled records
- Detailed error reporting

### Client-Side Automation
- Scheduled migration processing
- Configuration of operating hours
- Configuration of daily target and batch sizes

### Server-Side Automation
- Continuous background processing regardless of browser state
- Heartbeat monitoring to verify automation is running
- Automatic stalled record detection and recovery
- Smart rate limiting handling with exponential backoff
- Configurable batch size and processing intervals

## User Experience
- Clear visual indicators of migration progress
- Real-time status updates
- Intuitive controls for starting/stopping automation
- Comprehensive dashboard for monitoring all aspects of the migration

## Technical Requirements
- Integration with BeehiiV API
- Integration with Supabase Edge Functions
- Responsive design for all screen sizes
- Error resilience and recovery mechanisms
