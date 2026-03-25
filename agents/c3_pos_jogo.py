import os
import anthropic
from supabase import create_client
import requests
from datetime import datetime, timezone

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
claude = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
WEBFLOW_TOKEN = os.environ["WEBFLOW_TOKEN"]
WEBFLOW_COLLECTION_ID = os.environ["WEBFLOW_COLLECTION_ID"]

def buscar_jogos_do_dia():
    response = (
        supabase.table("games")
        .select("*")
        .eq("status", "FT")
        .is_("webflow_id", "null")
        .execute()
    )
    return response.data

def gerar_analise(jogo):
    prompt = (
        f"Voce e o analista de dados do Futedata. "
        f"Escreva uma analise pos-jogo em portugues para: "
        f"{jogo[chr(39)]home_team[chr(39)]} {jogo[chr(39)]home_goals[chr(39)]} x {jogo[chr(39)]away_goals[chr(39)]} {jogo[chr(39)]away_team[chr(39)]}. "
        f"{jogo[chr(39)]round[chr(39)]}. Maximo 200 palavras. Tom analitico e direto."
    )
    message = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

def salvar_no_supabase(jogo, analise):
    titulo = f"{jogo[chr(39)]home_team[chr(39)]} {jogo[chr(39)]home_goals[chr(39)]} x {jogo[chr(39)]away_goals[chr(39)]} {jogo[chr(39)]away_team[chr(39)]} - {jogo[chr(39)]round[chr(39)]}"
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
    supabase.table("articles").update({"webflow_id": webflow_id}).eq("id", article_id).execute()

def run():
    print(f"[C3] Iniciando - {datetime.now()}")
    jogos = buscar_jogos_do_dia()
    print(f"[C3] {len(jogos)} jogo(s) encontrado(s)")
    for jogo in jogos:
        try:
            print(f"[C3] Analisando: {jogo[chr(39)]home_team[chr(39)]} x {jogo[chr(39)]away_team[chr(39)]}")
            analise = gerar_analise(jogo)
            artigo = salvar_no_supabase(jogo, analise)
            webflow_id = publicar_no_webflow(artigo)
            marcar_como_publicado(artigo["id"], webflow_id)
            print(f"[C3] Publicado: {artigo[chr(39)]title[chr(39)]}")
        except Exception as e:
            print(f"[C3] Erro: {e}")
    print("[C3] Concluido")

if __name__ == "__main__":
    run()
