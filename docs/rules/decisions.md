
# Email Migration Technical Decisions

## Core Architecture Decisions

### Decision: Use Existing Application vs. New Application
**Context:** We need to migrate subscribers from OnGage to BeehiiV but have limited Supabase projects available.

**Decision:** Implement migration functionality within existing sweepstakes application.

**Reasoning:**
- The existing application already has BeehiiV API integration
- Creating a new Supabase project would require an upgraded plan
- We can isolate the migration code to avoid disrupting existing functionality
- Once migration is complete, we can easily remove the migration-specific components

### Decision: Use Batch Processing with Daily Limits
**Context:** BeehiiV may have rate limits or performance concerns with bulk imports.

**Decision:** Process up to 1,000 subscribers per day over approximately 30 days.

**Reasoning:**
- Avoids potential API rate limits or timeouts
- Distributes load on both Supabase and BeehiiV systems
- Allows for better monitoring and issue resolution
- Maintains normal operation of sweepstakes during migration

### Decision: Server-Side Automation
**Context:** Client-side automation stops when the admin page is refreshed or closed.

**Decision:** Move automation entirely to server-side Edge Functions.

**Reasoning:**
- Provides continuous processing regardless of client connection
- Ensures migration continues even when admin users are offline
- More reliable for long-running operations
- Better handles rate limiting and retry logic

### Decision: Prevent Duplicate Welcome Emails
**Context:** Subscribers being migrated have already received welcome emails via OnGage.

**Decision:** Set specific flags in the BeehiiV API request to prevent welcome emails.

**Reasoning:**
- BeehiiV's API allows configuration to prevent welcome emails
- We can use the existing parameters to control email sending
- Ensures consistent user experience during migration
- Prevents confusion from receiving duplicate welcome messages
