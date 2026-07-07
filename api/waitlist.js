import { createClient } from '@supabase/supabase-js'
import { promises as dns } from 'dns'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const rateLimitMap = new Map()
const RATE_LIMIT = 5
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

async function hasValidMX(email) {
  try {
    const domain = email.split('@')[1]
    const records = await dns.resolveMx(domain)
    return records && records.length > 0
  } catch (e) {
    return false
  }
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
    return res.status(429).json({ success: false, error: 'Trop de requêtes. Réessaie dans une heure.' })
  }

  const { email, website } = req.body
  if (website) return res.status(200).json({ success: true })

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Email requis' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ success: false, error: 'Format email invalide' })
  }

  if (email.length > 254) {
    return res.status(400).json({ success: false, error: 'Email trop long' })
  }

  // Validation MX — vérifie que le domaine peut recevoir des emails
  const validMX = await hasValidMX(email.trim())
  if (!validMX) {
    return res.status(400).json({ success: false, error: 'Adresse email invalide ou inexistante.' })
  }

  try {
    const { data, error } = await supabase.rpc('join_waitlist', { user_email: email.trim() })
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