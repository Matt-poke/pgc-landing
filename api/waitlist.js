import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, website } = req.body
  if (website) return res.status(200).json({ success: true })

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Email requis' })
  }

  try {
    const { data, error } = await supabase.rpc('join_waitlist', { user_email: email })
    if (error) {
      console.error('Waitlist error:', error)
      return res.status(500).json({ success: false, error: 'Erreur serveur' })
    }
    return res.status(200).json(data)
  } catch (e) {
    console.error('Waitlist exception:', e)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}