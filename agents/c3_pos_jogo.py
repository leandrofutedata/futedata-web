import os
import anthropic
from supabase import create_client
import requests
from datetime import datetime, timezone

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
claude = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
WEBFLOW_TOKEN = os.environ.get("WEBFLOW_TOKEN", "")
WEBFLOW_COLLECTION_ID = os.environ.get("WEBFLOW_COLLECTION_ID", "")


def buscar_jogos_sem_analise():
    """Busca jogos FT que ainda nao tem artigo pos-jogo na tabela articles."""
    # 1. Todos os jogos finalizados
    jogos_resp = (
        supabase.table("games")
        .select("*")
        .eq("status", "FT")
        .execute()
    )
    todos_jogos = jogos_resp.data or []

    if not todos_jogos:
        return []

    # 2. Todos os game_ids que ja tem artigo pos-jogo
    artigos_resp = (
        supabase.table("articles")
        .select("game_id")
        .eq("type", "pos-jogo")
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
    prompt = (
        f"Voce e o analista de dados do Futedata, site de estatisticas avancadas do Brasileirao. "
        f"Escreva uma analise pos-jogo em portugues para o seguinte jogo da {rodada} do Brasileirao Serie A 2025:\n\n"
        f"{jogo['home_team']} {jogo['home_goals']} x {jogo['away_goals']} {jogo['away_team']}\n"
        f"Rodada: {rodada}\n\n"
        f"Mencione explicitamente a {rodada} no texto. "
        f"Analise o resultado, o que significou para cada time na tabela, e destaque pontos taticos. "
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
    titulo = f"{jogo['home_team']} {jogo['home_goals']} x {jogo['away_goals']} {jogo['away_team']} - {rodada}"
    response = (
        supabase.table("articles")
        .insert({
            "game_id": jogo["id"],
            "type": "pos-jogo",
            "title": titulo,
            "body": analise,
            "published_at": datetime.now(timezone.utc).isoformat(),
        })
        .execute()
    )
    return response.data[0]


def publicar_no_webflow(artigo):
    if not WEBFLOW_TOKEN or not WEBFLOW_COLLECTION_ID:
        return None
    headers = {
        "Authorization": f"Bearer {WEBFLOW_TOKEN}",
        "accept-version": "1.0.0",
        "Content-Type": "application/json",
    }
    payload = {
        "fieldData": {
            "name": artigo["title"],
            "corpo": artigo["body"],
            "titulo": artigo["title"],
            "tipo": artigo["type"],
            "game-id": str(artigo["game_id"]),
        },
        "isDraft": False,
        "isArchived": False,
    }
    response = requests.post(
        f"https://api.webflow.com/v2/collections/{WEBFLOW_COLLECTION_ID}/items",
        json=payload,
        headers=headers,
    )
    response.raise_for_status()
    item_id = response.json()["id"]
    requests.post(
        f"https://api.webflow.com/v2/collections/{WEBFLOW_COLLECTION_ID}/items/publish",
        json={"itemIds": [item_id]},
        headers=headers,
    )
    return item_id


def marcar_como_publicado(article_id, webflow_id):
    if webflow_id:
        supabase.table("articles").update({"webflow_id": webflow_id}).eq("id", article_id).execute()


def run():
    print(f"[C3] Iniciando - {datetime.now()}")
    jogos = buscar_jogos_sem_analise()
    print(f"[C3] {len(jogos)} jogo(s) sem analise pos-jogo")
    for jogo in jogos:
        try:
            rodada = extrair_rodada(jogo["round"])
            print(f"[C3] Analisando ({rodada}): {jogo['home_team']} x {jogo['away_team']}")
            analise = gerar_analise(jogo)
            artigo = salvar_no_supabase(jogo, analise)
            webflow_id = publicar_no_webflow(artigo)
            marcar_como_publicado(artigo["id"], webflow_id)
            print(f"[C3] Salvo: {artigo['title']}")
        except Exception as e:
            print(f"[C3] Erro: {e}")
    print("[C3] Concluido")


if __name__ == "__main__":
    run()
