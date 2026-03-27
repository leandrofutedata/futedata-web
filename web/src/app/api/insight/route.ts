import { NextRequest, NextResponse } from 'next/server'
import { generateInsight } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const { key, dataContext, maxTokens, systemPrompt } = await request.json()

    if (!key || !dataContext) {
      return NextResponse.json({ error: 'Missing key or dataContext' }, { status: 400 })
    }

    const insight = await generateInsight(key, dataContext, {
      maxTokens: maxTokens || undefined,
      systemPrompt: systemPrompt || undefined,
    })
    return NextResponse.json({ insight })
  } catch {
    return NextResponse.json({ insight: '' })
  }
}
