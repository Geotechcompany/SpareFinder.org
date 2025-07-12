-- Insert sample audit logs for testing
INSERT INTO audit_logs (
  user_id, 
  action, 
  resource_type, 
  resource_id, 
  old_values, 
  new_values, 
  ip_address, 
  user_agent, 
  created_at
) VALUES 
-- Sample login audit log
(
  '013d0ffd-2f66-4f1e-9408-ed21100df4b4', 
  'User login successful', 
  'authentication', 
  'login_session_123', 
  NULL, 
  '{"method": "email", "success": true}', 
  '192.168.1.100', 
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 
  NOW() - INTERVAL '1 hour'
),
-- Sample part upload audit log
(
  '013d0ffd-2f66-4f1e-9408-ed21100df4b4', 
  'Part image uploaded', 
  'upload', 
  'upload_456', 
  NULL, 
  '{"filename": "brake_pad.jpg", "size": "2.3MB", "analysis_status": "completed"}', 
  '192.168.1.100', 
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 
  NOW() - INTERVAL '2 hours'
),
-- Sample admin action audit log
(
  '013d0ffd-2f66-4f1e-9408-ed21100df4b4', 
  'User role updated', 
  'administration', 
  'user_role_change_789', 
  '{"role": "user"}', 
  '{"role": "admin"}', 
  '192.168.1.100', 
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 
  NOW() - INTERVAL '3 hours'
),
-- Sample system audit log
(
  NULL, 
  'System backup completed', 
  'system', 
  'backup_daily_001', 
  NULL, 
  '{"backup_size": "1.2GB", "duration": "5 minutes", "status": "success"}', 
  NULL, 
  'System/1.0', 
  NOW() - INTERVAL '4 hours'
),
-- Sample failed login audit log
(
  NULL, 
  'Failed login attempt', 
  'authentication', 
  'failed_login_999', 
  NULL, 
  '{"email": "unknown@example.com", "reason": "Invalid password", "ip": "192.168.1.200"}', 
  '192.168.1.200', 
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 
  NOW() - INTERVAL '5 hours'
),
-- Sample configuration change audit log
(
  '013d0ffd-2f66-4f1e-9408-ed21100df4b4', 
  'AI model configuration updated', 
  'configuration', 
  'ai_model_config_001', 
  '{"model": "GPT-4", "status": "inactive"}', 
  '{"model": "GPT-4", "status": "active", "api_key": "updated"}', 
  '192.168.1.100', 
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 
  NOW() - INTERVAL '6 hours'
);

-- Also insert some user activities as fallback data
INSERT INTO user_activities (
  user_id, 
  action, 
  details, 
  created_at
) VALUES 
(
  '013d0ffd-2f66-4f1e-9408-ed21100df4b4', 
  'Viewed admin dashboard', 
  '{"page": "dashboard", "duration": "2 minutes"}', 
  NOW() - INTERVAL '30 minutes'
),
(
  '013d0ffd-2f66-4f1e-9408-ed21100df4b4', 
  'Accessed user management', 
  '{"page": "user_management", "action": "view_users"}', 
  NOW() - INTERVAL '15 minutes'
),
(
  '013d0ffd-2f66-4f1e-9408-ed21100df4b4', 
  'Uploaded part image', 
  '{"filename": "engine_part.jpg", "analysis_result": "successful"}', 
  NOW() - INTERVAL '45 minutes'
); 