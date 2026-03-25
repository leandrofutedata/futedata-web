import schedule
import time
from agents.c3_pos_jogo import run as run_c3
from agents.c1_pre_jogo import run as run_c1

# Pos-jogo: roda toda noite as 23:30
schedule.every().day.at("23:30").do(run_c3)

# Pre-jogo: roda toda manha as 08:00
schedule.every().day.at("08:00").do(run_c1)

print("Futedata scheduler iniciado (C1 pre-jogo 08:00, C3 pos-jogo 23:30)")
while True:
    schedule.run_pending()
    time.sleep(60)
