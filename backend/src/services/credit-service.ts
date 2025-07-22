import { supabase } from '../server';

interface CreditResult {
  success: boolean;
  credits_before?: number;
  credits_after?: number;
  current_credits?: number;
  required_credits?: number;
  transaction_id?: string;
  error?: string;
}

interface CreditTransaction {
  id: string;
  user_id: string;
  transaction_type: 'deduct' | 'add' | 'grant';
  amount: number;
  credits_before: number;
  credits_after: number;
  reason: string;
  metadata: any;
  created_at: string;
}

class CreditService {
  
  /**
   * Get user's current credit balance
   */
  async getUserCredits(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user credits:', error);
        return 0;
      }

      return data?.credits || 0;
    } catch (error) {
      console.error('Error in getUserCredits:', error);
      return 0;
    }
  }

  /**
   * Check if user has enough credits for a transaction
   */
  async hasEnoughCredits(userId: string, requiredCredits: number = 1): Promise<boolean> {
    const currentCredits = await this.getUserCredits(userId);
    return currentCredits >= requiredCredits;
  }

  /**
   * Deduct credits from user account using database function
   */
  async deductCredits(
    userId: string, 
    amount: number = 1, 
    reason: string = 'Image analysis'
  ): Promise<CreditResult> {
    try {
      const { data, error } = await supabase.rpc('deduct_user_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason
      });

      if (error) {
        console.error('Error deducting credits:', error);
        return {
          success: false,
          error: 'Failed to deduct credits'
        };
      }

      return data;
    } catch (error) {
      console.error('Error in deductCredits:', error);
      return {
        success: false,
        error: 'Credit transaction failed'
      };
    }
  }

  /**
   * Add credits to user account using database function
   */
  async addCredits(
    userId: string, 
    amount: number, 
    reason: string = 'Credit grant'
  ): Promise<CreditResult> {
    try {
      const { data, error } = await supabase.rpc('add_user_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason
      });

      if (error) {
        console.error('Error adding credits:', error);
        return {
          success: false,
          error: 'Failed to add credits'
        };
      }

      return data;
    } catch (error) {
      console.error('Error in addCredits:', error);
      return {
        success: false,
        error: 'Credit transaction failed'
      };
    }
  }

  /**
   * Get user's credit transaction history
   */
  async getCreditTransactions(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching credit transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCreditTransactions:', error);
      return [];
    }
  }

  /**
   * Get credit statistics for admin dashboard
   */
  async getCreditStatistics(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('credit_statistics')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching credit statistics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCreditStatistics:', error);
      return null;
    }
  }

  /**
   * Grant free credits to new users (called during registration)
   */
  async grantNewUserCredits(userId: string, amount: number = 10): Promise<CreditResult> {
    return this.addCredits(userId, amount, 'Welcome bonus - Free credits for new user');
  }

  /**
   * Check and deduct credits for image analysis
   */
  async processAnalysisCredits(userId: string): Promise<CreditResult> {
    // Check if user has enough credits first
    const hasCredits = await this.hasEnoughCredits(userId, 1);
    
    if (!hasCredits) {
      const currentCredits = await this.getUserCredits(userId);
      return {
        success: false,
        error: 'insufficient_credits',
        current_credits: currentCredits,
        required_credits: 1
      };
    }

    // Deduct 1 credit for the analysis
    return this.deductCredits(userId, 1, 'Image analysis search');
  }

  /**
   * Refund credits if analysis fails
   */
  async refundAnalysisCredits(userId: string, reason: string = 'Analysis failed - credit refund'): Promise<CreditResult> {
    return this.addCredits(userId, 1, reason);
  }
}

export const creditService = new CreditService();
export { CreditService, CreditResult, CreditTransaction }; 