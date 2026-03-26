import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function createInsightsTable() {
  // Try to create the table using SQL via RPC or just test if it exists
  // Since Supabase JS client doesn't support DDL directly, we'll use the REST API
  // First, check if table exists by trying to select from it
  const { error } = await supabase.from('ai_insights').select('id').limit(1)

  if (error && error.message.includes('does not exist')) {
    console.log('Table ai_insights does not exist. Please create it in Supabase Dashboard with this SQL:')
    console.log(`
CREATE TABLE ai_insights (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_key ON ai_insights(key);
    `)
    console.log('\nOr run this SQL in the Supabase SQL Editor.')
  } else if (error) {
    console.log('Error checking table:', error.message)
  } else {
    console.log('Table ai_insights already exists!')
  }
}

createInsightsTable()
