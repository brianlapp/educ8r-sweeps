
# Email Migration Technical Decisions

## Architecture Decisions

### Decision: Use Existing Application vs. New Application
**Context:** We need to migrate 200k subscribers from OnGage to BeehiiV but have limited Supabase projects available.

**Decision:** Implement migration functionality within existing sweepstakes application.

**Reasoning:**
- The existing application already has BeehiiV API integration
- Creating a new Supabase project would require an upgraded plan
- We can isolate the migration code to avoid disrupting existing functionality
- Once migration is complete, we can easily remove the migration-specific components

### Decision: Use Batch Processing with Daily Limits
**Context:** BeehiiV may have rate limits or performance concerns with bulk imports.

**Decision:** Process 1,000 subscribers per day over approximately 30 days.

**Reasoning:**
- Avoids potential API rate limits or timeouts
- Distributes load on both Supabase and BeehiiV systems
- Allows for better monitoring and issue resolution
- Maintains normal operation of sweepstakes during migration

### Decision: Implement Automated Natural Migration Pattern
**Context:** Batch migrations might appear artificial and set off alarms.

**Decision:** Add randomized timing and batch sizes within configurable time windows.

**Reasoning:**
- Creates a more natural, organic-looking subscription pattern
- Varies batch sizes to mimic real user behavior
- Restricts migrations to business hours for realistic patterns
- Provides flexibility in controlling migration speed while appearing natural

### Decision: Prevent Duplicate Welcome Emails
**Context:** Subscribers being migrated have already received welcome emails via OnGage.

**Decision:** Set specific flags in the BeehiiV API request to prevent welcome emails.

**Reasoning:**
- BeehiiV's API allows configuration to prevent welcome emails
- We can use the existing `reactivate` parameter and potentially other flags
- Ensures consistent user experience during migration
- Prevents confusion from receiving duplicate welcome messages

### Decision: Separate Migration Table
**Context:** Need to track migration progress without affecting existing data structures.

**Decision:** Create a dedicated migration table for tracking the process.

**Reasoning:**
- Isolates migration data from core application data
- Provides clear audit trail of the migration process
- Can be easily cleaned up after migration completes
- Allows for restart/resume capability if process is interrupted

### Decision: Leverage Existing BeehiiV Integration Code
**Context:** The application already contains code to interact with BeehiiV.

**Decision:** Extend existing BeehiiV utility functions for migration purposes.

**Reasoning:**
- Reuses proven code that works with the BeehiiV API
- Maintains consistent approach to BeehiiV interactions
- Reduces risk of introducing new API integration bugs
- Can be enhanced with specific migration requirements while preserving core functionality
