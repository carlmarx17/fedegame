import tkinter as tk
import random
import time
import math
import json
import os

COLORES = {
    "fondo": "#080b10",
    "panel": "#111827",
    "rojo": "#e94560",
    "verde": "#4ecca3",
    "naranja": "#f5a623",
    "blanco": "#eeeeee",
    "gris": "#9ca3af",
    "azul": "#2563eb",
    "violeta": "#8b5cf6",
    "cyan": "#22d3ee",
    "oscuro": "#020617",
}

APP_NOMBRE = "FedeGame"
ANCHO = 1100
ALTO = 760
CENTRO_X = ANCHO // 2
TIEMPO_BASE = 30
RONDAS_TOTALES = 8
VIDAS_INICIALES = 3
PENALIZACION_ERROR = 5
PISTA_COSTO = 25
RECORDS_ARCHIVO = "fedegame_records.json"
FREEZE_SEGUNDOS = 5
BONO_TIEMPO_SEGUNDOS = 10

HISTORIA = [
    "Alerta en la ciudad: una red de bombas matemáticas fue activada.",
    "Fede entra al centro de control para descifrar los códigos.",
    "Cada ronda abre una puerta hacia el núcleo del sistema.",
    "Los errores aceleran el detonador, pero las pistas pueden salvar la misión.",
    "El laboratorio enemigo libera códigos de nivel maestro.",
    "La torre central queda a un solo cálculo de apagarse.",
    "Si completas la ruta, FedeGame recupera la ciudad.",
]

MODOS = {
    "normal": {
        "nombre": "NORMAL",
        "rondas": 8,
        "vidas": 3,
        "tiempo": 30,
        "penalizacion": 5,
        "descripcion": "Equilibrado: 8 rondas, 3 vidas y bonus por velocidad.",
    },
    "rapido": {
        "nombre": "RÁPIDO",
        "rondas": 6,
        "vidas": 2,
        "tiempo": 20,
        "penalizacion": 4,
        "descripcion": "Partidas cortas con menos tiempo y más presión.",
    },
    "experto": {
        "nombre": "EXPERTO",
        "rondas": 10,
        "vidas": 2,
        "tiempo": 26,
        "penalizacion": 6,
        "descripcion": "Más rondas, menos margen y dificultad alta antes.",
    },
    "historia": {
        "nombre": "HISTORIA",
        "rondas": 12,
        "vidas": 4,
        "tiempo": 28,
        "penalizacion": 5,
        "descripcion": "Campaña larga con más misiones y dificultad gradual.",
    },
    "leyenda": {
        "nombre": "LEYENDA",
        "rondas": 14,
        "vidas": 2,
        "tiempo": 24,
        "penalizacion": 7,
        "descripcion": "El reto más largo y agresivo de FedeGame.",
    },
}


class FedeGame:
    def __init__(self, root):
        self.root = root
        self.root.title(f"💣 {APP_NOMBRE}")
        self.root.configure(bg=COLORES["fondo"])

        w = ANCHO
        h = ALTO
        sw = root.winfo_screenwidth()
        sh = root.winfo_screenheight()
        x = (sw - w) // 2
        y = (sh - h) // 2
        root.geometry(f"{w}x{h}+{x}+{y}")
        root.resizable(True, True)
        self.geometry_normal = f"{w}x{h}+{x}+{y}"
        self.maximizado = False

        self.rondas = RONDAS_TOTALES
        self.modo = "normal"
        self.ronda_actual = 0
        self.puntaje = 0
        self.puntos = 0
        self.vidas = VIDAS_INICIALES
        self.racha = 0
        self.mejor_racha = 0
        self.errores = 0
        self.explosiones = 0
        self.respondiendo = False
        self.respuesta_correcta = 0
        self.tiempo_restante = TIEMPO_BASE
        self.temporizador_id = None
        self.animacion_id = None
        self.intentos_ronda = 0
        self.dificultad_actual = "FÁCIL"
        self.tiempo_text = None
        self.barra_tiempo = None
        self.expr_actual = ""
        self.hint_usada = False
        self.historial = []
        self.freeze_cupones = 0
        self.escudos = 0
        self.bonos_tiempo = 0
        self.freeze_turnos = 0
        self.escudo_activo = False
        self.bonos_usados = 0
        self.records_data = self.cargar_records()
        self.record = self.records_data["record"]
        self.nombre_jugador = tk.StringVar(value="Fede")

        self.construir_ui()
        self.pantalla_inicio()

    def construir_ui(self):
        self.canvas = tk.Canvas(self.root, width=ANCHO, height=ALTO,
                                bg=COLORES["fondo"], highlightthickness=0)
        self.canvas.pack()

        self.fuente_titulo = ("Arial Black", 34, "bold")
        self.fuente_grande = ("Arial", 48, "bold")
        self.fuente_mediana = ("Arial", 24, "bold")
        self.fuente_normal = ("Arial", 16)
        self.fuente_pequeña = ("Arial", 12)

    def cargar_records(self):
        base = {"record": 0, "scores": []}
        if not os.path.exists(RECORDS_ARCHIVO):
            return base
        try:
            with open(RECORDS_ARCHIVO, "r", encoding="utf-8") as archivo:
                data = json.load(archivo)
            if not isinstance(data, dict):
                return base
            record = int(data.get("record", 0))
            scores = data.get("scores", [])
            if not isinstance(scores, list):
                scores = []
            return {"record": record, "scores": scores[:8]}
        except (OSError, ValueError, json.JSONDecodeError):
            return base

    def nombre_limpio(self):
        nombre = self.nombre_jugador.get().strip()
        if not nombre:
            return "Jugador"
        return nombre[:18]

    def guardar_score(self):
        nuevo_record = self.puntos > self.record
        self.record = max(self.record, self.puntos)
        scores = self.records_data.get("scores", [])
        scores.append({
            "nombre": self.nombre_limpio(),
            "puntos": self.puntos,
            "modo": MODOS[self.modo]["nombre"],
            "aciertos": self.puntaje,
            "rondas": self.rondas,
        })
        scores = sorted(scores, key=lambda item: item.get("puntos", 0), reverse=True)[:8]
        self.records_data = {"record": self.record, "scores": scores}
        try:
            with open(RECORDS_ARCHIVO, "w", encoding="utf-8") as archivo:
                json.dump(self.records_data, archivo, indent=2, ensure_ascii=False)
            return nuevo_record
        except OSError:
            return nuevo_record

    def limpiar(self):
        self.canvas.delete("all")
        if self.temporizador_id:
            self.root.after_cancel(self.temporizador_id)
            self.temporizador_id = None
        if self.animacion_id:
            self.root.after_cancel(self.animacion_id)
            self.animacion_id = None

    def pantalla_inicio(self):
        self.limpiar()
        c = self.canvas

        c.create_rectangle(0, 0, ANCHO, ALTO, fill=COLORES["fondo"], outline="")

        for i in range(36):
            x = random.randint(0, ANCHO)
            y = random.randint(0, ALTO)
            s = random.randint(1, 4)
            color = random.choice([COLORES["gris"], COLORES["cyan"], COLORES["violeta"]])
            c.create_oval(x, y, x + s, y + s, fill=color, outline="")

        c.create_text(CENTRO_X, 105, text="💣", font=("Arial", 84),
                      fill=COLORES["rojo"])
        c.create_text(CENTRO_X, 195, text=APP_NOMBRE,
                      font=self.fuente_titulo, fill=COLORES["cyan"])
        c.create_text(CENTRO_X, 245, text="Desactiva bombas resolviendo códigos matemáticos\ncon vidas, rachas y dificultad progresiva",
                      font=self.fuente_normal, fill=COLORES["gris"], justify="center")

        c.create_rectangle(120, 258, 980, 282, fill=COLORES["oscuro"], outline="")
        c.create_text(CENTRO_X, 270, text=HISTORIA[0],
                      font=("Arial", 11, "italic"), fill=COLORES["naranja"])

        c.create_rectangle(260, 292, 840, 392, fill=COLORES["panel"],
                           outline=COLORES["azul"], width=2)
        c.create_text(CENTRO_X, 317, text="Modos, récord, pistas, rachas y bonus por velocidad",
                      font=("Arial", 15, "bold"), fill=COLORES["blanco"])
        c.create_text(CENTRO_X, 352, text="Cada error resta tiempo. La dificultad sube mientras avanzas.",
                      font=self.fuente_pequeña, fill=COLORES["gris"])
        c.create_text(CENTRO_X, 377, text=f"Récord actual: {self.record} pts",
                      font=self.fuente_pequeña, fill=COLORES["cyan"])

        c.create_text(CENTRO_X, 425, text="Nombre para guardar score",
                      font=self.fuente_pequeña, fill=COLORES["gris"])
        self.entry_nombre = tk.Entry(self.root, textvariable=self.nombre_jugador,
                                     font=("Arial", 16, "bold"),
                                     bg=COLORES["panel"], fg=COLORES["cyan"],
                                     insertbackground=COLORES["cyan"],
                                     bd=0, justify="center", width=18)
        self.canvas.create_window(CENTRO_X, 455, window=self.entry_nombre)

        self.crear_boton_modo(250, 515, "NORMAL", "normal")
        self.crear_boton_modo(420, 515, "RÁPIDO", "rapido")
        self.crear_boton_modo(590, 515, "EXPERTO", "experto")
        self.crear_boton_modo(760, 515, "HISTORIA", "historia")
        self.crear_boton_modo(CENTRO_X, 585, "LEYENDA", "leyenda")

        c.create_text(CENTRO_X, 640, text="Elige un modo para empezar",
                      font=self.fuente_pequeña, fill=COLORES["gris"])
        c.create_text(CENTRO_X, 695, text="Presiona ESPACIO para modo NORMAL",
                      font=("Arial", 11, "italic"), fill=COLORES["gris"])

        self.crear_boton_maximizar(930, 42)
        self.crear_boton_salir(1010, 42)
        self.root.bind("<space>", lambda e: self.empezar_juego("normal"))

    def crear_boton_modo(self, x, y, texto, modo):
        boton = tk.Button(
            self.root, text=texto,
            font=("Arial Black", 18, "bold"),
            bg=COLORES["azul"], fg=COLORES["blanco"],
            activebackground="#1d4ed8", activeforeground=COLORES["blanco"],
            bd=0, padx=22, pady=13, cursor="hand2",
            command=lambda: self.empezar_juego(modo)
        )
        self.canvas.create_window(x, y, window=boton)

    def crear_boton_salir(self, x, y):
        boton = tk.Button(
            self.root, text="SALIR",
            font=("Arial Black", 11, "bold"),
            bg=COLORES["rojo"], fg=COLORES["blanco"],
            activebackground="#c0392b", activeforeground=COLORES["blanco"],
            bd=0, padx=18, pady=8, cursor="hand2",
            command=self.root.destroy
        )
        self.canvas.create_window(x, y, window=boton)

    def crear_boton_maximizar(self, x, y):
        boton = tk.Button(
            self.root, text="MAX",
            font=("Arial Black", 11, "bold"),
            bg=COLORES["panel"], fg=COLORES["cyan"],
            activebackground=COLORES["oscuro"], activeforeground=COLORES["cyan"],
            bd=0, padx=18, pady=8, cursor="hand2",
            command=self.toggle_maximizar
        )
        self.canvas.create_window(x, y, window=boton)

    def toggle_maximizar(self):
        self.maximizado = not self.maximizado
        try:
            self.root.state("zoomed" if self.maximizado else "normal")
        except tk.TclError:
            try:
                self.root.attributes("-zoomed", self.maximizado)
            except tk.TclError:
                if self.maximizado:
                    sw = self.root.winfo_screenwidth()
                    sh = self.root.winfo_screenheight()
                    self.root.geometry(f"{sw}x{sh}+0+0")
                else:
                    self.root.geometry(self.geometry_normal)

    def empezar_juego(self, modo="normal"):
        self.root.unbind("<space>")
        self.modo = modo
        config = MODOS[self.modo]
        self.rondas = config["rondas"]
        self.ronda_actual = 0
        self.puntaje = 0
        self.puntos = 0
        self.vidas = config["vidas"]
        self.racha = 0
        self.mejor_racha = 0
        self.errores = 0
        self.explosiones = 0
        self.historial = []
        self.freeze_cupones = 2 if modo in ("historia", "leyenda") else 1
        self.escudos = 1
        self.bonos_tiempo = 2 if modo in ("normal", "historia") else 1
        self.freeze_turnos = 0
        self.escudo_activo = False
        self.bonos_usados = 0
        self.siguiente_ronda()

    def generar_operacion(self):
        if self.modo == "leyenda" and self.ronda_actual >= 9:
            nivel = random.choice(["leyenda", "maestra", "maestra"])
        elif self.modo == "leyenda" and self.ronda_actual >= 4:
            nivel = random.choice(["maestra", "dificil", "leyenda"])
        elif self.modo == "historia" and self.ronda_actual >= 10:
            nivel = random.choice(["leyenda", "maestra", "dificil"])
        elif self.modo == "historia" and self.ronda_actual >= 6:
            nivel = random.choice(["maestra", "dificil", "media"])
        elif self.modo == "experto" and self.ronda_actual >= 7:
            nivel = random.choice(["maestra", "dificil", "dificil"])
        elif self.modo == "experto" and self.ronda_actual >= 3:
            nivel = random.choice(["dificil", "media", "maestra"])
        elif self.ronda_actual <= 2:
            nivel = "facil"
        elif self.ronda_actual <= 5:
            nivel = random.choice(["media", "media", "facil"])
        else:
            nivel = random.choice(["dificil", "dificil", "media", "maestra"])

        if nivel == "facil":
            a = random.randint(2, 15)
            b = random.randint(1, 12)
            tipo = random.choice(["+", "-", "doble", "doble_suma", "mitad"])
            if tipo == "+":
                expr = f"{a} + {b}"
                res = a + b
            elif tipo == "-":
                expr = f"{a} - {b}"
                res = a - b
            elif tipo == "doble":
                c = random.randint(1, 9)
                expr = f"{a} + {b} - {c}"
                res = a + b - c
            elif tipo == "doble_suma":
                expr = f"2 × {a} + {b}"
                res = 2 * a + b
            else:
                par = random.randint(2, 12) * 2
                expr = f"{par} ÷ 2 + {b}"
                res = par // 2 + b
            dif = "FÁCIL"
        elif nivel == "media":
            a = random.randint(1, 9)
            b = random.randint(1, 9)
            c = random.randint(2, 6)
            divisor = random.randint(2, 6)
            dividendo = divisor * random.randint(2, 9)
            tipo = random.choice([
                "suma_mul", "mul_suma", "resta_mul", "division",
                "cuadrado_suma", "paren_div", "triple"
            ])
            if tipo == "suma_mul":
                expr = f"{a} + {b} × {c}"
                res = a + b * c
            elif tipo == "mul_suma":
                expr = f"{a} × {b} + {c}"
                res = a * b + c
            elif tipo == "resta_mul":
                expr = f"{a} - {b} × {c}"
                res = a - b * c
            elif tipo == "division":
                expr = f"{dividendo} ÷ {divisor} + {a}"
                res = dividendo // divisor + a
            elif tipo == "cuadrado_suma":
                expr = f"{c}² + {a}"
                res = c * c + a
            elif tipo == "paren_div":
                expr = f"({dividendo} + {divisor}) ÷ {divisor}"
                res = (dividendo + divisor) // divisor
            else:
                expr = f"{a} + {b} + {c} × 2"
                res = a + b + c * 2
            dif = "MEDIA"
        elif nivel == "dificil":
            a = random.randint(2, 8)
            b = random.randint(1, 8)
            c = random.randint(2, 7)
            d = random.randint(1, 6)
            tipo = random.choice([
                "paren1", "paren2", "combo", "paren3", "doble_mul",
                "cuadrado_resta", "division_combo", "paren_doble"
            ])
            if tipo == "paren1":
                expr = f"({a} + {b}) × {c}"
                res = (a + b) * c
            elif tipo == "paren2":
                expr = f"{a} × ({b} + {c})"
                res = a * (b + c)
            elif tipo == "combo":
                expr = f"{a} + {b} × {c} - {d}"
                res = a + b * c - d
            elif tipo == "paren3":
                expr = f"({a} + {b}) × ({c} - {d})"
                res = (a + b) * (c - d)
            elif tipo == "doble_mul":
                expr = f"{a} × {b} + {c} × {d}"
                res = a * b + c * d
            elif tipo == "cuadrado_resta":
                expr = f"({a} + {b})² - {c}"
                res = (a + b) ** 2 - c
            elif tipo == "division_combo":
                divisor = random.randint(2, 6)
                base = divisor * random.randint(4, 12)
                expr = f"{base} ÷ {divisor} + {a} × {b}"
                res = base // divisor + a * b
            else:
                expr = f"({a} + {b}) × ({c} + {d}) - {a}"
                res = (a + b) * (c + d) - a
            dif = "DIFÍCIL"
        elif nivel == "maestra":
            a = random.randint(2, 9)
            b = random.randint(2, 9)
            c = random.randint(2, 8)
            d = random.randint(1, 7)
            divisor = random.randint(2, 6)
            base = divisor * random.randint(5, 15)
            tipo = random.choice(["mixta1", "mixta2", "mixta3", "potencia", "balance"])
            if tipo == "mixta1":
                expr = f"({a} × {b}) - ({c} × {d}) + {base} ÷ {divisor}"
                res = a * b - c * d + base // divisor
            elif tipo == "mixta2":
                expr = f"({a} + {b} + {c}) × {d} - {base} ÷ {divisor}"
                res = (a + b + c) * d - base // divisor
            elif tipo == "mixta3":
                expr = f"{a}² + ({b} × {c}) - {d}"
                res = a * a + b * c - d
            elif tipo == "potencia":
                expr = f"({a} + {d})² - {b} × {c}"
                res = (a + d) ** 2 - b * c
            else:
                expr = f"({base} ÷ {divisor}) × ({a} - {d}) + {b}"
                res = (base // divisor) * (a - d) + b
            dif = "MAESTRA"
        else:
            a = random.randint(3, 12)
            b = random.randint(2, 10)
            c = random.randint(2, 9)
            d = random.randint(1, 8)
            divisor = random.randint(2, 6)
            base = divisor * random.randint(8, 20)
            tipo = random.choice(["triple_combo", "doble_potencia", "torre", "division_final", "gran_balance"])
            if tipo == "triple_combo":
                expr = f"({a} + {b}) × ({c} + {d}) - {base} ÷ {divisor}"
                res = (a + b) * (c + d) - base // divisor
            elif tipo == "doble_potencia":
                expr = f"{a}² - {b}² + {c} × {d}"
                res = a * a - b * b + c * d
            elif tipo == "torre":
                expr = f"({base} ÷ {divisor} + {a}) × 2 - {b}"
                res = (base // divisor + a) * 2 - b
            elif tipo == "division_final":
                expr = f"(({a} + {b}) × {divisor}) ÷ {divisor} + {c}²"
                res = ((a + b) * divisor) // divisor + c * c
            else:
                expr = f"({a} × {b}) + ({c} × {d}) - ({base} ÷ {divisor})"
                res = a * b + c * d - base // divisor
            dif = "LEYENDA"
        return expr, res, dif

    def siguiente_ronda(self):
        self.ronda_actual += 1
        self.intentos_ronda = 0

        if self.ronda_actual > self.rondas:
            self.pantalla_final()
            return

        expr, res, dif = self.generar_operacion()
        self.expr_actual = expr
        self.respuesta_correcta = res
        self.dificultad_actual = dif
        self.hint_usada = False
        self.freeze_turnos = 0
        self.escudo_activo = False
        self.tiempo_restante = max(12, MODOS[self.modo]["tiempo"] - (self.ronda_actual - 1) * 2)
        self.respondiendo = True

        self.mostrar_ronda(expr, res, dif)

    def texto_historia_ronda(self):
        indice = min(len(HISTORIA) - 1, max(0, (self.ronda_actual - 1) // 2))
        etapa = HISTORIA[indice]
        return f"Misión {self.ronda_actual}: {etapa}"

    def mostrar_ronda(self, expr, res, dif):
        self.limpiar()
        c = self.canvas

        c.create_rectangle(0, 0, ANCHO, ALTO, fill=COLORES["fondo"], outline="")

        colores_dif = {"FÁCIL": COLORES["verde"],
                       "MEDIA": COLORES["naranja"],
                       "DIFÍCIL": COLORES["rojo"],
                       "MAESTRA": COLORES["violeta"],
                       "LEYENDA": COLORES["cyan"]}

        c.create_rectangle(24, 16, ANCHO - 24, 64, fill=COLORES["panel"],
                           outline=COLORES["azul"], width=2)

        c.create_text(48, 40, text=f"{APP_NOMBRE} · {MODOS[self.modo]['nombre']} · RONDA {self.ronda_actual}/{self.rondas}",
                      font=self.fuente_normal, fill=COLORES["blanco"], anchor="w")
        c.create_text(460, 40, text=f"🏆 {self.puntos} pts",
                      font=self.fuente_normal, fill=COLORES["cyan"])
        c.create_text(675, 40, text=f"❤ {self.vidas}",
                      font=self.fuente_normal, fill=COLORES["rojo"])
        c.create_text(ANCHO - 48, 40, text=f"⭐ {dif}",
                      font=self.fuente_normal, fill=colores_dif[dif], anchor="e")

        self.barra_fondo = c.create_rectangle(72, 86, ANCHO - 72, 112,
                                               fill=COLORES["oscuro"],
                                               outline=COLORES["gris"], width=2)
        self.barra_tiempo = c.create_rectangle(72, 86, ANCHO - 72, 112,
                                                fill=COLORES["verde"],
                                                outline="", width=0)
        c.create_text(CENTRO_X, 132, text=self.texto_historia_ronda(),
                      font=("Arial", 12, "italic"), fill=COLORES["gris"])

        c.create_text(CENTRO_X, 165, text="💣  BOMBA ACTIVA  💣",
                      font=("Arial Black", 20), fill=COLORES["rojo"])

        self.bomba_emoji = c.create_text(CENTRO_X, 235, text="💣",
                                         font=("Arial", 60), fill=COLORES["rojo"])

        c.create_text(CENTRO_X, 304, text="Código de desactivación:",
                      font=self.fuente_normal, fill=COLORES["gris"])
        c.create_text(CENTRO_X, 362, text=expr,
                      font=("Courier New", 40, "bold"), fill=COLORES["naranja"])

        self.tiempo_text = c.create_text(CENTRO_X, 410, text=f"⏱  {self.tiempo_restante} segundos",
                                         font=self.fuente_mediana, fill=COLORES["blanco"],
                                         tags="tiempo_text")
        c.create_text(CENTRO_X, 444, text=f"Racha: {self.racha} · Error: -{MODOS[self.modo]['penalizacion']}s · Pista: -{PISTA_COSTO} pts",
                      font=self.fuente_pequeña, fill=COLORES["gris"])
        self.texto_bonos = c.create_text(
            CENTRO_X, 695, text=self.texto_estado_bonos(),
            font=self.fuente_pequeña, fill=COLORES["naranja"]
        )

        self.texto_resultado = c.create_text(CENTRO_X, 650, text="",
                                              font=self.fuente_normal, fill=COLORES["blanco"])
        self.texto_pista = c.create_text(CENTRO_X, 475, text="",
                                         font=self.fuente_pequeña, fill=COLORES["cyan"])

        self.entry_var = tk.StringVar()
        self.entry = tk.Entry(self.root, textvariable=self.entry_var,
                               font=("Arial", 28, "bold"),
                               bg=COLORES["panel"], fg=COLORES["naranja"],
                               insertbackground=COLORES["naranja"],
                               bd=0, justify="center",
                               width=12)
        self.entry.insert(0, "")
        self.entry_window = c.create_window(450, 530, window=self.entry)
        self.entry.focus_set()

        self.boton_responder = tk.Button(
            self.root, text="💥  DESACTIVAR",
            font=("Arial Black", 14, "bold"),
            bg=COLORES["rojo"], fg=COLORES["blanco"],
            activebackground="#c0392b", activeforeground=COLORES["blanco"],
            bd=0, padx=30, pady=10, cursor="hand2",
            command=self.verificar_respuesta
        )
        self.boton_window = c.create_window(450, 592, window=self.boton_responder)

        self.boton_pista = tk.Button(
            self.root, text="? PISTA",
            font=("Arial Black", 12, "bold"),
            bg=COLORES["panel"], fg=COLORES["cyan"],
            activebackground=COLORES["oscuro"], activeforeground=COLORES["cyan"],
            bd=0, padx=22, pady=10, cursor="hand2",
            command=self.mostrar_pista
        )
        self.canvas.create_window(680, 530, window=self.boton_pista)
        c.create_text(175, 475, text="Bonos de misión",
                      font=self.fuente_pequeña, fill=COLORES["naranja"])
        self.crear_boton_bono(175, 515, "FREEZE", self.usar_freeze)
        self.crear_boton_bono(175, 565, "ESCUDO", self.usar_escudo)
        self.crear_boton_bono(175, 615, "+10s", self.usar_bono_tiempo)
        self.crear_teclado_numerico(680, 592)
        self.crear_boton_maximizar(930, 710)
        self.crear_boton_salir(1010, 710)

        self.root.bind("<Return>", lambda e: self.verificar_respuesta())
        self.root.bind("<BackSpace>", lambda e: self.borrar_numero())
        self.root.bind("<Escape>", lambda e: self.entry_var.set(""))

        self.temporizador_id = self.root.after(1000, self.actualizar_tiempo)
        self.animacion_id = self.root.after(50, self.animar_bomba)

    def crear_teclado_numerico(self, x, y):
        frame = tk.Frame(self.root, bg=COLORES["fondo"])
        for valor in ["7", "8", "9", "4", "5", "6", "1", "2", "3", "-", "0", "⌫"]:
            texto = valor
            comando = (lambda v=valor: self.agregar_numero(v)) if valor != "⌫" else self.borrar_numero
            boton = tk.Button(
                frame, text=texto, width=3,
                font=("Arial", 11, "bold"),
                bg=COLORES["panel"], fg=COLORES["blanco"],
                activebackground=COLORES["azul"], activeforeground=COLORES["blanco"],
                bd=0, command=comando
            )
            fila = len(frame.winfo_children()) // 3
            col = (len(frame.winfo_children()) - 1) % 3
            boton.grid(row=fila, column=col, padx=2, pady=2)
        self.canvas.create_window(x + 120, y, window=frame)

    def crear_boton_bono(self, x, y, texto, comando):
        boton = tk.Button(
            self.root, text=texto,
            font=("Arial Black", 10, "bold"),
            bg=COLORES["oscuro"], fg=COLORES["naranja"],
            activebackground=COLORES["panel"], activeforeground=COLORES["blanco"],
            bd=0, padx=12, pady=8, cursor="hand2",
            command=comando
        )
        self.canvas.create_window(x, y, window=boton)

    def texto_estado_bonos(self):
        estado_freeze = f"FREEZE x{self.freeze_cupones}"
        if self.freeze_turnos > 0:
            estado_freeze += f" ({self.freeze_turnos}s)"
        estado_escudo = "ACTIVO" if self.escudo_activo else f"x{self.escudos}"
        return f"Cupones: {estado_freeze} · ESCUDO {estado_escudo} · BONO +10s x{self.bonos_tiempo}"

    def actualizar_estado_bonos(self):
        if hasattr(self, "texto_bonos") and self.texto_bonos:
            self.canvas.itemconfig(self.texto_bonos, text=self.texto_estado_bonos())

    def usar_freeze(self):
        if not self.respondiendo or self.freeze_cupones <= 0:
            return
        self.freeze_cupones -= 1
        self.freeze_turnos += FREEZE_SEGUNDOS
        self.bonos_usados += 1
        self.canvas.itemconfig(self.texto_resultado,
                               text=f"🧊  Cupón FREEZE: tiempo congelado {FREEZE_SEGUNDOS}s",
                               fill=COLORES["cyan"])
        self.actualizar_estado_bonos()

    def usar_escudo(self):
        if not self.respondiendo or self.escudos <= 0 or self.escudo_activo:
            return
        self.escudos -= 1
        self.escudo_activo = True
        self.bonos_usados += 1
        self.canvas.itemconfig(self.texto_resultado,
                               text="🛡  Escudo listo: absorberá el próximo error",
                               fill=COLORES["verde"])
        self.actualizar_estado_bonos()

    def usar_bono_tiempo(self):
        if not self.respondiendo or self.bonos_tiempo <= 0:
            return
        self.bonos_tiempo -= 1
        self.bonos_usados += 1
        self.tiempo_restante += BONO_TIEMPO_SEGUNDOS
        self.canvas.itemconfig(self.texto_resultado,
                               text=f"⏱  Bono activado: +{BONO_TIEMPO_SEGUNDOS}s",
                               fill=COLORES["verde"])
        self.actualizar_barra_tiempo()
        self.actualizar_estado_bonos()

    def agregar_numero(self, valor):
        if not self.respondiendo:
            return
        actual = self.entry_var.get()
        if valor == "-" and actual:
            return
        self.entry_var.set(actual + valor)
        self.entry.focus_set()

    def borrar_numero(self):
        if not self.respondiendo:
            return
        self.entry_var.set(self.entry_var.get()[:-1])
        self.entry.focus_set()

    def mostrar_pista(self):
        if not self.respondiendo or self.hint_usada:
            return
        self.hint_usada = True
        self.puntos = max(0, self.puntos - PISTA_COSTO)
        signo = "positivo" if self.respuesta_correcta > 0 else "negativo" if self.respuesta_correcta < 0 else "cero"
        paridad = "par" if self.respuesta_correcta % 2 == 0 else "impar"
        cercania = (self.respuesta_correcta // 10) * 10
        pista = f"Pista: el resultado es {signo}, {paridad}, cerca de {cercania}."
        self.canvas.itemconfig(self.texto_pista, text=pista)
        self.canvas.itemconfig(self.texto_resultado, text=f"Pista usada: -{PISTA_COSTO} pts",
                               fill=COLORES["cyan"])

    def animar_bomba(self):
        if not self.respondiendo:
            return
        t = time.time()
        vibracion = 3 * math.sin(t * 8)
        c = self.canvas
        c.coords(self.bomba_emoji, CENTRO_X + vibracion, 235)
        self.animacion_id = self.root.after(50, self.animar_bomba)

    def actualizar_tiempo(self):
        if not self.respondiendo:
            return
        if self.freeze_turnos > 0:
            self.freeze_turnos -= 1
        else:
            self.tiempo_restante -= 1
        c = self.canvas

        c.itemconfig(self.texto_resultado, text="")
        c.itemconfig(self.tiempo_text, text=f"⏱  {self.tiempo_restante} segundos")

        tiempo_ronda = max(12, MODOS[self.modo]["tiempo"] - (self.ronda_actual - 1) * 2)
        fraccion = max(0, self.tiempo_restante / tiempo_ronda)
        c.coords(self.barra_tiempo, 72, 86, 72 + int((ANCHO - 144) * fraccion), 112)

        if self.tiempo_restante <= 10:
            color = COLORES["rojo"]
            parpadeo = self.tiempo_restante % 2 == 0
            c.itemconfig("tiempo_text", fill=COLORES["rojo"])
            c.itemconfig(self.barra_tiempo, fill=COLORES["rojo"])
            if parpadeo:
                c.itemconfig(self.bomba_emoji, text="💥")
            else:
                c.itemconfig(self.bomba_emoji, text="💣")
        elif self.tiempo_restante <= 20:
            c.itemconfig("tiempo_text", fill=COLORES["naranja"])
            c.itemconfig(self.barra_tiempo, fill=COLORES["naranja"])
            c.itemconfig(self.bomba_emoji, text="💣")
        else:
            c.itemconfig(self.barra_tiempo, fill=COLORES["verde"])

        self.actualizar_estado_bonos()

        if self.tiempo_restante <= 0:
            self.tiempo_agotado()
            return

        self.temporizador_id = self.root.after(1000, self.actualizar_tiempo)

    def verificar_respuesta(self):
        if not self.respondiendo:
            return
        self.respondiendo = False
        self.root.unbind("<Return>")

        entrada = self.entry_var.get().strip()
        c = self.canvas

        if not entrada:
            self.respondiendo = True
            self.root.bind("<Return>", lambda e: self.verificar_respuesta())
            return

        try:
            respuesta = int(entrada)
        except ValueError:
            c.itemconfig(self.texto_resultado,
                         text="⚠️  Ingresa un número válido",
                         fill=COLORES["naranja"])
            self.respondiendo = True
            self.root.bind("<Return>", lambda e: self.verificar_respuesta())
            return

        if respuesta == self.respuesta_correcta:
            self.puntaje += 1
            self.racha += 1
            self.mejor_racha = max(self.mejor_racha, self.racha)
            bonus_tiempo = max(0, self.tiempo_restante)
            bonus_racha = self.racha * 5
            puntos_ronda = 100 + bonus_tiempo * 3 + bonus_racha
            if self.hint_usada:
                puntos_ronda = max(25, puntos_ronda - PISTA_COSTO)
            self.puntos += puntos_ronda
            self.historial.append({
                "ronda": self.ronda_actual,
                "expr": self.expr_actual,
                "respuesta": self.respuesta_correcta,
                "estado": "OK",
                "puntos": puntos_ronda,
            })
            c.itemconfig(self.texto_resultado,
                         text=f"✅  ¡Correcto! +{puntos_ronda} pts",
                         fill=COLORES["verde"])
            c.itemconfig(self.bomba_emoji, text="✅")
            c.create_text(CENTRO_X, 700, text="🎉", font=("Arial", 30),
                          fill=COLORES["verde"])
            self.recompensa_visual(exito=True)
        else:
            self.intentos_ronda += 1
            self.racha = 0
            if self.escudo_activo:
                self.escudo_activo = False
                c.itemconfig(self.texto_resultado,
                             text="🛡  Escudo consumido: error bloqueado",
                             fill=COLORES["verde"])
                self.actualizar_estado_bonos()
                self.respondiendo = True
                self.root.bind("<Return>", lambda e: self.verificar_respuesta())
                self.entry_var.set("")
                self.entry.focus_set()
                return
            self.errores += 1
            self.tiempo_restante = max(0, self.tiempo_restante - MODOS[self.modo]["penalizacion"])
            c.itemconfig(self.texto_resultado,
                         text=f"❌  Código erróneo. -{MODOS[self.modo]['penalizacion']}s",
                         fill=COLORES["rojo"])
            self.actualizar_barra_tiempo()
            if self.tiempo_restante <= 0:
                self.tiempo_agotado()
                return
            self.respondiendo = True
            self.root.bind("<Return>", lambda e: self.verificar_respuesta())
            self.entry_var.set("")
            self.entry.focus_set()
            return

        self.root.after(2000, self.transicion_ronda)

    def actualizar_barra_tiempo(self):
        tiempo_ronda = max(12, MODOS[self.modo]["tiempo"] - (self.ronda_actual - 1) * 2)
        fraccion = max(0, self.tiempo_restante / tiempo_ronda)
        self.canvas.coords(self.barra_tiempo, 72, 86, 72 + int((ANCHO - 144) * fraccion), 112)
        self.canvas.itemconfig(self.tiempo_text, text=f"⏱  {self.tiempo_restante} segundos")

    def recompensa_visual(self, exito=True):
        c = self.canvas
        colores = [COLORES["verde"], COLORES["naranja"],
                   COLORES["rojo"], COLORES["violeta"], COLORES["blanco"]]
        for _ in range(12):
            x = random.randint(120, 800)
            y = random.randint(330, 620)
            color = random.choice(colores)
            t = random.choice(["⭐", "✨", "💥", "🔥", "💫"])
            c.create_text(x, y, text=t, font=("Arial", random.randint(14, 24)),
                          fill=color)

    def tiempo_agotado(self):
        self.respondiendo = False
        self.root.unbind("<Return>")
        c = self.canvas

        c.itemconfig(self.texto_resultado,
                     text=f"💥  ¡BOOM! El tiempo se acabó. Respuesta: {self.respuesta_correcta}",
                     fill=COLORES["rojo"])
        c.itemconfig(self.bomba_emoji, text="💥")
        self.vidas -= 1
        self.racha = 0
        self.explosiones += 1
        self.historial.append({
            "ronda": self.ronda_actual,
            "expr": self.expr_actual,
            "respuesta": self.respuesta_correcta,
            "estado": "BOOM",
            "puntos": 0,
        })

        for _ in range(20):
            x = random.randint(50, ANCHO - 50)
            y = random.randint(260, ALTO - 40)
            c.create_text(x, y, text="💥", font=("Arial", random.randint(12, 30)),
                          fill=COLORES["rojo"])

        if self.vidas <= 0:
            self.root.after(2500, self.pantalla_final)
        else:
            self.root.after(2500, self.transicion_ronda)

    def transicion_ronda(self):
        if self.ronda_actual >= self.rondas:
            self.pantalla_final()
        else:
            self.pantalla_entre_rondas()

    def pantalla_entre_rondas(self):
        self.limpiar()
        c = self.canvas

        c.create_rectangle(0, 0, ANCHO, ALTO, fill=COLORES["fondo"], outline="")
        c.create_text(CENTRO_X, 220, text=f"🔥  RONDA {self.ronda_actual} COMPLETADA  🔥",
                      font=self.fuente_titulo, fill=COLORES["naranja"])
        c.create_text(CENTRO_X, 300, text=f"🏆  Aciertos: {self.puntaje}/{self.ronda_actual} · {self.puntos} pts",
                      font=self.fuente_mediana, fill=COLORES["blanco"])
        c.create_text(CENTRO_X, 340, text=f"❤ Vidas: {self.vidas} · Mejor racha: {self.mejor_racha}",
                      font=self.fuente_normal, fill=COLORES["gris"])

        if self.puntaje == self.ronda_actual:
            c.create_text(CENTRO_X, 400, text="🔥  ¡Racha perfecta!  🔥",
                          font=self.fuente_normal, fill=COLORES["verde"])
        elif self.puntaje >= self.ronda_actual // 2:
            c.create_text(CENTRO_X, 400, text="👍  ¡Bien encaminado!",
                          font=self.fuente_normal, fill=COLORES["naranja"])
        else:
            c.create_text(CENTRO_X, 400, text="💪  ¡Tú puedes!",
                          font=self.fuente_normal, fill=COLORES["gris"])

        self.boton_sig = tk.Button(
            self.root, text="⏩  SIGUIENTE RONDA",
            font=("Arial Black", 16, "bold"),
            bg=COLORES["azul"], fg=COLORES["blanco"],
            activebackground="#0f3460", activeforeground=COLORES["blanco"],
            bd=0, padx=30, pady=12, cursor="hand2",
            command=self.siguiente_ronda
        )
        self.canvas.create_window(CENTRO_X, 500, window=self.boton_sig)
        self.crear_boton_maximizar(930, 710)
        self.crear_boton_salir(1010, 710)

        self.root.bind("<Return>", lambda e: self.siguiente_ronda())
        self.root.bind("<space>", lambda e: self.siguiente_ronda())

    def pantalla_final(self):
        self.limpiar()
        self.root.unbind("<Return>")
        self.root.unbind("<space>")
        self.root.unbind("<BackSpace>")
        self.root.unbind("<Escape>")
        c = self.canvas
        nuevo_record = self.guardar_score()

        c.create_rectangle(0, 0, ANCHO, ALTO, fill=COLORES["fondo"], outline="")

        for _ in range(30):
            x = random.randint(0, ANCHO)
            y = random.randint(0, ALTO)
            emojis = ["⭐", "🎉", "✨", "🏆", "💣", "🔥", "🎊"]
            c.create_text(x, y, text=random.choice(emojis),
                          font=("Arial", random.randint(10, 24)),
                          fill=random.choice([COLORES["rojo"], COLORES["naranja"],
                                              COLORES["verde"], COLORES["violeta"]]))

        gano = self.vidas > 0 and self.ronda_actual >= self.rondas
        titulo_final = "🎮  FEDEGAME TERMINADO  🎮" if gano else "💥  FEDEGAME: MISIÓN FALLIDA  💥"
        c.create_text(CENTRO_X, 80, text=titulo_final,
                      font=self.fuente_titulo, fill=COLORES["cyan"])
        c.create_text(CENTRO_X, 112, text="aura" if gano else "laura",
                      font=("Arial Black", 22, "bold"),
                      fill=COLORES["verde"] if gano else COLORES["rojo"])

        record_texto = "NUEVO RÉCORD" if nuevo_record else f"Récord: {self.record} pts"
        c.create_text(CENTRO_X, 158, text=f"{self.nombre_limpio()} · 🏆  {self.puntos} puntos · {record_texto}",
                      font=self.fuente_mediana, fill=COLORES["verde"])

        porcentaje = self.puntaje / self.rondas * 100
        if porcentaje == 100:
            mensaje = "🏆  ¡PERFECTO! ¡Eres un maestro desactivador de bombas!  🏆"
            color = COLORES["verde"]
        elif porcentaje >= 80:
            mensaje = "🔥  ¡Excelente trabajo, casi impecable!  🔥"
            color = COLORES["verde"]
        elif porcentaje >= 60:
            mensaje = "👍  ¡Buen trabajo! Sigue practicando.  👍"
            color = COLORES["naranja"]
        elif porcentaje >= 40:
            mensaje = "💪  ¡Bien! Puedes mejorar.  💪"
            color = COLORES["naranja"]
        else:
            mensaje = "💥  ¡Upa! Necesitas más práctica.  💥"
            color = COLORES["rojo"]

        c.create_text(CENTRO_X, 215, text=mensaje,
                      font=self.fuente_normal, fill=color, justify="center")

        c.create_rectangle(130, 255, 550, 610, fill=COLORES["panel"],
                           outline=COLORES["azul"], width=2)
        c.create_text(340, 290, text="📊  ESTADÍSTICAS  📊",
                      font=self.fuente_mediana, fill=COLORES["blanco"])
        c.create_text(340, 340, text=f"✅  Aciertos: {self.puntaje}/{self.rondas}",
                      font=self.fuente_normal, fill=COLORES["verde"], anchor="center")
        c.create_text(340, 375, text=f"❌  Errores: {self.errores} · Bombas explotadas: {self.explosiones}",
                      font=self.fuente_normal, fill=COLORES["rojo"], anchor="center")
        c.create_text(340, 410, text=f"🔥  Mejor racha: {self.mejor_racha} · Vidas restantes: {self.vidas}",
                      font=self.fuente_normal, fill=COLORES["naranja"], anchor="center")
        c.create_text(340, 442, text=f"🎟  Bonos usados: {self.bonos_usados}",
                      font=self.fuente_normal, fill=COLORES["cyan"], anchor="center")
        c.create_text(340, 500, text=self.resumen_historial(),
                      font=("Courier New", 11), fill=COLORES["gris"], justify="center")

        c.create_rectangle(590, 255, 970, 610, fill=COLORES["panel"],
                           outline=COLORES["cyan"], width=2)
        c.create_text(780, 290, text="🏅  TOP SCORES  🏅",
                      font=self.fuente_mediana, fill=COLORES["cyan"])
        c.create_text(780, 455, text=self.resumen_scores(),
                      font=("Courier New", 13, "bold"), fill=COLORES["blanco"],
                      justify="left")

        self.boton_reiniciar = tk.Button(
            self.root, text="🔄  JUGAR DE NUEVO",
            font=("Arial Black", 16, "bold"),
            bg=COLORES["rojo"], fg=COLORES["blanco"],
            activebackground="#c0392b", activeforeground=COLORES["blanco"],
            bd=0, padx=30, pady=12, cursor="hand2",
            command=self.reiniciar
        )
        self.canvas.create_window(460, 675, window=self.boton_reiniciar)
        self.crear_boton_maximizar(620, 675)
        self.crear_boton_salir(700, 675)

        self.root.bind("<Return>", lambda e: self.reiniciar())
        self.root.bind("<space>", lambda e: self.reiniciar())

    def resumen_historial(self):
        if not self.historial:
            return ""
        lineas = []
        for item in self.historial[-5:]:
            lineas.append(
                f"R{item['ronda']:02d} {item['estado']:4s}  {item['expr']} = {item['respuesta']}  +{item['puntos']}"
            )
        return "\n".join(lineas)

    def resumen_scores(self):
        scores = self.records_data.get("scores", [])
        if not scores:
            return "Sin scores guardados todavía."
        lineas = []
        for i, item in enumerate(scores[:6], start=1):
            nombre = str(item.get("nombre", "Jugador"))[:12]
            puntos = int(item.get("puntos", 0))
            modo = str(item.get("modo", "NORMAL"))[:7]
            lineas.append(f"{i}. {nombre:<12} {puntos:>5} pts  {modo}")
        return "\n".join(lineas)

    def reiniciar(self):
        self.root.unbind("<Return>")
        self.root.unbind("<space>")
        self.root.unbind("<BackSpace>")
        self.root.unbind("<Escape>")
        self.limpiar()
        self.pantalla_inicio()


BombaGame = FedeGame


if __name__ == "__main__":
    root = tk.Tk()
    app = FedeGame(root)
    root.mainloop()
