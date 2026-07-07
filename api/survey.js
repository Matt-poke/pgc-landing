import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const rateLimitMap = new Map()
const RATE_LIMIT = 3
const RATE_WINDOW = 60 * 60 * 1000

function isRateLimited(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry) { rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW }); return false }
  if (now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW }); return false }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://pgc-landing.vercel.app')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!req.headers['content-type']?.includes('application/json')) {
    return res.status(400).json({ success: false, error: 'Content-Type invalide' })
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress
  if (isRateLimited(ip)) {
    return res.status(429).json({ success: false, error: 'Trop de requêtes.' })
  }

  const { q1, q2, q3, q4 } = req.body
  if (!q1 || !q2 || !q3 || !q4) {
    return res.status(400).json({ success: false, error: 'Toutes les questions sont obligatoires' })
  }

  try {
    const { data, error } = await supabase.rpc('submit_pricing_survey', {
      answer_q1: q1, answer_q2: q2, answer_q3: q3, answer_q4: q4
    })
    if (error) return res.status(500).json({ success: false, error: 'Erreur serveur' })
    return res.status(200).json(data)
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
}