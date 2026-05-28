import time
import random
import threading
import os

APP_NOMBRE = "FedeGame"

def limpiar():
    os.system('cls' if os.name == 'nt' else 'clear')

def generar_operacion():
    nivel = random.choice(["facil", "media", "dificil"])
    if nivel == "facil":
        a = random.randint(1, 9)
        b = random.randint(1, 9)
        op = random.choice(["+", "-"])
        if op == "+":
            expr = f"{a} + {b}"
            res = a + b
        else:
            expr = f"{a} - {b}"
            res = a - b
    elif nivel == "media":
        a = random.randint(1, 9)
        b = random.randint(1, 9)
        c = random.randint(1, 5)
        tipo = random.choice(["suma_mul", "mul_suma", "resta_mul"])
        if tipo == "suma_mul":
            expr = f"{a} + {b} * {c}"
            res = a + b * c
        elif tipo == "mul_suma":
            expr = f"{a} * {b} + {c}"
            res = a * b + c
        else:
            expr = f"{a} - {b} * {c}"
            res = a - b * c
    else:
        a = random.randint(1, 5)
        b = random.randint(1, 5)
        c = random.randint(1, 5)
        d = random.randint(1, 5)
        tipo = random.choice(["paren1", "paren2", "combo", "paren3"])
        if tipo == "paren1":
            expr = f"({a} + {b}) * {c}"
            res = (a + b) * c
        elif tipo == "paren2":
            expr = f"{a} * ({b} + {c})"
            res = a * (b + c)
        elif tipo == "combo":
            expr = f"{a} + {b} * {c} - {d}"
            res = a + b * c - d
        else:
            expr = f"({a} + {b}) * ({c} - {d})"
            res = (a + b) * (c - d)
    return expr, res

def cuenta_regresiva(segundos, contestado, tiempo_agotado):
    for i in range(segundos, 0, -1):
        if contestado[0]:
            return
        print(f"\r⏱  {i:2d} segundos restantes...   ", end="", flush=True)
        time.sleep(1)
    if not contestado[0]:
        tiempo_agotado[0] = True
        print("\r💥  ¡TIEMPO AGOTADO!               ")

def jugar_ronda(ronda, total):
    expr, respuesta = generar_operacion()
    contestado = [False]
    tiempo_agotado = [False]
    tiempo_limite = 30

    limpiar()
    print("=" * 50)
    print(f"🔥  RONDA {ronda} de {total}  🔥")
    print("=" * 50)
    print()
    print(f"💣  La bomba explotará en {tiempo_limite} segundos.")
    print(f"🔑  Código de desactivación: {expr}")
    print()

    hilo = threading.Thread(target=cuenta_regresiva, args=(tiempo_limite, contestado, tiempo_agotado))
    hilo.daemon = True
    hilo.start()

    try:
        entrada = input("✏️  Tu respuesta: ")
        contestado[0] = True

        if tiempo_agotado[0]:
            print("\n💥  ¡La bomba explotó! Llegaste tarde.")
            return 0
        elif entrada.strip() == str(respuesta):
            print("\n✅  ¡CORRECTO! Bomba desactivada.")
            return 1
        else:
            print(f"\n❌  ¡Código erróneo! La respuesta era: {respuesta}")
            return 0
    except:
        contestado[0] = True
        print("\n⚠️  Entrada inválida.")
        return 0

def main():
    limpiar()
    print("=" * 50)
    print(f"💣  {APP_NOMBRE}  💣")
    print("=" * 50)
    print("Resuelve las operaciones matemáticas")
    print("antes de que explote la bomba.")
    print()
    input("Presiona Enter para empezar...")

    rondas = 8
    puntaje = 0

    for ronda in range(1, rondas + 1):
        puntaje += jugar_ronda(ronda, rondas)
        if ronda < rondas:
            print()
            input("Presiona Enter para la siguiente ronda...")

    limpiar()
    print("=" * 50)
    print(f"  🎮  {APP_NOMBRE} TERMINADO  🎮")
    print("=" * 50)
    print(f"  Puntaje final: {puntaje}/{rondas}")
    if puntaje == rondas:
        print("  🏆  ¡PERFECTO! Eres un experto en desactivar bombas.")
    elif puntaje >= rondas // 2:
        print("  👍  Buen trabajo, sigue practicando.")
    else:
        print("  💥  ¡Boooom! Necesitas más práctica.")
    print("=" * 50)

if __name__ == "__main__":
    main()
