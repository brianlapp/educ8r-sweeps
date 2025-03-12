
# Project Roadmap

## ✅ Project Setup
- ✅ Create Vite React project
- ✅ Install dependencies (Tailwind, shadcn, Supabase)
- ✅ Set up basic routing
- ✅ Configure environment variables

## ✅ Database (Supabase)
- ✅ Create entries table with:
  - ✅ id, first_name, last_name, email
  - ✅ referral_code, entry_count
  - ✅ referred_by, timestamps
- ✅ Create webhook endpoint for tracking postbacks
- ✅ Set up admin view
- ✅ Test connections

## ✅ Tracking Setup (Critical Path)
- ✅ Set up Everflow SDK integration
- ✅ Create test component for tracking validation
- ✅ Configure postback pixel for conversions
- ✅ Implement webhook handler for entry count updates
- ✅ Document tracking implementation
- ✅ Test complete referral flow with tracking

## ✅ Landing Page
- ✅ Basic form component
- ✅ Form validation
- ✅ Supabase submit function
- ✅ BeehiiV integration with tags:
  - ✅ Base tag: 'sweeps'
  - ✅ Custom tag: 'comprendi'
- ✅ Copy existing UI design

## ✅ Thank You Page
- ✅ Generate referral codes
- ✅ Integrate Everflow tracking links with referral codes
- ✅ Copy to clipboard function
- ✅ Basic styling and layout
- ✅ Email template via BeehiiV
- ✅ Verify tracking in share flow

## ✅ Admin Dashboard
- ✅ Basic auth protection
- ✅ Display entries table
- ✅ Show referral counts
- ✅ Add basic filtering
- ✅ Export function

## ✅ Partner Integration Documentation
- ✅ Create technical integration guide:
  - ✅ Everflow SDK setup instructions
  - ✅ Required tracking parameters
  - ✅ Landing page integration steps
  - ✅ Conversion tracking implementation
  - ✅ Testing and validation procedures
- ✅ Example code snippets
- ✅ Troubleshooting guide

## ✅ Testing & Launch
- ✅ Test form submissions
- ✅ Test BeehiiV integration
- ✅ Test complete referral flow with tracking
- ✅ Verify all postbacks update entries correctly
- ✅ Test admin features
- ✅ Deploy to production

## ⚠️ BeehiiV Integration - Critical Implementation Notes
- BeehiiV API requires `custom_fields` to be formatted as an array of objects with `name` and `value` properties
- Example of correct format:
  ```javascript
  custom_fields: [
    {
      name: 'First Name',
      value: firstName
    },
    {
      name: 'Last Name',
      value: lastName
    },
    {
      name: 'referral_code',
      value: entry.referral_code
    }
  ]
  ```
- Publication ID must remain `pub_4b47c3db-7b59-4c82-a18b-16cf10fc2d23` unless explicitly changed in BeehiiV dashboard
- Two critical tags must be added to subscribers: 'comprendi' and 'sweeps'
- The API requires sequential calls: (1) Create/update subscription, (2) Get subscriber, (3) Add tags to subscriber
- BeehiiV endpoints:
  - Subscription: `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`
  - Get subscriber: `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions?email=${email}`
  - Add tags: `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions/${subscriberId}/tags`

## 🔄 Multi-Sweepstakes Architecture
- ⏳ Phase 1: Foundation (13-18 hours)
  - ⏳ Database schema creation for campaigns table
  - ⏳ Campaign context and provider implementation
  - ⏳ Dynamic routing structure updates
  - ⏳ Migration strategy for existing entries
  - ⏳ Foundation testing and validation
  - ⚠️ BeehiiV Integration Preservation:
    - Maintain custom_fields array format
    - Preserve existing publication_id
    - Ensure all necessary tags are added
    - Add campaign-specific fields to custom_fields without changing the structure

- ⏳ Phase 2: Component Updates (16-22 hours)
  - ⏳ Campaign-aware Entry Form component
  - ⏳ Dynamic Thank You page templates
  - ⏳ Email notification template system
  - ⏳ Campaign-specific tracking integration
  - ⏳ Component testing and validation

- ⏳ Phase 3: Migration & Launch (10-15 hours)
  - ⏳ Existing campaign migration
  - ⏳ New campaign configuration creation
  - ⏳ Parallel campaign testing
  - ⏳ Performance and load testing
  - ⏳ Documentation and knowledge transfer

## 📋 Multi-Sweepstakes Implementation Details

### Database Structure
- Create campaigns table with:
  - id, slug (unique identifier)
  - title, prize_name, prize_amount
  - target_audience, thank_you_title, thank_you_description
  - email_template_id, start/end dates
  - is_active flag, timestamps
- Add campaign_id to entries table
- Create indices for performance

### Component Architecture
- Implement CampaignContext for state management
- Create CampaignProvider for global access
- Modify routing to support /:campaign-slug pattern
- Ensure backward compatibility with existing routes

### Email Template System
- Design placeholders for dynamic content
- Create template selection logic in edge function
- Support multiple email templates per campaign
- Ensure consistent tracking across templates

### Testing Strategy
- Unit tests for campaign-aware components
- Integration tests for full referral flow
- Load testing for multiple concurrent campaigns
- A/B testing support for campaign variants

### Monitoring & Analytics
- Campaign-specific tracking and metrics
- Cross-campaign performance comparison
- Conversion and referral attribution

## Legend
- ✅ Completed
- 🔄 In Progress
- ⏳ Pending
- ❌ Blocked
- ⚠️ Critical Implementation Detail

## Notes
- BeehiiV integration is working correctly with proper tagging
- Referral system functionality is working perfectly
- Everflow tracking confirmed working with successful postbacks
- Admin features complete with authentication and filtering
- Partner documentation completed and available
- System is ready for production
- Multi-sweepstakes architecture estimated at 39-55 hours total development time
