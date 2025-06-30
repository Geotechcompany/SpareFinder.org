import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client with service role key for database operations
let supabase: ReturnType<typeof createClient> | null = null;

// Initialize Supabase client only if environment variables are available
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
  }
} else {
  console.warn('⚠️ Supabase environment variables not found. Database logging will be disabled.');
  console.warn('Missing variables:', {
    SUPABASE_URL: !!supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey
  });
}

export interface PartSearchData {
  id: string; // AI service request_id
  user_id: string;
  image_url: string;
  image_name: string;
  predictions: any[];
  confidence_score: number;
  processing_time: number;
  ai_model_version: string;
  similar_images?: any[];
  web_scraping_used?: boolean;
  sites_searched?: number;
  parts_found?: number;
  search_query?: string;
  image_size_bytes?: number;
  image_format?: string;
  upload_source?: string;
  analysis_status?: 'completed' | 'failed' | 'processing';
  error_message?: string;
  metadata?: any;
}

export interface SearchHistoryData {
  user_id: string;
  part_search_id?: string;
  search_type: 'image_upload' | 'text_search' | 'part_number_search';
  search_query?: string;
  results_count: number;
  clicked_results?: any[];
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
}

export class DatabaseLogger {
  /**
   * Log a part search/upload to the database
   */
  static async logPartSearch(data: PartSearchData): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not initialized. Skipping database logging.');
        return { success: false, error: 'Database not available' };
      }

      console.log('🗄️ Logging part search to database:', {
        id: data.id,
        user_id: data.user_id,
        analysis_status: data.analysis_status,
        web_scraping_used: data.web_scraping_used,
        similar_images_count: data.similar_images?.length || 0
      });

      const { error } = await supabase
        .from('part_searches')
        .insert({
          id: data.id,
          user_id: data.user_id,
          image_url: data.image_url,
          image_name: data.image_name,
          predictions: data.predictions || [],
          confidence_score: data.confidence_score || 0,
          processing_time: data.processing_time || 0,
          ai_model_version: data.ai_model_version || 'SpareFinder AI v1',
          similar_images: data.similar_images || [],
          web_scraping_used: data.web_scraping_used || false,
          sites_searched: data.sites_searched || 0,
          parts_found: data.parts_found || 0,
          search_query: data.search_query,
          image_size_bytes: data.image_size_bytes,
          image_format: data.image_format,
          upload_source: data.upload_source || 'web',
          analysis_status: data.analysis_status || 'completed',
          error_message: data.error_message,
          metadata: data.metadata || {}
        });

      if (error) {
        console.error('❌ Failed to log part search:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Successfully logged part search to database');
      return { success: true };

    } catch (error) {
      console.error('❌ Database logging error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Log search history entry
   */
  static async logSearchHistory(data: SearchHistoryData): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not initialized. Skipping search history logging.');
        return { success: false, error: 'Database not available' };
      }

      const { error } = await supabase
        .from('user_search_history')
        .insert({
          user_id: data.user_id,
          part_search_id: data.part_search_id,
          search_type: data.search_type,
          search_query: data.search_query,
          results_count: data.results_count,
          clicked_results: data.clicked_results || [],
          session_id: data.session_id,
          ip_address: data.ip_address,
          user_agent: data.user_agent
        });

      if (error) {
        console.error('❌ Failed to log search history:', error);
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Search history logging error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStatistics(userId: string): Promise<any> {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not initialized. Cannot get user statistics.');
        return null;
      }

      const { data, error } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Failed to get user statistics:', error);
        return null;
      }

      return data;

    } catch (error) {
      console.error('❌ Error getting user statistics:', error);
      return null;
    }
  }

  /**
   * Get user upload history with pagination
   */
  static async getUserHistory(
    userId: string, 
    page: number = 1, 
    limit: number = 20,
    filters?: {
      analysis_status?: string;
      web_scraping_used?: boolean;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not initialized. Cannot get user history.');
        return { data: [], total: 0, page, limit };
      }

      let query = supabase
        .from('part_searches')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.analysis_status) {
        query = query.eq('analysis_status', filters.analysis_status);
      }
      if (filters?.web_scraping_used !== undefined) {
        query = query.eq('web_scraping_used', filters.web_scraping_used);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Failed to get user history:', error);
        return { data: [], total: 0, page, limit };
      }

      return {
        data: data || [],
        total: count || 0,
        page,
        limit
      };

    } catch (error) {
      console.error('❌ Error getting user history:', error);
      return { data: [], total: 0, page, limit };
    }
  }

  /**
   * Get daily usage statistics (admin only)
   */
  static async getDailyStats(
    dateFrom?: string,
    dateTo?: string
  ): Promise<any[]> {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not initialized. Cannot get daily stats.');
        return [];
      }

      let query = supabase
        .from('daily_usage_stats')
        .select('*')
        .order('date', { ascending: false });

      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('date', dateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to get daily stats:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('❌ Error getting daily stats:', error);
      return [];
    }
  }

  /**
   * Update user statistics manually (if needed)
   */
  static async updateUserStatistics(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not initialized. Cannot update user statistics.');
        return { success: false, error: 'Database not available' };
      }

      // Get aggregated data from part_searches
      const { data: searchData, error: searchError } = await supabase
        .from('part_searches')
        .select('*')
        .eq('user_id', userId);

      if (searchError) {
        return { success: false, error: searchError.message };
      }

      if (!searchData || searchData.length === 0) {
        return { success: true }; // No data to update
      }

      // Calculate statistics
      const totalUploads = searchData.length;
      const totalSuccessful = searchData.filter(s => 
        s.analysis_status === 'completed' && s.predictions && Array.isArray(s.predictions) && s.predictions.length > 0
      ).length;
      const totalFailed = searchData.filter(s => s.analysis_status === 'failed').length;
      const totalWebScraping = searchData.filter(s => s.web_scraping_used).length;
      const totalSimilarParts = searchData.reduce((sum, s) => 
        sum + (Array.isArray(s.similar_images) ? s.similar_images.length : 0), 0
      );
      const avgConfidence = searchData.reduce((sum, s) => sum + (typeof s.confidence_score === 'number' ? s.confidence_score : 0), 0) / totalUploads;
      const avgProcessingTime = searchData.reduce((sum, s) => sum + (typeof s.processing_time === 'number' ? s.processing_time : 0), 0) / totalUploads;
      const lastUpload = searchData.sort((a, b) => {
        const dateA = typeof a.created_at === 'string' ? new Date(a.created_at).getTime() : 0;
        const dateB = typeof b.created_at === 'string' ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      })[0]?.created_at;

      // Update or insert user statistics
      const { error: upsertError } = await supabase
        .from('user_statistics')
        .upsert({
          user_id: userId,
          total_uploads: totalUploads,
          total_successful_identifications: totalSuccessful,
          total_failed_identifications: totalFailed,
          total_web_scraping_searches: totalWebScraping,
          total_similar_parts_found: totalSimilarParts,
          average_confidence_score: avgConfidence,
          average_processing_time: avgProcessingTime,
          last_upload_at: lastUpload,
          updated_at: new Date().toISOString()
        });

      if (upsertError) {
        return { success: false, error: upsertError.message };
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Error updating user statistics:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Delete user data (GDPR compliance)
   */
  static async deleteUserData(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!supabase) {
        console.warn('⚠️ Supabase not initialized. Cannot delete user data.');
        return { success: false, error: 'Database not available' };
      }

      // Delete in order to respect foreign key constraints
      await supabase.from('user_search_history').delete().eq('user_id', userId);
      await supabase.from('user_statistics').delete().eq('user_id', userId);
      await supabase.from('part_searches').delete().eq('user_id', userId);

      return { success: true };

    } catch (error) {
      console.error('❌ Error deleting user data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
} 