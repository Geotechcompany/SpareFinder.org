import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qhtysayouknqrsdxniam.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFodHlzYXlvdWtucXJzZHhuaWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2Mzc4OTIsImV4cCI6MjA2NTIxMzg5Mn0.mowEWw95jAG48hiOfxx6TsScyzIHcyNYeugWEtlNFME'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: {
      getItem: (key: string) => {
        if (typeof window !== 'undefined') {
          return localStorage.getItem(key)
        }
        return null
      },
      setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, value)
        }
      },
      removeItem: (key: string) => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(key)
        }
      },
    },
  },
})

// Types for authentication and database
export type Profile = {
  id: string
  email: string
  username?: string
  full_name?: string
  avatar_url?: string
  role: 'user' | 'admin' | 'super_admin'
  phone?: string
  company?: string
  preferences?: any
  metadata?: any
  created_at: string
  updated_at: string
}

export type AuthUser = {
  id: string
  email: string
  role: 'user' | 'admin' | 'super_admin'
  profile?: Profile
}

export type Subscription = {
  id: string
  user_id: string
  tier: 'free' | 'pro' | 'enterprise'
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  stripe_customer_id?: string
  stripe_subscription_id?: string
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end: boolean
  metadata?: any
  created_at: string
  updated_at: string
}

export type UsageTracking = {
  id: string
  user_id: string
  month: number
  year: number
  searches_count: number
  api_calls_count: number
  storage_used: number
  bandwidth_used: number
  created_at: string
  updated_at: string
}

export type PartSearch = {
  id: string
  user_id: string
  image_url?: string
  image_size?: number
  predictions: any[]
  confidence_score?: number
  processing_time?: number
  status: 'processing' | 'completed' | 'failed'
  error_message?: string
  ip_address?: string
  user_agent?: string
  metadata?: any
  created_at: string
  updated_at: string
}

export type SearchAnalytics = {
  id: string
  user_id?: string
  search_id?: string
  event_type: string
  event_data?: any
  session_id?: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

export type UserActivity = {
  id: string
  user_id: string
  action: string
  resource_type?: string
  resource_id?: string
  details?: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  action_url?: string
  expires_at?: string
  metadata?: any
  created_at: string
}

// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string, metadata?: { [key: string]: any }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    return { data, error }
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  signInWithOAuth: async (provider: 'google' | 'github' | 'discord') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
    return { data, error }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  },

  updatePassword: async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password,
    })
    return { data, error }
  },

  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  },
}

// Database helper functions
export const db = {
  profiles: {
    get: async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      return { data, error }
    },

    getAll: async (options?: { role?: string; search?: string; limit?: number; offset?: number }) => {
      let query = supabase.from('profiles').select('*')
      
      if (options?.role) {
        query = query.eq('role', options.role)
      }
      
      if (options?.search) {
        query = query.or(`full_name.ilike.%${options.search}%,email.ilike.%${options.search}%`)
      }
      
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }
      
      return await query.order('created_at', { ascending: false })
    },

    update: async (userId: string, updates: Partial<Profile>) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
      return { data, error }
    },

    create: async (profile: Omit<Profile, 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('profiles')
        .insert([profile])
        .select()
        .single()
      return { data, error }
    },

    delete: async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
      return { data, error }
    },
  },

  subscriptions: {
    get: async (userId: string) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single()
      return { data, error }
    },

    getAll: async (options?: { status?: string; tier?: string; limit?: number; offset?: number }) => {
      let query = supabase.from('subscriptions')
        .select(`
          *,
          profiles (
            id,
            email,
            full_name
          )
        `)
      
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      
      if (options?.tier) {
        query = query.eq('tier', options.tier)
      }
      
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }
      
      return await query.order('created_at', { ascending: false })
    },

    update: async (userId: string, updates: Partial<Subscription>) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()
      return { data, error }
    },

    create: async (subscription: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([subscription])
        .select()
        .single()
      return { data, error }
    },
  },

  usageTracking: {
    get: async (userId: string, month?: number, year?: number) => {
      let query = supabase.from('usage_tracking').select('*').eq('user_id', userId)
      
      if (month) query = query.eq('month', month)
      if (year) query = query.eq('year', year)
      
      const { data, error } = await query.single()
      return { data, error }
    },

    getAll: async (options?: { userId?: string; year?: number; limit?: number }) => {
      let query = supabase.from('usage_tracking').select('*')
      
      if (options?.userId) {
        query = query.eq('user_id', options.userId)
      }
      
      if (options?.year) {
        query = query.eq('year', options.year)
      }
      
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      
      return await query.order('year', { ascending: false }).order('month', { ascending: false })
    },

    increment: async (userId: string, type: 'searches' | 'api_calls', amount = 1) => {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      
      const { data, error } = await supabase.rpc('increment_usage', {
        p_user_id: userId,
        p_searches: type === 'searches' ? amount : 0,
        p_api_calls: type === 'api_calls' ? amount : 0,
      })
      
      return { data, error }
    },
  },

  partSearches: {
    create: async (searchData: Omit<PartSearch, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('part_searches')
        .insert([searchData])
        .select()
        .single()
      return { data, error }
    },

    get: async (searchId: string) => {
      const { data, error } = await supabase
        .from('part_searches')
        .select('*')
        .eq('id', searchId)
        .single()
      return { data, error }
    },

    getByUser: async (userId: string, options?: { limit?: number; offset?: number; status?: string }) => {
      let query = supabase.from('part_searches').select('*').eq('user_id', userId)
      
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }
      
      return await query.order('created_at', { ascending: false })
    },

    getAll: async (options?: { status?: string; limit?: number; offset?: number; dateFrom?: string; dateTo?: string }) => {
      let query = supabase.from('part_searches')
        .select(`
          *,
          profiles (
            id,
            email,
            full_name
          )
        `)
      
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      
      if (options?.dateFrom) {
        query = query.gte('created_at', options.dateFrom)
      }
      
      if (options?.dateTo) {
        query = query.lte('created_at', options.dateTo)
      }
      
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }
      
      return await query.order('created_at', { ascending: false })
    },

    update: async (searchId: string, updates: Partial<PartSearch>) => {
      const { data, error } = await supabase
        .from('part_searches')
        .update(updates)
        .eq('id', searchId)
        .select()
        .single()
      return { data, error }
    },
  },

  searchAnalytics: {
    create: async (analyticsData: Omit<SearchAnalytics, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('search_analytics')
        .insert([analyticsData])
        .select()
        .single()
      return { data, error }
    },

    getByUser: async (userId: string, options?: { limit?: number; eventType?: string; dateFrom?: string; dateTo?: string }) => {
      let query = supabase.from('search_analytics').select('*').eq('user_id', userId)
      
      if (options?.eventType) {
        query = query.eq('event_type', options.eventType)
      }
      
      if (options?.dateFrom) {
        query = query.gte('created_at', options.dateFrom)
      }
      
      if (options?.dateTo) {
        query = query.lte('created_at', options.dateTo)
      }
      
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      
      return await query.order('created_at', { ascending: false })
    },

    getAll: async (options?: { limit?: number; eventType?: string; dateFrom?: string; dateTo?: string }) => {
      let query = supabase.from('search_analytics').select('*')
      
      if (options?.eventType) {
        query = query.eq('event_type', options.eventType)
      }
      
      if (options?.dateFrom) {
        query = query.gte('created_at', options.dateFrom)
      }
      
      if (options?.dateTo) {
        query = query.lte('created_at', options.dateTo)
      }
      
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      
      return await query.order('created_at', { ascending: false })
    },
  },

  userActivities: {
    create: async (activityData: Omit<UserActivity, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('user_activities')
        .insert([activityData])
        .select()
        .single()
      return { data, error }
    },

    getByUser: async (userId: string, options?: { limit?: number; action?: string; dateFrom?: string; dateTo?: string }) => {
      let query = supabase.from('user_activities').select('*').eq('user_id', userId)
      
      if (options?.action) {
        query = query.eq('action', options.action)
      }
      
      if (options?.dateFrom) {
        query = query.gte('created_at', options.dateFrom)
      }
      
      if (options?.dateTo) {
        query = query.lte('created_at', options.dateTo)
      }
      
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      
      return await query.order('created_at', { ascending: false })
    },

    getAll: async (options?: { limit?: number; action?: string; dateFrom?: string; dateTo?: string }) => {
      let query = supabase.from('user_activities')
        .select(`
          *,
          profiles (
            id,
            email,
            full_name
          )
        `)
      
      if (options?.action) {
        query = query.eq('action', options.action)
      }
      
      if (options?.dateFrom) {
        query = query.gte('created_at', options.dateFrom)
      }
      
      if (options?.dateTo) {
        query = query.lte('created_at', options.dateTo)
      }
      
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      
      return await query.order('created_at', { ascending: false })
    },
  },

  notifications: {
    create: async (notificationData: Omit<Notification, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('notifications')
        .insert([notificationData])
        .select()
        .single()
      return { data, error }
    },

    getByUser: async (userId: string, options?: { unreadOnly?: boolean; limit?: number }) => {
      let query = supabase.from('notifications').select('*').eq('user_id', userId)
      
      if (options?.unreadOnly) {
        query = query.eq('read', false)
      }
      
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      
      return await query.order('created_at', { ascending: false })
    },

    markAsRead: async (notificationId: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .select()
        .single()
      return { data, error }
    },

    markAllAsRead: async (userId: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
      return { data, error }
    },
  },

  // Analytics and reporting functions
  analytics: {
    getUserStats: async (userId?: string) => {
      const { data, error } = await supabase.rpc('get_user_stats', {
        p_user_id: userId,
      })
      return { data, error }
    },

    getSystemStats: async (dateFrom?: string, dateTo?: string) => {
      const { data, error } = await supabase.rpc('get_system_stats', {
        p_date_from: dateFrom,
        p_date_to: dateTo,
      })
      return { data, error }
    },

    getSearchTrends: async (period: 'day' | 'week' | 'month' | 'year' = 'month', limit = 30) => {
      const { data, error } = await supabase.rpc('get_search_trends', {
        p_period: period,
        p_limit: limit,
      })
      return { data, error }
    },
  },
}

export default supabase 