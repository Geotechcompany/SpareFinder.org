import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types for our database tables
export interface PartAnalysis {
  id: string
  user_id: string
  image_url: string
  image_name: string
  analysis_results: any
  predictions: any[]
  confidence_score: number
  processing_time: number
  ai_model_version: string
  created_at: string
  updated_at: string
}

export interface PartSearch {
  id: string
  user_id: string
  image_url: string
  image_name: string
  predictions: any[]
  confidence_score: number
  processing_time: number
  ai_model_version: string
  analysis_status: string
  image_size_bytes: number
  image_format: string
  upload_source: string
  web_scraping_used: boolean
  created_at: string
  updated_at: string
} 