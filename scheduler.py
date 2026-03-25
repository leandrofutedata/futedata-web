import schedule
import time
from agents.c3_pos_jogo import run as run_c3

schedule.every().day.at("23:30").do(run_c3)
print("Futedata scheduler iniciado")
while True:
    schedule.run_pending()
    time.sleep(60)
