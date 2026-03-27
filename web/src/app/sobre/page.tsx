import { Breadcrumb } from "@/components/Breadcrumb"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sobre o Futedata — Metodologia e Missão | Futedata",
  description: "Entenda como o Futedata calcula xG, xGA, xPTS e ±PTS. Nossa missão é tornar as estatísticas avançadas do futebol brasileiro acessíveis a todos.",
}

export default function SobrePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Breadcrumb items={[{ label: "Sobre" }]} />

      {/* Hero */}
      <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 shadow-lg mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl text-white">
          SOBRE O FUTEDATA
        </h1>
        <p className="text-green-200 text-sm mt-2">
          Tornando as estatísticas avançadas do futebol brasileiro acessíveis a todos
        </p>
      </div>

      <div className="space-y-8">
        {/* Mission */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900 mb-4">
            O QUE É O FUTEDATA
          </h2>
          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              O Futedata é uma plataforma de análise estatística do futebol brasileiro. Nossa missão é simples:
              trazer para o futebol do Brasil o mesmo nível de dados e análise que já existe nos grandes campeonatos europeus.
            </p>
            <p>
              Enquanto a maioria dos sites brasileiros mostra apenas classificação, gols e resultados,
              o Futedata vai além. Calculamos métricas avançadas como Expected Goals (xG), Expected Goals Against (xGA)
              e Expected Points (xPTS) para mostrar não só o que aconteceu, mas o que <strong>deveria</strong> ter acontecido.
            </p>
            <p>
              O resultado? Você descobre quais times estão jogando melhor do que a tabela mostra,
              quais estão tendo sorte e quais estão sendo prejudicados pelo acaso.
            </p>
          </div>
        </section>

        {/* Metrics */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900 mb-4">
            NOSSAS MÉTRICAS
          </h2>
          <div className="space-y-6">
            {/* xG */}
            <div className="border-l-4 border-[var(--color-green-primary)] pl-4">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-1">
                xG — Expected Goals (Gols Esperados)
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-2">
                O xG mede a qualidade das chances de gol que um time cria. Em vez de contar só os gols
                marcados, o xG analisa quantos gols um time <strong>deveria</strong> ter marcado com base nas chances que teve.
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-[family-name:var(--font-data)] text-[11px] text-gray-500">
                  <strong>Exemplo:</strong> Um time com 10 gols e xG de 13.5 está desperdiçando muitas chances.
                  Já um time com 12 gols e xG de 9.0 está convertendo acima do normal — o que pode não se sustentar.
                </p>
              </div>
            </div>

            {/* xGA */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-1">
                xGA — Expected Goals Against (Gols Esperados Contra)
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-2">
                O xGA é o contrário do xG: mede a qualidade das chances que o time <strong>permite</strong> ao adversário.
                Quanto menor o xGA, mais sólida é a defesa.
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-[family-name:var(--font-data)] text-[11px] text-gray-500">
                  <strong>Exemplo:</strong> Um time que sofreu 5 gols mas tem xGA de 8.2 está com o goleiro salvando muito.
                  Um time com 10 gols sofridos e xGA de 7.0 está tendo azar — os adversários estão convertendo demais.
                </p>
              </div>
            </div>

            {/* xPTS */}
            <div className="border-l-4 border-emerald-500 pl-4">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-1">
                xPTS — Expected Points (Pontos Esperados)
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-2">
                O xPTS usa o xG e o xGA para calcular quantos pontos um time <strong>deveria</strong> ter na tabela.
                É a métrica mais importante para avaliar se um time está acima ou abaixo do que merece.
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-[family-name:var(--font-data)] text-[11px] text-gray-500">
                  <strong>Exemplo:</strong> Um time com 20 pontos e xPTS de 15.5 tem +4.5 de ±PTS — está pontuando mais
                  do que o desempenho justifica. Já um time com 12 pontos e xPTS de 17.0 está sendo azarado.
                </p>
              </div>
            </div>

            {/* ±PTS */}
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-1">
                ±PTS — Diferença de Pontos (Sorte/Azar)
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-2">
                A diferença entre os pontos reais e o xPTS. É o nosso "indicador de sorte":
              </p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="font-[family-name:var(--font-data)] text-[11px] text-orange-600">
                  <strong>±PTS positivo (+3.0):</strong> O time tem mais pontos do que deveria. Pode estar tendo sorte.
                </p>
                <p className="font-[family-name:var(--font-data)] text-[11px] text-green-600">
                  <strong>±PTS negativo (−3.0):</strong> O time tem menos pontos do que merece. Pode estar tendo azar.
                </p>
                <p className="font-[family-name:var(--font-data)] text-[11px] text-gray-500">
                  <strong>±PTS próximo de 0:</strong> O time está exatamente onde deveria estar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Data sources */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900 mb-4">
            FONTE DOS DADOS
          </h2>
          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              Os dados de jogos, placares e estatísticas de jogadores são fornecidos pela
              <strong> API-Football</strong> (api-sports.io), uma das maiores APIs de dados esportivos do mundo,
              usada por sites como SofaScore, FotMob e outros.
            </p>
            <p>
              Os dados do Cartola FC são obtidos diretamente da API pública do Cartola (Globo).
            </p>
            <p>
              Os modelos de xG, xGA e xPTS são calculados pelo Futedata usando algoritmos próprios
              baseados em médias históricas da liga e conversão de chances. Não usamos dados de xG de terceiros
              — nossos modelos são estimativas proprietárias.
            </p>
            <p>
              Os insights narrativos são gerados por inteligência artificial (Claude, da Anthropic)
              com base nos dados reais do Supabase. Cada insight é cacheado por 1 hora para otimizar custos e performance.
            </p>
          </div>
        </section>

        {/* Methodology */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900 mb-4">
            COMO CALCULAMOS
          </h2>
          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            <p>
              Nosso modelo de xG usa uma combinação de taxa de conversão histórica individual do time
              (peso 82%) com a média da liga (peso 18%). Isso suaviza extremos e produz estimativas mais confiáveis
              do que simplesmente extrapolar os dados do time isoladamente.
            </p>
            <p>
              O xPTS é calculado a partir da proporção xG/(xG+xGA), multiplicada pelo rendimento médio
              de um jogo do Brasileirão (2.85 pontos em disputa + 0.05 de ajuste). Isso reflete quantos pontos
              um time ganharia se os jogos seguissem a expectativa estatística.
            </p>
            <p>
              Para a classificação, usamos os critérios oficiais da CBF: pontos, número de vitórias,
              saldo de gols e gols pró.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
