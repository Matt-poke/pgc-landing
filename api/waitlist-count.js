import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://pgc-landing.vercel.app')
  res.setHeader('Cache-Control', 's-maxage=60') // Cache 60 secondes
  
  try {
    const { data, error } = await supabase.rpc('get_waitlist_count')
    if (error) return res.status(500).json({ count: 0 })
    return res.status(200).json({ count: data || 0 })
  } catch (e) {
    return res.status(500).json({ count: 0 })
  }
}