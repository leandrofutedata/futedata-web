import { NextRequest, NextResponse } from 'next/server'
import { generateInsight } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const { key, dataContext } = await request.json()

    if (!key || !dataContext) {
      return NextResponse.json({ error: 'Missing key or dataContext' }, { status: 400 })
    }

    const insight = await generateInsight(key, dataContext)
    return NextResponse.json({ insight })
  } catch {
    return NextResponse.json({ insight: '' })
  }
}
