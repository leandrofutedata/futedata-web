import Anthropic from '@anthropic-ai/sdk'
import { supabase } from './supabase'

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days (round data doesn't change)

let anthropic: Anthropic | null = null

function getClient(): Anthropic | null {
  if (anthropic) return anthropic
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  anthropic = new Anthropic({ apiKey: key })
  return anthropic
}

async function getCachedInsight(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('body, created_at')
    .eq('type', key)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null

  const age = Date.now() - new Date(data.created_at).getTime()
  if (age > CACHE_TTL_MS) return null

  return data.body
}

async function setCachedInsight(key: string, content: string): Promise<void> {
  // Remove old cache entry, then insert new
  await supabase.from('articles').delete().eq('type', key)
  await supabase.from('articles').insert({
    type: key,
    title: key,
    body: content,
    published_at: new Date().toISOString(),
  })
}

export async function generateInsight(key: string, dataContext: string, options?: { maxTokens?: number; systemPrompt?: string }): Promise<string> {
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
    const defaultSystem = `Você é um comentarista esportivo brasileiro. Escreva insights curtos e opinativos sobre futebol.
Regras:
- Máximo 3 frases
- Tom direto, opinativo, engajante — como um comentarista de TV
- Use dados concretos (números) quando disponíveis
- Português brasileiro natural
- Não use aspas, não se apresente, vá direto ao ponto`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: options?.maxTokens ?? 300,
      system: options?.systemPrompt ?? defaultSystem,
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
