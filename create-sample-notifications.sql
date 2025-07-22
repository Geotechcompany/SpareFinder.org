-- Sample Notifications for Testing
-- Execute this AFTER running the fix-missing-tables.sql script

-- Insert sample notifications for testing
-- Note: Replace the user_id with actual user IDs from your auth.users table

-- Get the first user from auth.users and create sample notifications
WITH first_user AS (
  SELECT id FROM auth.users LIMIT 1
)
INSERT INTO notifications (user_id, title, message, type, read, created_at) 
SELECT 
  first_user.id,
  title,
  message,
  type,
  read,
  created_at
FROM first_user,
(VALUES 
  ('Part Successfully Identified', 'Your brake pad set has been identified with 98.2% confidence', 'success', false, NOW() - INTERVAL '2 minutes'),
  ('New Feature Available', 'Enhanced AI model now supports motorcycle parts identification', 'info', false, NOW() - INTERVAL '1 hour'),
  ('Low Confidence Result', 'Part identification completed with 73% confidence. Manual review recommended.', 'warning', false, NOW() - INTERVAL '3 hours'),
  ('Upload Limit Increased', 'Your monthly upload limit has been increased to 1,000 parts', 'success', true, NOW() - INTERVAL '1 day'),
  ('Weekly Report Ready', 'Your weekly analysis report is ready for download', 'info', true, NOW() - INTERVAL '2 days'),
  ('Achievement Unlocked', 'Congratulations! You''ve reached 95% accuracy rate', 'success', true, NOW() - INTERVAL '3 days'),
  ('System Maintenance', 'Scheduled maintenance will occur tonight from 2-4 AM UTC', 'warning', false, NOW() - INTERVAL '5 hours'),
  ('API Quota Warning', 'You have used 80% of your monthly API quota', 'warning', false, NOW() - INTERVAL '6 hours'),
  ('New Part Database', 'We''ve added 10,000 new automotive parts to our database', 'info', true, NOW() - INTERVAL '1 week'),
  ('Account Security', 'Your account password was updated successfully', 'success', true, NOW() - INTERVAL '2 weeks')
) AS sample_data(title, message, type, read, created_at);

-- Also create notifications for all existing users (not just the first one)
INSERT INTO notifications (user_id, title, message, type, read, created_at)
SELECT 
  u.id,
  'Welcome to SpareFinder AI',
  'Thank you for joining SpareFinder AI! Start by uploading your first part image.',
  'info',
  false,
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM notifications n 
  WHERE n.user_id = u.id 
  AND n.title = 'Welcome to SpareFinder AI'
);

SELECT 'Sample notifications created successfully!' as status; 