-- Migration to add Analysis Complete email template
-- Execute this in your Supabase SQL Editor

-- Insert Analysis Complete email template
INSERT INTO email_templates (name, subject, html_content, text_content, status, created_at, updated_at) VALUES (
    'Analysis Complete',
    'Your Part Analysis is Complete! 🎯',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analysis Complete - SpareFinder AI</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                🎯 Analysis Complete!
            </h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">
                Your part has been successfully identified
            </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            
            <!-- Greeting -->
            <p style="color: #374151; font-size: 16px; margin: 0 0 25px 0;">
                Hello {{userName}}! 👋
            </p>

            <!-- Analysis Results -->
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #10B981;">
                
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">
                    {{partName}}
                </h2>

                <div style="margin-bottom: 15px;">
                    <span style="color: #6b7280; font-weight: 500; margin-right: 10px;">Confidence:</span>
                    <span style="background-color: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 14px;">
                        {{confidence}}%
                    </span>
                </div>

                <div style="color: #4b5563; line-height: 1.6; margin-top: 15px;">
                    <strong>Description:</strong><br>
                    {{description}}
                </div>

            </div>

            <!-- Performance Stats -->
            <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #0369a1; margin: 0 0 15px 0; font-size: 18px;">⚡ Analysis Performance</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <span style="color: #374151; font-weight: 500;">Processing Time:</span><br>
                        <span style="color: #0369a1; font-weight: 600;">{{processingTime}}s</span>
                    </div>
                    <div>
                        <span style="color: #374151; font-weight: 500;">Analysis ID:</span><br>
                        <span style="color: #6b7280; font-family: monospace; font-size: 12px;">{{analysisId}}</span>
                    </div>
                </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center; margin: 35px 0;">
                <a href="{{dashboardUrl}}" 
                   style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);">
                    📊 View Full Report
                </a>
            </div>

            <!-- Tips -->
            <div style="background-color: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">💡 Pro Tips</h4>
                <ul style="color: #78350f; margin: 0; padding-left: 20px; line-height: 1.6;">
                    <li>Save this analysis to your history for future reference</li>
                    <li>Share the results with your team or mechanic</li>
                    <li>Upload multiple angles for even better accuracy</li>
                </ul>
            </div>

        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
            <div style="text-align: center;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                    Thank you for using SpareFinder AI! 🚗✨
                </p>
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                    This email was sent on {{currentDate}} at {{currentTime}}
                </p>
            </div>
        </div>

    </div>
</body>
</html>',
    'Hello {{userName}}!

Your part analysis is complete! 🎯

Part Identified: {{partName}}
Confidence: {{confidence}}%
Processing Time: {{processingTime}}s

Description:
{{description}}

Analysis ID: {{analysisId}}

View your full analysis report at: {{dashboardUrl}}

Pro Tips:
- Save this analysis to your history for future reference
- Share the results with your team or mechanic  
- Upload multiple angles for even better accuracy

Thank you for using SpareFinder AI!

This email was sent on {{currentDate}} at {{currentTime}}',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (name) DO UPDATE SET
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    text_content = EXCLUDED.text_content,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Add smtp_from_name setting if it doesn't exist
INSERT INTO system_settings (category, setting_key, setting_value, description, created_at, updated_at) VALUES
('email', 'smtp_from_name', '"SpareFinder AI"', 'Sender name for emails', NOW(), NOW())
ON CONFLICT (category, setting_key) DO NOTHING;

-- Create notification for analysis completion 
CREATE OR REPLACE FUNCTION create_analysis_complete_notification(
    p_user_id UUID,
    p_part_name TEXT,
    p_confidence DECIMAL,
    p_analysis_id TEXT
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        read,
        metadata,
        created_at
    ) VALUES (
        p_user_id,
        'Part Analysis Complete',
        'Your ' || p_part_name || ' analysis is complete with ' || (p_confidence * 100)::INT || '% confidence.',
        'success',
        false,
        jsonb_build_object(
            'analysis_id', p_analysis_id,
            'part_name', p_part_name,
            'confidence', p_confidence,
            'type', 'analysis_complete'
        ),
        NOW()
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Add function to check if user has email notifications enabled
CREATE OR REPLACE FUNCTION user_email_notifications_enabled(p_user_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
    preferences JSONB;
    email_enabled BOOLEAN DEFAULT true;
BEGIN
    SELECT preferences INTO preferences 
    FROM profiles 
    WHERE id = p_user_id;
    
    IF preferences IS NOT NULL THEN
        email_enabled := COALESCE((preferences -> 'notifications' ->> 'email')::BOOLEAN, true);
    END IF;
    
    RETURN email_enabled;
END;
$$ LANGUAGE plpgsql;

SELECT 'Analysis Complete email template and functions created successfully!' as status; 