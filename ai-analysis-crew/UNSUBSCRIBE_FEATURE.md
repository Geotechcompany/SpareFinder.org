# Email Unsubscribe Feature

## Overview
Complete unsubscribe functionality has been added to the engagement email system, allowing users to opt out of marketing emails with a single click. This ensures compliance with email marketing regulations (CAN-SPAM, GDPR, etc.).

## Database Tables Created

### 1. `email_unsubscribe_preferences`
Stores user unsubscribe preferences and tracking information.

**Key Fields:**
- `user_email` - User's email address (unique)
- `user_id` - Reference to auth.users
- `unsubscribed_from_reengagement` - Boolean flag
- `unsubscribed_from_onboarding` - Boolean flag
- `unsubscribed_from_all_marketing` - Boolean flag (master switch)
- `unsubscribe_token` - Unique token for unsubscribe links
- `unsubscribed_at` - Timestamp of unsubscribe action
- `unsubscribe_reason` - Optional reason provided by user
- `unsubscribe_source` - Source of unsubscribe ('email_link', 'settings_page', 'admin')
- `resubscribed_at` - Timestamp if user resubscribes
- `resubscribe_count` - Number of times user has resubscribed

### 2. Updated `engagement_emails` Table
Added unsubscribe tracking fields:
- `unsubscribe_token` - Unique token for each email
- `unsubscribe_url` - Full unsubscribe URL
- `unsubscribed_at` - Timestamp if user unsubscribes from this specific email

## Features

### 1. Unsubscribe Check Before Sending
- System checks if user has unsubscribed before sending any reengagement email
- Uses database function `is_user_unsubscribed_from_reengagement()` for efficient checking
- Skips email sending if user is unsubscribed

### 2. Unsubscribe Token Generation
- Each email gets a unique, secure unsubscribe token
- Tokens are URL-safe and cryptographically secure (32 bytes)
- Stored in both `engagement_emails` and `email_unsubscribe_preferences` tables

### 3. Unsubscribe Link in Emails
- Every email includes an unsubscribe link in the footer
- Link format: `{base_url}/unsubscribe?token={unsubscribe_token}`
- Visible and clearly labeled: "Unsubscribe from marketing emails"
- Included in both HTML and plain text versions

### 4. Unsubscribe Endpoint
- **URL:** `GET /unsubscribe?token={token}&reason={optional_reason}`
- **Functionality:**
  - Validates unsubscribe token
  - Updates user's unsubscribe preferences
  - Creates unsubscribe record if it doesn't exist
  - Returns a user-friendly HTML confirmation page
  - Logs unsubscribe action with timestamp and source

### 5. Unsubscribe Confirmation Page
- Professional HTML page confirming successful unsubscribe
- Clear messaging that user will no longer receive marketing emails
- Link to return to SpareFinder website

## Implementation Details

### Files Modified/Created

1. **`app/unsubscribe_utils.py`** (NEW)
   - `check_user_unsubscribed()` - Check if user is unsubscribed
   - `generate_unsubscribe_token()` - Generate secure token
   - `create_unsubscribe_url()` - Create unsubscribe URL
   - `unsubscribe_user()` - Process unsubscribe request
   - `resubscribe_user()` - Allow users to resubscribe

2. **`app/cron_reminders.py`** (UPDATED)
   - Checks unsubscribe status before sending
   - Generates unsubscribe token for each email
   - Includes unsubscribe URL in email generation
   - Stores unsubscribe token in database

3. **`app/ai_email_generator.py`** (UPDATED)
   - Added `unsubscribe_url` parameter
   - AI prompt includes unsubscribe link requirement
   - Fallback template includes unsubscribe link

4. **`app/engagement_email_storage.py`** (UPDATED)
   - Stores `unsubscribe_token` and `unsubscribe_url` in database

5. **`app/main.py`** (UPDATED)
   - Added `/unsubscribe` endpoint
   - Returns HTML confirmation page

6. **Database Migrations** (CREATED)
   - `database-unsubscribe-preferences.sql` - Creates unsubscribe preferences table
   - Updated `database-engagement-emails.sql` - Adds unsubscribe fields

## Usage

### For Users
1. Click "Unsubscribe from marketing emails" link in any marketing email
2. Redirected to confirmation page
3. Automatically unsubscribed from all future marketing emails

### For Admins
Query unsubscribe statistics:
```sql
-- Total unsubscribes
SELECT COUNT(*) FROM email_unsubscribe_preferences 
WHERE unsubscribed_from_all_marketing = TRUE;

-- Unsubscribe reasons
SELECT unsubscribe_reason, COUNT(*) 
FROM email_unsubscribe_preferences 
WHERE unsubscribe_reason IS NOT NULL
GROUP BY unsubscribe_reason;

-- Resubscribe rate
SELECT 
  COUNT(*) FILTER (WHERE resubscribed_at IS NOT NULL) as resubscribed,
  COUNT(*) as total_unsubscribed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE resubscribed_at IS NOT NULL) / COUNT(*), 2) as resubscribe_rate
FROM email_unsubscribe_preferences
WHERE unsubscribed_from_all_marketing = TRUE;
```

## Compliance

This implementation ensures compliance with:
- **CAN-SPAM Act** (US) - Requires clear unsubscribe mechanism
- **GDPR** (EU) - Right to opt-out of marketing communications
- **CASL** (Canada) - Requires unsubscribe mechanism
- **Email Best Practices** - One-click unsubscribe, clear labeling

## Security

- Tokens are cryptographically secure (secrets.token_urlsafe)
- Tokens are unique per email
- Unsubscribe actions are logged with timestamps
- Database uses Row Level Security (RLS) policies

## Future Enhancements

1. **Resubscribe Functionality** - Allow users to resubscribe via settings page
2. **Unsubscribe Preferences** - Let users choose which email types to unsubscribe from
3. **Unsubscribe Analytics** - Track unsubscribe rates and reasons
4. **Bulk Unsubscribe** - Admin tools for managing unsubscribes
5. **Email Suppression List** - Maintain a global suppression list

