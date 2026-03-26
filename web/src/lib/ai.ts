import Anthropic from '@anthropic-ai/sdk'
import { supabase } from './supabase'

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

let anthropic: Anthropic | null = null

function getClient(): Anthropic | null {
  if (anthropic) return anthropic
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  anthropic = new Anthropic({ apiKey: key })
  return anthropic
}

interface CachedInsight {
  id: number
  key: string
  content: string
  created_at: string
}

async function getCachedInsight(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('key', key)
    .single()

  if (error || !data) return null

  const cached = data as CachedInsight
  const age = Date.now() - new Date(cached.created_at).getTime()
  if (age > CACHE_TTL_MS) return null

  return cached.content
}

async function setCachedInsight(key: string, content: string): Promise<void> {
  await supabase
    .from('ai_insights')
    .upsert(
      { key, content, created_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
}

export async function generateInsight(key: string, dataContext: string): Promise<string> {
  // Check cache first
  try {
    const cached = await getCachedInsight(key)
    if (cached) return cached
  } catch {
    // Cache miss or table doesn't exist — continue to generate
  }

  const client = getClient()
  if (!client) return ''

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `Você é um comentarista esportivo brasileiro. Escreva insights curtos e opinativos sobre futebol.
Regras:
- Máximo 3 frases
- Tom direto, opinativo, engajante — como um comentarista de TV
- Use dados concretos (números) quando disponíveis
- Português brasileiro natural
- Não use aspas, não se apresente, vá direto ao ponto`,
      messages: [
        {
          role: 'user',
          content: dataContext,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Cache the result
    try {
      await setCachedInsight(key, text)
    } catch {
      // Cache write failed — not critical
    }

    return text
  } catch {
    return ''
  }
}
