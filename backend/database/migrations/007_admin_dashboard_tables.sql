-- Admin Dashboard Tables Migration
-- This migration creates all the missing tables needed for the admin dashboard

-- Create system_metrics table for monitoring system performance
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10,4),
    metric_unit TEXT,
    tags JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_activities table for audit logs
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_models table for AI model management
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'pending', 'error')),
    usage_count INTEGER DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0.00,
    avg_response_time DECIMAL(5,2) DEFAULT 0.00,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    last_used_at TIMESTAMP WITH TIME ZONE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_methods table for payment management
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'pending', 'error')),
    transactions_count INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0.00,
    fees DECIMAL(5,2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_templates table for email management
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT,
    text_content TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_settings table for system configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, setting_key)
);

-- Create audit_logs table for comprehensive logging
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_action ON user_activities(action);
CREATE INDEX IF NOT EXISTS idx_ai_models_status ON ai_models(status);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON ai_models(provider);
CREATE INDEX IF NOT EXISTS idx_payment_methods_status ON payment_methods(status);
CREATE INDEX IF NOT EXISTS idx_payment_methods_provider ON payment_methods(provider);
CREATE INDEX IF NOT EXISTS idx_email_templates_status ON email_templates(status);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Enable RLS for all tables
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_metrics (admin only)
CREATE POLICY "Admins can view system metrics" ON system_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can insert system metrics" ON system_metrics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for user_activities (admin only)
CREATE POLICY "Admins can view user activities" ON user_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can insert own activities" ON user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_models (admin only)
CREATE POLICY "Admins can manage ai models" ON ai_models
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for payment_methods (admin only)
CREATE POLICY "Admins can manage payment methods" ON payment_methods
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for email_templates (admin only)
CREATE POLICY "Admins can manage email templates" ON email_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for system_settings (admin only)
CREATE POLICY "Admins can manage system settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies for audit_logs (admin only)
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Insert default system settings
INSERT INTO system_settings (category, setting_key, setting_value, description) VALUES
('security', 'password_min_length', '8', 'Minimum password length'),
('security', 'require_special_chars', 'true', 'Require special characters in passwords'),
('security', 'session_timeout', '3600', 'Session timeout in seconds'),
('security', 'two_factor_required', 'false', 'Require two-factor authentication'),
('email', 'smtp_host', 'smtp.gmail.com', 'SMTP server host'),
('email', 'smtp_port', '587', 'SMTP server port'),
('email', 'smtp_user', 'admin@geotech.com', 'SMTP username'),
('email', 'smtp_secure', 'true', 'Use secure SMTP connection'),
('notifications', 'email_enabled', 'true', 'Enable email notifications'),
('notifications', 'slack_enabled', 'false', 'Enable Slack notifications'),
('notifications', 'webhook_url', '', 'Webhook URL for notifications'),
('system', 'maintenance_mode', 'false', 'Enable maintenance mode'),
('system', 'debug_mode', 'false', 'Enable debug mode'),
('system', 'log_level', 'info', 'System log level'),
('system', 'backup_enabled', 'true', 'Enable automatic backups')
ON CONFLICT (category, setting_key) DO NOTHING;

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, text_content, status) VALUES
('Welcome Email', 'Welcome to SpareFinder', '<h1>Welcome to SpareFinder!</h1><p>Thank you for joining our platform.</p>', 'Welcome to SpareFinder! Thank you for joining our platform.', 'active'),
('Password Reset', 'Reset Your Password', '<h1>Password Reset</h1><p>Click the link below to reset your password.</p>', 'Password Reset: Click the link below to reset your password.', 'active'),
('Upgrade Notification', 'Subscription Updated', '<h1>Subscription Updated</h1><p>Your subscription has been successfully updated.</p>', 'Subscription Updated: Your subscription has been successfully updated.', 'active'),
('Weekly Report', 'Your Weekly Analytics', '<h1>Weekly Report</h1><p>Here is your weekly activity summary.</p>', 'Weekly Report: Here is your weekly activity summary.', 'inactive')
ON CONFLICT (name) DO NOTHING;

-- Insert default AI models
INSERT INTO ai_models (provider, model_name, api_key, status, description) VALUES
('OpenAI', 'GPT-4 Turbo', 'sk-proj-abc123def456ghi789jkl', 'active', 'Advanced language model for complex reasoning'),
('Anthropic', 'Claude-3 Opus', 'sk-ant-api03-abc123def456ghi789', 'inactive', 'Constitutional AI with strong safety measures'),
('Google', 'Gemini Pro', 'AIzaSyAbc123Def456Ghi789Jkl', 'pending', 'Multimodal AI with vision capabilities')
ON CONFLICT (provider, model_name) DO NOTHING;

-- Insert default payment methods
INSERT INTO payment_methods (name, provider, api_key, secret_key, status, description) VALUES
('Stripe', 'stripe', 'sk_live_1234567890abcdef', 'sk_test_0987654321fedcba', 'active', 'Credit cards, Apple Pay, Google Pay'),
('PayPal', 'paypal', 'AQkquBDf1zctJOWGKWUEtKXm6qVhueUEMvXO_-MCI4DQQ4-LWvkDLcr1SmIkpDqg', 'EGnHDxD_qRPOmeAjlZXHdccxRQ', 'inactive', 'PayPal, PayPal Credit, Venmo'),
('Square', 'square', 'sandbox-sq0idb-K4nQFCCWV1j_7-K_3r3Q', 'sandbox-sq0csp-K4nQFCCWV1j_7-K_3r3Q', 'pending', 'In-person and online payments')
ON CONFLICT (name) DO NOTHING;

-- Create function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_ai_models_updated_at BEFORE UPDATE
    ON ai_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE
    ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE
    ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE
    ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();