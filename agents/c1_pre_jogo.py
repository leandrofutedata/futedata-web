import os
import anthropic
from supabase import create_client
from datetime import datetime, timezone, timedelta

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
claude = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def buscar_jogos_futuros_sem_analise():
    """Busca jogos NS nos proximos 3 dias que nao tem artigo pre-jogo."""
    amanha = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%dT00:00:00")
    limite = (datetime.now(timezone.utc) + timedelta(days=4)).strftime("%Y-%m-%dT00:00:00")

    # 1. Jogos futuros nos proximos 3 dias
    jogos_resp = (
        supabase.table("games")
        .select("*")
        .eq("status", "NS")
        .gte("date", amanha)
        .lt("date", limite)
        .order("date", desc=False)
        .execute()
    )
    todos_jogos = jogos_resp.data or []

    if not todos_jogos:
        return []

    # 2. game_ids que ja tem artigo pre-jogo
    artigos_resp = (
        supabase.table("articles")
        .select("game_id")
        .eq("type", "pre-jogo")
        .execute()
    )
    game_ids_com_artigo = {a["game_id"] for a in (artigos_resp.data or [])}

    # 3. Filtrar jogos sem artigo
    jogos_sem = [j for j in todos_jogos if j["id"] not in game_ids_com_artigo]
    return jogos_sem


def extrair_rodada(round_str):
    """Extrai numero da rodada de 'Regular Season - 8' -> 'Rodada 8'."""
    if not round_str:
        return "Rodada desconhecida"
    partes = round_str.split(" - ")
    if len(partes) >= 2 and partes[-1].strip().isdigit():
        return f"Rodada {partes[-1].strip()}"
    return round_str


def gerar_analise(jogo):
    rodada = extrair_rodada(jogo["round"])
    data_jogo = jogo["date"][:10] if jogo.get("date") else "data indefinida"
    prompt = (
        f"Voce e o analista de dados do Futedata, site de estatisticas avancadas do Brasileirao. "
        f"Escreva uma previa pre-jogo em portugues para o seguinte jogo da {rodada} do Brasileirao Serie A 2025:\n\n"
        f"{jogo['home_team']} vs {jogo['away_team']}\n"
        f"Rodada: {rodada}\n"
        f"Data: {data_jogo}\n\n"
        f"Mencione explicitamente a {rodada} no texto. "
        f"Analise o momento de cada time, o que esperar do confronto, e quem tem vantagem com base no desempenho recente. "
        f"Maximo 200 palavras. Tom analitico, direto, editorial esportivo brasileiro."
    )
    message = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def salvar_no_supabase(jogo, analise):
    rodada = extrair_rodada(jogo["round"])
    titulo = f"Pre-jogo: {jogo['home_team']} vs {jogo['away_team']} - {rodada}"
    response = (
        supabase.table("articles")
        .insert({
            "game_id": jogo["id"],
            "type": "pre-jogo",
            "title": titulo,
            "body": analise,
            "published_at": datetime.now(timezone.utc).isoformat(),
        })
        .execute()
    )
    return response.data[0]


def run():
    print(f"[C1] Iniciando - {datetime.now()}")
    jogos = buscar_jogos_futuros_sem_analise()
    print(f"[C1] {len(jogos)} jogo(s) futuros sem analise pre-jogo")
    for jogo in jogos:
        try:
            rodada = extrair_rodada(jogo["round"])
            print(f"[C1] Analisando ({rodada}): {jogo['home_team']} vs {jogo['away_team']}")
            analise = gerar_analise(jogo)
            artigo = salvar_no_supabase(jogo, analise)
            print(f"[C1] Salvo: {artigo['title']}")
        except Exception as e:
            print(f"[C1] Erro: {e}")
    print("[C1] Concluido")


if __name__ == "__main__":
    run()
