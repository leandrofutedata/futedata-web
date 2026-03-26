import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') || 'Futedata'
  const subtitle = searchParams.get('subtitle') || 'Análise Estatística do Futebol Brasileiro'
  const data = searchParams.get('data') || ''

  const lines = data ? data.split('|').slice(0, 5) : []

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#005C2B',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <span style={{ color: '#F5C800', fontSize: '48px', fontWeight: 'bold', letterSpacing: '4px' }}>
            FUTEDATA
          </span>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          <h1 style={{ color: 'white', fontSize: '56px', fontWeight: 'bold', margin: 0, lineHeight: 1.1 }}>
            {title}
          </h1>
          <p style={{ color: '#86efac', fontSize: '24px', margin: '12px 0 0 0' }}>
            {subtitle}
          </p>

          {/* Data lines */}
          {lines.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '32px' }}>
              {lines.map((line, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#F5C800', fontSize: '28px', fontWeight: 'bold', width: '32px' }}>
                    {i + 1}
                  </span>
                  <span style={{ color: 'white', fontSize: '22px' }}>
                    {line}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px' }}>
            futedata.com.br — Dados do Brasileirão 2026
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
