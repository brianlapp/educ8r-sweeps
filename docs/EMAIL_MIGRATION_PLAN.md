
# Email Migration Plan: OnGage to BeehiiV

## Overview
This document outlines our plan to safely migrate approximately 200,000 email subscribers from OnGage to BeehiiV using our existing sweepstakes application's BeehiiV API integration.

## Goals
- Migrate all subscribers from OnGage to BeehiiV without disrupting existing sweepstakes functionality
- Process migrations in small batches (1,000 per day) to avoid rate limits
- Prevent sending duplicate welcome emails to existing subscribers
- Track migration progress and provide reporting

## Implementation Strategy

### Phase 1: Setup & Preparation
1. Create a temporary migration table in the Supabase database
2. Develop an import mechanism for the OnGage export file
3. Implement BeehiiV subscriber migration Edge Function
4. Create admin controls for monitoring and managing the migration

### Phase 2: Testing & Validation
1. Test with a small subset of emails (50-100)
2. Verify that welcome emails are not triggered
3. Confirm proper tagging and subscriber attributes
4. Validate reporting and tracking mechanisms

### Phase 3: Full Migration
1. Import complete OnGage export to migration table
2. Begin scheduled daily batch processing
3. Monitor progress and handle any failures
4. Generate completion report

## Timeline
- Setup & Preparation: 2-3 days
- Testing & Validation: 1-2 days
- Full Migration: ~30 days (processing 1,000 emails per day)

## Success Criteria
- All subscribers successfully migrated to BeehiiV
- No disruption to existing sweepstakes functionality
- No duplicate welcome emails sent
- Complete migration audit trail available

## Risks & Mitigation
- BeehiiV API failures: Implement retry logic and failure tracking
- Sweepstakes disruption: Isolate migration code from core functionality
- Data quality issues: Validate email formats before submission
