
# Email Migration Implementation Specification

## Overview
This document outlines the detailed implementation plan for the email migration system from OnGage to BeehiiV. The system is designed to be scalable, resilient, and maintain a clear separation of concerns from the sweepstakes functionality.

## Requirements
- Migrate all subscribers from OnGage to BeehiiV
- Process in small batches to respect API rate limits
- Prevent duplicate welcome emails
- Track migration progress with detailed reporting
- Handle rate limiting and errors gracefully

## Implementation Components
1. **Database Structure**
   - `email_migration` table for subscriber data and status tracking
   - `email_migration_automation` table for automation settings
   - `email_migration_logs` table for error logging and debugging

2. **API Integration**
   - BeehiiV subscriber creation
   - Custom fields formatted as array: `[{"name": "first_name", "value": "John"}]`
   - Tag assignment for proper categorization

3. **Automation System**
   - Server-side batch processing
   - Rate limit handling with exponential backoff
   - Stalled record detection and recovery

4. **Admin Interface**
   - Migration status dashboard
   - Manual and automated controls
   - Troubleshooting tools

## Batch Processing Logic
1. Select subscribers in "pending" or stalled "in_progress" state
2. Process in configurable batch sizes (10-100 subscribers)
3. Handle API responses and rate limiting
4. Update database with results
5. Continue until daily quota reached or no more pending subscribers

## Error Handling
- Automatic retry for transient failures
- Detailed error logging
- Status tracking for each subscriber
- Detection and reset of stalled records
