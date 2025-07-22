-- Migration to add credits system for users
-- Execute this in your Supabase SQL Editor

-- Add credits column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 10;

-- Add credits_used column to track total credits used
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0;

-- Update existing users to have 10 credits if they don't have any
UPDATE public.profiles 
SET credits = 10 
WHERE credits IS NULL OR credits = 0;

-- Create credit_transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deduct', 'add', 'grant')),
    amount INTEGER NOT NULL,
    credits_before INTEGER NOT NULL,
    credits_after INTEGER NOT NULL,
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(transaction_type);

-- Enable RLS for credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own credit transactions
CREATE POLICY "Users can view own credit transactions" ON public.credit_transactions
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- System can insert credit transactions
CREATE POLICY "System can insert credit transactions" ON public.credit_transactions
    FOR INSERT WITH CHECK (true);

-- Admins can view all credit transactions
CREATE POLICY "Admins can view all credit transactions" ON public.credit_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );

-- Function to deduct credits safely
CREATE OR REPLACE FUNCTION deduct_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT 'Image analysis'
) RETURNS JSONB AS $$
DECLARE
    current_credits INTEGER;
    new_credits INTEGER;
    transaction_id UUID;
BEGIN
    -- Get current credits with row lock
    SELECT credits INTO current_credits 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE;
    
    -- Check if user has enough credits
    IF current_credits < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'insufficient_credits',
            'current_credits', current_credits,
            'required_credits', p_amount
        );
    END IF;
    
    -- Calculate new credits amount
    new_credits := current_credits - p_amount;
    
    -- Update user credits
    UPDATE public.profiles 
    SET 
        credits = new_credits,
        credits_used = credits_used + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Record transaction
    INSERT INTO public.credit_transactions (
        user_id,
        transaction_type,
        amount,
        credits_before,
        credits_after,
        reason
    ) VALUES (
        p_user_id,
        'deduct',
        p_amount,
        current_credits,
        new_credits,
        p_reason
    ) RETURNING id INTO transaction_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'credits_before', current_credits,
        'credits_after', new_credits,
        'transaction_id', transaction_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits to user
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT 'Credit grant'
) RETURNS JSONB AS $$
DECLARE
    current_credits INTEGER;
    new_credits INTEGER;
    transaction_id UUID;
BEGIN
    -- Get current credits with row lock
    SELECT credits INTO current_credits 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE;
    
    -- Calculate new credits amount
    new_credits := current_credits + p_amount;
    
    -- Update user credits
    UPDATE public.profiles 
    SET 
        credits = new_credits,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Record transaction
    INSERT INTO public.credit_transactions (
        user_id,
        transaction_type,
        amount,
        credits_before,
        credits_after,
        reason
    ) VALUES (
        p_user_id,
        CASE WHEN p_reason LIKE '%grant%' OR p_reason LIKE '%free%' THEN 'grant' ELSE 'add' END,
        p_amount,
        current_credits,
        new_credits,
        p_reason
    ) RETURNING id INTO transaction_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'credits_before', current_credits,
        'credits_after', new_credits,
        'transaction_id', transaction_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user credit balance
CREATE OR REPLACE FUNCTION get_user_credits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    user_credits INTEGER;
BEGIN
    SELECT credits INTO user_credits 
    FROM public.profiles 
    WHERE id = p_user_id;
    
    RETURN COALESCE(user_credits, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to ensure new users get 10 free credits
CREATE OR REPLACE FUNCTION ensure_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
    -- Set default credits if not specified
    IF NEW.credits IS NULL THEN
        NEW.credits := 10;
    END IF;
    
    -- Set default credits_used if not specified
    IF NEW.credits_used IS NULL THEN
        NEW.credits_used := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user credits
DROP TRIGGER IF EXISTS trigger_new_user_credits ON public.profiles;
CREATE TRIGGER trigger_new_user_credits
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_new_user_credits();

-- Create view for credit statistics (admin use)
CREATE OR REPLACE VIEW credit_statistics AS
SELECT 
    COUNT(*) as total_users,
    AVG(credits) as avg_credits,
    SUM(credits) as total_credits_remaining,
    SUM(credits_used) as total_credits_used,
    COUNT(CASE WHEN credits > 0 THEN 1 END) as users_with_credits,
    COUNT(CASE WHEN credits = 0 THEN 1 END) as users_without_credits
FROM public.profiles;

SELECT 'Credits system migration completed successfully!' as status; 