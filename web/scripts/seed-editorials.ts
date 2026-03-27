import { config } from "dotenv"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"

config({ path: resolve(__dirname, "..", ".env.local") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Credenciais do Supabase nao encontradas no .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const editorials: Record<number, string> = {
  1: `MANCHETE: BOTAFOGO ATROPELA E CHAPE SURPREENDE NA ABERTURA

LIDE: A primeira rodada do Brasileirão 2026 veio para lembrar que previsões valem pouco quando a bola rola. O Botafogo aplicou um sonoro 4 a 0 no Cruzeiro no jogo mais elástico da rodada, enquanto a Chapecoense fez 4 a 2 no Santos numa partida que ninguém previu. Com nove times vencendo e apenas um empate (Atlético-MG 2x2 Palmeiras), a rodada inaugural foi de gols e emoções.

ANÁLISE PRINCIPAL:
O duelo de maior peso da rodada aconteceu em São Paulo: o Tricolor bateu o Flamengo por 2 a 1, afirmando suas ambições no campeonato logo na estreia. A vitória sobre o rubro-negro carioca em casa é uma declaração de intenções de um São Paulo que quer brigar pelo título. Do outro lado, o Flamengo já começa atrás e precisará reagir rápido para não ver a distância crescer nos primeiros turnos.

A surpresa ficou por conta da Chapecoense, que fez 4 a 2 num Santos que chegava com expectativas renovadas. Quatro gols em casa na estreia é o tipo de resultado que dá confiança e muda o ambiente de um vestiário. Para o Santos, a derrota fora é um alerta imediato de que a temporada 2026 não dará margem para desatenção.

Quem mais impressionou foi o Botafogo, com seu 4 a 0 categórico sobre o Cruzeiro. Quatro gols marcados e nenhum sofrido na abertura do campeonato mostram um time organizado e com poder de fogo real. O Glorioso termina a rodada na liderança pela diferença de gols, e a atuação tem tudo para impor respeito nos adversários das próximas rodadas.

O Cruzeiro é o grande decepcionado. Goleado por 4 a 0 pelo Botafogo, a Raposa começa o campeonato na lanterna com o pior saldo de gols da rodada (-4). A reconstrução cruzeirense para 2026 tropeça já no primeiro passo, e a pressão sobre a comissão técnica deve aparecer cedo se resultados como esse se repetirem.

CONCLUSÃO: A primeira rodada mostrou que o Brasileirão 2026 terá briga de verdade no topo e que ninguém está garantido. Botafogo, São Paulo, Bahia e Fluminense saíram na frente, mas é cedo para grandes conclusões — o que não é cedo é para Cruzeiro e Santos ligarem o alerta. Em campeonato de pontos corridos, quem demora para reagir paga caro na reta final.`,

  2: `MANCHETE: PALMEIRAS MASSACRA, GRÊMIO E BOTAFOGO FAZEM FESTIVAL DE GOLS

LIDE: Se a rodada 1 foi de resultados surpreendentes, a segunda entregou espetáculo de gols. O Palmeiras demoliu o Vitória por 5 a 1, enquanto Grêmio e Botafogo protagonizaram um absurdo 5 a 3 em Porto Alegre. Com o Bragantino assumindo a liderança isolada com 6 pontos e duas vitórias em dois jogos, a tabela começa a ganhar forma.

ANÁLISE PRINCIPAL:
O Bragantino é a história da rodada que poucos estão contando. Enquanto os holofotes vão para os placares elásticos, o Massa Bruta venceu o Atlético-MG por 1 a 0 fora de casa e se isolou na liderança com 6 pontos, 100% de aproveitamento. Duas vitórias por 1 a 0, mostrando uma solidez defensiva que contrasta com a chuva de gols ao redor. É o tipo de consistência que mantém times no topo durante meses.

Grêmio 5 a 3 no Botafogo é daqueles jogos que entram para a história da rodada. Oito gols numa única partida, em Porto Alegre, com o Grêmio virando uma desvantagem inicial para impor uma vitória categórica. Para o Botafogo, que tinha goleado o Cruzeiro na estreia, a queda é vertiginosa — de líder a derrotado em uma semana. A defesa do Glorioso, que não sofreu gols na rodada 1, levou três em 90 minutos.

O Palmeiras fez o que se espera de um candidato ao título: aplicou 5 a 1 no Vitória em casa e mostrou poder ofensivo assustador. Com 4 pontos e saldo de +4, o Verdão é o vice-líder e parece estar calibrando a máquina para a longa temporada. A goleada coloca o Alviverde como principal ameaça ao topo.

A rodada dos empates também merece nota: Flamengo 1x1 Internacional, Santos 1x1 São Paulo, Bahia 1x1 Fluminense, Vasco 1x1 Chapecoense. Quatro empates entre oito jogos dessa fatia da rodada. Os grandes estão se estudando e ninguém quer arriscar demais no começo do campeonato.

CONCLUSÃO: Duas rodadas bastaram para mostrar que o Brasileirão 2026 será um torneio de extremos. Goleadas convivem com empates apertados, e a liderança do Bragantino — discreta, pragmática, eficiente — é o lembrete perfeito de que futebol não se ganha com espetáculo, mas com pontos. Palmeiras e São Paulo já se posicionam como favoritos, mas a tabela de 38 rodadas é longa.`,

  3: `MANCHETE: PALMEIRAS ASSUME A PONTA COM VITÓRIA MAIÚSCULA EM PORTO ALEGRE

LIDE: A terceira rodada reorganizou o topo do Brasileirão. O Palmeiras foi até Porto Alegre e goleou o Internacional por 3 a 1, assumindo a liderança com 7 pontos ao lado de São Paulo, Fluminense e Bahia. O Corinthians freou o Bragantino com um 2 a 0 seco, e o equilíbrio no alto da tabela com quatro times empatados promete uma disputa longa e acirrada.

ANÁLISE PRINCIPAL:
O jogo da rodada foi em Porto Alegre: Internacional 1x3 Palmeiras. O Verdão foi cirúrgico jogando fora de casa, dominando um Inter que soma apenas 1 ponto em três jogos e já se encontra na zona de rebaixamento com saldo de -3. Para o Palmeiras, é a confirmação de que está no nível de candidato ao título. Para o Internacional, é crise instalada — a torcida colorada não vai esperar muito mais por resultados.

A grande surpresa da rodada foi o Corinthians derrubando o líder Bragantino por 2 a 0 em casa. O Massa Bruta, que vinha invicto com duas vitórias, foi dominado pelo Timão num jogo onde a superioridade corintiana foi evidente. O resultado mostra que o Corinthians, apesar da derrota na estreia para o Bahia, encontrou seu caminho e já soma 6 pontos.

O time que mais impressionou nesta rodada foi o São Paulo, que bateu o Grêmio por 2 a 0 em jogo seguro e controlado. O Tricolor soma 7 pontos, divide a liderança com o Palmeiras e exibe números consistentes: duas vitórias e um empate, 5 gols marcados e apenas 2 sofridos. É uma campanha de quem sabe exatamente o que quer.

O Internacional é a grande decepção. Com uma vitória e duas derrotas em casa, o Colorado tem 1 mísero ponto e saldo de -3 após três rodadas. A equipe de Porto Alegre não consegue impor seu jogo e a derrota por 1x3 para o Palmeiras expõe fragilidades defensivas que precisam ser resolvidas urgentemente.

CONCLUSÃO: Com quatro times empatados na liderança com 7 pontos, o Brasileirão 2026 não tem dono definido — mas já tem seus primeiros fracassados. Internacional e Cruzeiro, ambos com 1 ponto, precisam de reação imediata. No topo, a briga entre Palmeiras, São Paulo, Fluminense e Bahia tem tudo para ser o enredo principal da temporada.`,

  4: `MANCHETE: PALMEIRAS E SÃO PAULO DISPARAM NA LIDERANÇA COM 10 PONTOS

LIDE: A quarta rodada, disputada com apenas sete jogos por conta de adiamentos, consolidou a dupla Palmeiras-São Paulo no topo do Brasileirão. Ambos chegaram a 10 pontos, abrindo três de vantagem para o pelotão de perseguição. O Vasco, ainda sem vitória, permanece na lanterna e vê a crise se aprofundar.

ANÁLISE PRINCIPAL:
O confronto direto Palmeiras 2x1 Fluminense foi o jogo mais significativo da rodada. O Verdão recebeu o Tricolor carioca, que também brigava pelo topo, e impôs sua força em casa. Com a vitória, o Palmeiras foi a 10 pontos e derrubou um concorrente direto — o Fluminense estaciona em 7 e pode ver a distância crescer. É o tipo de resultado que separa candidatos de coadjuvantes.

A surpresa ficou por conta de Grêmio 2x1 Atlético-MG. O Galo, que vinha de uma fase irregular com empate na estreia e derrota na segunda rodada, caiu novamente fora de casa e soma apenas 4 pontos em quatro rodadas. Para um time com as ambições do Atlético-MG, estar na metade inferior da tabela após um mês de campeonato é preocupante.

O São Paulo segue impressionando com consistência. A vitória por 1 a 0 sobre o Coritiba, fora de casa, pode não ter sido espetacular, mas é o tipo de resultado que constrói títulos. O Tricolor vence jogos difíceis sem precisar de goleadas, e a solidez defensiva — apenas 3 gols sofridos em 4 jogos — é a base de uma campanha que pode ir longe.

O Vasco é o time que mais decepciona na competição. Com apenas 1 ponto em quatro jogos, derrotado pelo Santos por 2 a 1 nesta rodada, o Cruz-Maltino é o lanterna do campeonato com saldo de -3. A equipe não consegue vencer e a cada rodada que passa a pressão sobre o elenco e a comissão técnica se intensifica.

CONCLUSÃO: A quarta rodada consolidou a dupla paulista Palmeiras-São Paulo como as forças dominantes do início de temporada. Com 10 pontos cada e três de vantagem, começam a se descolar. Para os times da parte debaixo — Vasco, Cruzeiro, Internacional — o momento de reagir já era ontem. Em campeonato de pontos corridos, a matemática é implacável com quem demora a arrancar.`,

  5: `MANCHETE: SÃO PAULO LIDERA SOZINHO E VASCO DERRUBA O PALMEIRAS

LIDE: A Rodada 5 trouxe a grande zebra da temporada até aqui: o Vasco, lanterna com apenas 1 ponto, bateu o Palmeiras por 2 a 1 em São Januário. O resultado catapultou o São Paulo à liderança isolada com 13 pontos e mostrou que no Brasileirão ninguém pode relaxar. Enquanto isso, o Fluminense reencontrou o caminho com uma vitória fora de casa.

ANÁLISE PRINCIPAL:
Vasco 2x1 Palmeiras é o tipo de resultado que vira a rodada de cabeça para baixo. O lanterna, sem nenhuma vitória na competição, derrubou o vice-líder em São Januário. Para o Palmeiras, é o primeiro tropeço real — a derrota faz o Verdão estacionar em 10 pontos enquanto o São Paulo avança para 13. Para o Vasco, mais que três pontos, é uma injeção de esperança num momento crítico da temporada.

A grande surpresa complementar veio de Curitiba: Coritiba 2x0 Corinthians. O Coxa, até então discreto, bateu o Timão em casa com autoridade e subiu na tabela. O Corinthians, que vinha crescendo, leva um balde de água fria e precisa reavaliar sua consistência fora de casa.

O São Paulo é o time mais impressionante da competição até aqui. A vitória por 2 a 0 sobre a Chapecoense pode não ter sido contra um rival direto, mas manter 13 pontos em 5 rodadas — com 4 vitórias e 1 empate — é um aproveitamento de 87%. O Tricolor lidera sozinho e mostra a regularidade que seus concorrentes não conseguem manter.

O Flamengo fez o dever de casa batendo o Cruzeiro por 2 a 0 e subiu para 9 pontos, mas o Rubro-Negro ainda não convence plenamente. A vitória sobre a lanterna Cruzeiro era obrigatória, e o desafio para o Flamengo é mostrar que consegue vencer adversários de maior calibre nas próximas rodadas.

CONCLUSÃO: Com o São Paulo abrindo 3 pontos de vantagem na liderança e o Palmeiras tropeçando justamente contra o lanterna, a Rodada 5 é o ponto de virada narrativa do campeonato. O Brasileirão 2026 já tem seu líder favorito e seus primeiros escândalos. Cruzeiro com 2 pontos e Internacional com 2 são os fracassos que ninguém esperava — e a rodada mostrou que surpresas podem vir de qualquer lugar.`,

  6: `MANCHETE: FLAMENGO HUMILHA BOTAFOGO E SÃO PAULO SEGUE IMBATÍVEL

LIDE: A Rodada 6 ficou marcada pelo clássico carioca: Flamengo 3x0 no Botafogo, no jogo mais elétrico da rodada. O São Paulo estendeu sua invencibilidade com mais uma vitória, chegando a impressionantes 16 pontos em 6 rodadas. No outro extremo, o Internacional soma apenas 2 pontos e afunda cada vez mais na zona de rebaixamento.

ANÁLISE PRINCIPAL:
Botafogo 0x3 Flamengo. O placar fala por si, mas o contexto amplifica o resultado. O Flamengo foi até a casa do rival e impôs uma goleada que mexe com o orgulho do Botafogo. O Glorioso, que abriu o campeonato com um 4x0 sobre o Cruzeiro, agora soma apenas 3 pontos em 6 rodadas e está na zona de rebaixamento. O Flamengo, por sua vez, sobe para 10 pontos e se coloca como candidato sério ao título. Quando o Rubro-Negro decide jogar, pouca gente aguenta.

Cruzeiro 3x3 Vasco foi o jogo mais dramático da rodada. Seis gols entre dois times desesperados por pontos criaram uma montanha-russa emocional. O empate não resolve a vida de nenhum dos dois — Cruzeiro segue com apenas 3 pontos e o Vasco com 4 — mas o espetáculo de gols é um lembrete de que desespero gera jogos abertos e imprevisíveis.

O São Paulo é uma máquina. Vitória por 2x1 sobre o Bragantino fora de casa, chegando a 16 pontos — o melhor início de temporada da competição. Cinco vitórias e um empate, aproveitamento de 89%, e um time que simplesmente não sabe perder. O Tricolor Paulista é a referência em consistência e está construindo uma campanha que pode ser histórica.

O Internacional perdeu mais uma, desta vez para o Bahia por 1x0 em casa. Com apenas 2 pontos em 6 rodadas, o Colorado é o maior fracasso do campeonato até aqui. Um time com a tradição e o investimento do Inter não pode estar na lanterna após um mês e meio de competição. A pressão é enorme e a mudança de direção técnica parece inevitável.

CONCLUSÃO: A Rodada 6 cristalizou as narrativas do Brasileirão 2026: São Paulo lidera com autoridade, Palmeiras e Fluminense perseguem, Flamengo se recupera no clássico, e a crise de Botafogo e Internacional parece cada vez mais difícil de reverter. Os próximos jogos dirão se essa tabela é provisória ou definitiva, mas com 16 pontos em 6 rodadas, o São Paulo parece estar jogando outro campeonato.`,

  7: `MANCHETE: PALMEIRAS EMPATA COM SÃO PAULO NA PONTA APÓS RODADA DRAMÁTICA

LIDE: A sétima rodada trouxe reviravoltas que sacudiram a tabela. O Palmeiras venceu o Botafogo por 2x1 e alcançou o São Paulo na liderança, ambos com 16 pontos. O Tricolor Paulista perdeu pela primeira vez no campeonato, caindo por 1x0 para o Atlético-MG. Enquanto isso, o Vasco fez 3x2 no Fluminense num clássico eletrizante e o Flamengo goleou o Remo por 3x0.

ANÁLISE PRINCIPAL:
A derrota do São Paulo para o Atlético-MG por 1x0 é o resultado mais importante da rodada. O Tricolor, até então invicto com 5 vitórias e 1 empate, finalmente encontrou seu primeiro revés. O Galo, que vinha de campanha irregular, encontrou uma brecha no líder e provou que até a melhor campanha do campeonato tem limites. Para o São Paulo, é um teste de caráter — cair da liderança isolada para a co-liderança pode mexer com a confiança do grupo.

Vasco 3x2 Fluminense foi o clássico da rodada. Cinco gols, drama até o fim, e o Cruz-Maltino que duas rodadas atrás venceu o Palmeiras mostra que quando joga em São Januário é um adversário imprevisível e perigoso. Para o Fluminense, a segunda derrota consecutiva é um sinal de alerta — o Tricolor carioca já caiu de 7 para 13 pontos de distância do líder.

O Palmeiras segue sendo o time mais sólido do campeonato. A vitória por 2x1 sobre o Botafogo, que afunda para 3 pontos em 7 rodadas, levou o Verdão à co-liderança com 16 pontos. O Alviverde soma 5 vitórias, 1 empate e 1 derrota, com o melhor saldo de gols da competição (+8). É o perfil de um campeão — consistente, difícil de bater, e letal quando tem a chance.

O Botafogo é uma crise em câmera lenta. Após a goleada na estreia, o Glorioso venceu apenas aquele jogo. São 3 pontos em 7 rodadas, na zona de rebaixamento, com saldo de -3. O contraste entre o 4x0 da Rodada 1 e a sequência de derrotas é assombroso. Se não houver reação imediata, o fantasma do rebaixamento vai se tornar realidade.

CONCLUSÃO: A co-liderança Palmeiras-São Paulo promete ser o duelo central do Brasileirão 2026. Ambos com 16 pontos mas perfis diferentes — o Palmeiras com o melhor saldo (+8), o São Paulo com a melhor campanha até a queda. Enquanto isso, Bahia com 14 pontos e Flamengo com 13 se posicionam para um G4 competitivo. Na parte debaixo, Botafogo, Cruzeiro e Remo precisam de milagres já.`,

  8: `MANCHETE: PALMEIRAS ABRE TRÊS PONTOS E REMO APLICA MAIOR ZEBRA DO ANO

LIDE: A Rodada 8 coroou o Palmeiras como líder isolado do Brasileirão 2026 com 19 pontos, após vencer o clássico contra o São Paulo por 1x0. Mas a história da rodada é outra: o Remo, penúltimo colocado, atropelou o Bahia por 4x1 no resultado mais improvável da temporada. Uma rodada que prova que o futebol brasileiro não respeita roteiro.

ANÁLISE PRINCIPAL:
Palmeiras 1x0 São Paulo no Allianz Parque é o confronto que definiu a rodada e pode definir o campeonato. O Verdão venceu o rival direto com gol solitário e abriu 3 pontos de vantagem na liderança — 19 contra 16. Para o Palmeiras, é a segunda vitória em confronto direto contra rivais do G4 na competição. Para o São Paulo, que já havia perdido para o Atlético-MG, é a segunda derrota seguida e a perda da co-liderança. A lua de mel tricolor acabou.

Remo 4x1 Bahia é o tipo de resultado que ninguém aposta mas todo mundo comenta. O time paraense, com 3 pontos em 7 rodadas e penúltimo na tabela, simplesmente destruiu o Bahia — que era o 4º colocado com 14 pontos. Quatro gols do Remo em casa, num jogo onde tudo deu certo para quem não tinha nada a perder. Para o Bahia, é uma derrota humilhante que questiona a consistência fora de casa.

O Fluminense foi o time que mais se beneficiou dos resultados gerais. A vitória por 1x0 sobre o Atlético-MG levou o Tricolor carioca a 16 pontos, empatado com o São Paulo na segunda posição. Após duas derrotas consecutivas, o Flu reencontrou o caminho e mostrou resiliência. A equipe de Laranjeiras está firme na briga pelo título.

O Corinthians empatou com o Flamengo em 1x1 num jogo truncado que frustrou ambas as torcidas. Para o Flamengo, que vinha de duas vitórias (incluindo o 3x0 no Botafogo), o empate é um freio de mão na recuperação. Para o Corinthians, é mais um resultado mediocre que mantém o Timão no meio da tabela sem definição clara de identidade.

CONCLUSÃO: Com 19 pontos e 3 de vantagem, o Palmeiras é o favorito claro ao título. Mas o Brasileirão está apenas na 8ª rodada de 38 — e se o Remo pode golear o Bahia por 4x1, qualquer coisa pode acontecer. São Paulo e Fluminense com 16 pontos, Flamengo e Bahia com 14 formam um pelotão perigoso. Na parte debaixo, Cruzeiro com 4 pontos e Remo com 6 continuam em situação crítica, mas a zebra desta rodada mostra que até os mais improváveis podem rugir.`
}

async function main() {
  console.log("Futedata — Seeding Round Editorials")
  console.log("====================================\n")

  for (const [round, content] of Object.entries(editorials).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    const key = `round-editorial-${round}`
    const headline = content.split("\n")[0].replace(/^MANCHETE:\s*/i, "").trim()

    try {
      await supabase
        .from("ai_insights")
        .upsert(
          { key, content, created_at: new Date().toISOString() },
          { onConflict: "key" }
        )
      console.log(`Rodada ${round}: ✓ "${headline}"`)
    } catch (err) {
      console.error(`Rodada ${round}: ✗ Erro:`, err)
    }
  }

  console.log("\n====================================")
  console.log("Concluido! 8 editoriais inseridos.")
}

main().catch(err => {
  console.error("Erro fatal:", err)
  process.exit(1)
})
