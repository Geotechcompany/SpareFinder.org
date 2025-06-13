import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single instance to be reused
const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
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
});

// Types
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
  user_metadata?: {
    full_name?: string
    avatar_url?: string
    subscription_tier?: string
    [key: string]: any
  }
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
    return { data: { session: data?.session, user: data?.user }, error }
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

// For backwards compatibility
export const createClient = () => {
  console.warn('createClient() is deprecated. Please use the default export instead.');
  return supabase;
};

export default supabase; 