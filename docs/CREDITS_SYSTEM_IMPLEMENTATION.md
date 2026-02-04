# 💰 Credits System Implementation Guide

## Overview

The SpareFinder AI application now includes a comprehensive credits system where new users receive 10 free credits to perform part analysis searches. This freemium model encourages user engagement while providing a path to monetization.

## 🚀 Features

### ✅ Credit Management
- **New Users**: Automatically receive 10 free credits upon registration
- **Credit Deduction**: 1 credit deducted per successful image analysis
- **Credit Refund**: Credits refunded if analysis fails
- **Real-time Balance**: Users can see their current credit balance
- **Transaction History**: Complete audit trail of credit usage

### ✅ Database Integration
- **Credits Column**: Added to profiles table with default value of 10
- **Credit Transactions**: Comprehensive audit table for all credit operations
- **Database Functions**: Safe credit deduction and addition with race condition protection
- **Statistics**: Admin dashboard with credit usage analytics

### ✅ API Endpoints
- **Balance Check**: `/api/credits/balance`
- **Transaction History**: `/api/credits/transactions`
- **Credit Verification**: `/api/credits/check/:amount`
- **Admin Management**: Add credits and view statistics

### ✅ Frontend Components
- **Credits Display**: Real-time credit balance with visual indicators
- **Insufficient Credits**: User-friendly error handling
- **Transaction History**: User can view their credit usage

## 📋 Implementation Details

### Database Schema

#### Profiles Table Enhancement
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 10;
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 0;
```

#### Credit Transactions Table
```sql
CREATE TABLE public.credit_transactions (
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
```

### Database Functions

#### Safe Credit Deduction
```sql
CREATE OR REPLACE FUNCTION deduct_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT 'Image analysis'
) RETURNS JSONB
```

#### Add Credits
```sql
CREATE OR REPLACE FUNCTION add_user_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT 'Credit grant'
) RETURNS JSONB
```

#### New User Credits Trigger
```sql
CREATE OR REPLACE FUNCTION ensure_new_user_credits()
RETURNS TRIGGER
```

### Backend Services

#### Credit Service (`backend/src/services/credit-service.ts`)
- **getUserCredits()**: Get current balance
- **hasEnoughCredits()**: Check if user has sufficient credits
- **deductCredits()**: Safely deduct credits with database function
- **addCredits()**: Add credits to user account
- **processAnalysisCredits()**: Check and deduct for analysis
- **refundAnalysisCredits()**: Refund credits if analysis fails

#### Upload Route Integration
- **Credit Check**: Before processing analysis (Step 1)
- **Credit Deduction**: If user has sufficient credits
- **Credit Refund**: If analysis fails at any point
- **Error Handling**: 402 status code for insufficient credits

### Frontend Integration

#### Credits API (`src/lib/api.ts`)
```typescript
export const creditsApi = {
  getBalance: async (): Promise<ApiResponse>
  getTransactions: async (options?: { page?: number; limit?: number }): Promise<ApiResponse>
  checkCredits: async (amount: number = 1): Promise<ApiResponse>
  addCredits: async (userId: string, amount: number, reason?: string): Promise<ApiResponse>
  getStatistics: async (): Promise<ApiResponse>
}
```

#### Credits Display Component (`src/components/CreditsDisplay.tsx`)
- **Real-time Balance**: Shows current credit count
- **Visual Indicators**: Color-coded status (high/medium/low/empty)
- **Status Messages**: User-friendly credit status text
- **Refresh Button**: Manual balance refresh
- **Upgrade Button**: Call-to-action for more credits

## 🔄 Credit Flow

### User Registration
1. **New User**: Registers account
2. **Database Trigger**: Automatically sets credits to 10
3. **Welcome Credits**: Initial transaction recorded

### Image Analysis Flow
1. **Upload Request**: User uploads image
2. **Credit Check**: Verify user has ≥1 credit
3. **Credit Deduction**: 1 credit deducted before analysis
4. **Analysis Processing**: AI service processes image
5. **Success**: Analysis completes, credits remain deducted
6. **Failure**: Analysis fails, credit refunded automatically

### Error Scenarios
- **Insufficient Credits**: 402 HTTP status with upgrade suggestion
- **Analysis Failure**: Automatic credit refund with reason
- **General Errors**: Credit refund with error details

## 🎯 API Integration

### Credit Check Endpoint
```javascript
GET /api/credits/check/1
Response: {
  success: true,
  has_enough_credits: true,
  current_credits: 7,
  required_credits: 1
}
```

### Balance Endpoint
```javascript
GET /api/credits/balance
Response: {
  success: true,
  credits: 7,
  user_id: "uuid"
}
```

### Insufficient Credits Response
```javascript
POST /api/upload/image
Response: {
  success: false,
  error: "insufficient_credits",
  message: "You do not have enough credits to perform this analysis",
  current_credits: 0,
  required_credits: 1,
  upgrade_required: true
}
```

## 📊 Admin Features

### Credit Statistics
- **Total Users**: Count of all users
- **Average Credits**: Mean credit balance
- **Total Credits**: Sum of all remaining credits
- **Credits Used**: Total credits consumed
- **Users Without Credits**: Count of users with 0 credits

### Admin Operations
- **Add Credits**: Grant credits to specific users
- **View Transactions**: Audit trail of all credit operations
- **Usage Analytics**: Credit consumption patterns

## 🛡️ Security & Performance

### Race Condition Protection
- **Database Functions**: Atomic credit operations with row locking
- **Transaction Safety**: ACID compliance for credit operations
- **Rollback Support**: Automatic rollback on transaction failures

### Performance Optimizations
- **Indexed Queries**: Optimized database indexes
- **Cached Balances**: Frontend caching of credit balance
- **Non-blocking Operations**: Asynchronous credit operations

### Security Measures
- **User Isolation**: Users can only access their own credits
- **Admin Controls**: Role-based access for credit management
- **Audit Trail**: Complete transaction history
- **Input Validation**: Sanitized credit amounts and reasons

## 🎨 User Experience

### Visual Credit Indicators
- **🟢 High Credits (6+)**: Green gradient, coins icon
- **🟡 Medium Credits (3-5)**: Yellow gradient, zap icon
- **🟠 Low Credits (1-2)**: Orange gradient, warning icon
- **🔴 Empty Credits (0)**: Red gradient, alert icon

### User Feedback
- **Real-time Updates**: Instant credit balance changes
- **Clear Messaging**: Friendly error messages
- **Upgrade Prompts**: Clear path to get more credits
- **Transaction History**: Transparent credit usage

## 🧪 Testing

### Manual Testing Scenarios
1. **New User Registration**: Verify 10 credits granted
2. **Successful Analysis**: Verify 1 credit deducted
3. **Failed Analysis**: Verify credit refunded
4. **Zero Credits**: Verify upload blocked with friendly error
5. **Credit Display**: Verify real-time balance updates

### Database Testing
```sql
-- Test credit deduction
SELECT deduct_user_credits('user-uuid', 1, 'Test analysis');

-- Test credit addition
SELECT add_user_credits('user-uuid', 5, 'Test grant');

-- Verify credit balance
SELECT credits FROM profiles WHERE id = 'user-uuid';
```

## 🚀 Deployment Steps

### 1. Database Migration
```sql
-- Run in Supabase SQL Editor
\i backend/database/migrations/009_add_credits_system.sql
```

### 2. Backend Deployment
- Deploy updated backend with credit service
- Verify credit routes are accessible
- Test credit deduction in upload process

### 3. Frontend Deployment
- Deploy frontend with credits display
- Verify credit balance shows correctly
- Test insufficient credits handling

### 4. Verification
- Create test user and verify 10 credits
- Perform analysis and verify credit deduction
- Test failed analysis credit refund

## 📈 Analytics & Monitoring

### Key Metrics
- **Credit Conversion Rate**: Users who upgrade after exhausting credits
- **Average Credits Used**: Mean credits consumed per user
- **Retention Rate**: Users who return after using credits
- **Analysis Success Rate**: Successful vs failed analyses

### Monitoring Queries
```sql
-- Daily credit usage
SELECT DATE(created_at), SUM(amount) as credits_used
FROM credit_transactions 
WHERE transaction_type = 'deduct'
GROUP BY DATE(created_at);

-- Users running low on credits
SELECT COUNT(*) as low_credit_users
FROM profiles 
WHERE credits <= 2 AND credits > 0;

-- Credit refund rate
SELECT 
  COUNT(CASE WHEN transaction_type = 'deduct' THEN 1 END) as deductions,
  COUNT(CASE WHEN reason LIKE '%refund%' THEN 1 END) as refunds
FROM credit_transactions;
```

## 🔧 Troubleshooting

### Common Issues

#### Credits Not Deducted
1. Check if credit service is properly imported
2. Verify database functions are deployed
3. Check for errors in upload route logs

#### Credits Not Refunded
1. Verify refund logic in error handlers
2. Check database function execution
3. Review transaction logs

#### New Users No Credits
1. Check database trigger is active
2. Verify profiles table default value
3. Test user registration flow

### Debug Commands
```bash
# Check credit service logs
docker logs backend-container | grep -i credit

# Test credit deduction
curl -X POST http://localhost:4000/api/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@test.jpg"

# Check user credits
curl -X GET http://localhost:4000/api/credits/balance \
  -H "Authorization: Bearer $TOKEN"
```

## 💡 Future Enhancements

### Credit Packages
- **5 Credits**: $2.99
- **20 Credits**: $9.99 
- **50 Credits**: $19.99
- **Unlimited Monthly**: $29.99

### Bonus Credits
- **Referral Program**: 5 credits per successful referral
- **Daily Login**: 1 credit for daily usage
- **High Accuracy**: Bonus credits for helping improve AI
- **Social Sharing**: Credits for sharing results

### Advanced Features
- **Credit Expiration**: Credits expire after 6 months
- **Credit Gifting**: Users can gift credits to others
- **Bulk Discounts**: Reduced cost per credit for larger packages
- **Subscription Tiers**: Monthly plans with included credits

---

**The credits system is now fully operational and ready to drive user engagement and conversion!** 🎉 