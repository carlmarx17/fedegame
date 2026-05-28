const MODOS = {
  entrenamiento: { nombre: "ENTRENO", rondas: 8, vidas: 5, tiempo: 50, minTiempo: 34, penalizacion: 3 },
  normal: { nombre: "NORMAL", rondas: 12, vidas: 4, tiempo: 42, minTiempo: 26, penalizacion: 4 },
  rapido: { nombre: "RÁPIDO", rondas: 10, vidas: 3, tiempo: 32, minTiempo: 20, penalizacion: 4 },
  experto: { nombre: "EXPERTO", rondas: 16, vidas: 3, tiempo: 38, minTiempo: 22, penalizacion: 5 },
  historia: { nombre: "HISTORIA", rondas: 20, vidas: 5, tiempo: 42, minTiempo: 24, penalizacion: 4 },
  leyenda: { nombre: "LEYENDA", rondas: 24, vidas: 3, tiempo: 40, minTiempo: 22, penalizacion: 6 },
};

const HISTORIA = [
  "Alerta en la ciudad: una red de bombas matemáticas fue activada.",
  "Fede entra al centro de control para descifrar los códigos.",
  "Cada ronda abre una puerta hacia el núcleo del sistema.",
  "Los errores aceleran el detonador, pero las pistas pueden salvar la misión.",
  "El laboratorio enemigo libera códigos de nivel maestro.",
  "La torre central queda a un solo cálculo de apagarse.",
  "Si completas la ruta, FedeGame recupera la ciudad.",
];

const PISTA_COSTO = 25;
const FREEZE_SEGUNDOS = 5;
const BONO_TIEMPO_SEGUNDOS = 10;
const SKIP_PUNTOS = 35;
const SCORE_KEY = "fedegame_scores";

const $ = (id) => document.getElementById(id);
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (items) => items[rand(0, items.length - 1)];

const state = {
  modo: "normal",
  rondas: 8,
  ronda: 0,
  aciertos: 0,
  puntos: 0,
  vidas: 3,
  racha: 0,
  mejorRacha: 0,
  errores: 0,
  explosiones: 0,
  respuesta: 0,
  expr: "",
  dificultad: "FÁCIL",
  tiempo: 30,
  tiempoRonda: 30,
  timer: null,
  respondiendo: false,
  pistaUsada: false,
  freezeCupones: 0,
  escudos: 0,
  bonosTiempo: 0,
  guias: 0,
  digitos: 0,
  vidasExtra: 0,
  pases: 0,
  freezeTurnos: 0,
  escudoActivo: false,
  bonosUsados: 0,
  historial: [],
};

function showScreen(id) {
  for (const screen of document.querySelectorAll(".screen")) {
    screen.classList.add("hidden");
  }
  $(id).classList.remove("hidden");
}

function loadScores() {
  try {
    const data = JSON.parse(localStorage.getItem(SCORE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveScore() {
  const scores = loadScores();
  const nombre = cleanName();
  scores.push({
    nombre,
    puntos: state.puntos,
    modo: MODOS[state.modo].nombre,
    aciertos: state.aciertos,
    rondas: state.rondas,
  });
  scores.sort((a, b) => b.puntos - a.puntos);
  localStorage.setItem(SCORE_KEY, JSON.stringify(scores.slice(0, 8)));
  return scores[0]?.nombre === nombre && scores[0]?.puntos === state.puntos;
}

function record() {
  return loadScores()[0]?.puntos || 0;
}

function cleanName() {
  return ($("player-name").value.trim() || "Jugador").slice(0, 18);
}

function updateRecordLabel() {
  $("current-record").textContent = `Récord: ${record()} pts`;
}

function generarOperacion() {
  const nivel = elegirNivel();
  const familia = elegirFamilia();

  if (familia === "faltante") return operacionFaltante(nivel);
  if (familia === "secuencia") return operacionSecuencia(nivel);
  if (familia === "problema") return operacionProblema(nivel);
  if (familia === "geometria") return operacionGeometria(nivel);
  if (familia === "ecuacion") return operacionEcuacion(nivel);
  if (familia === "dinero") return operacionDinero(nivel);

  if (nivel === "facil") return operacionFacil();
  if (nivel === "media") return operacionMedia();
  if (nivel === "dificil") return operacionDificil();
  if (nivel === "maestra") return operacionMaestra();
  return operacionLeyenda();
}

function elegirFamilia() {
  const progreso = state.ronda / state.rondas;
  const basicas = ["normal", "normal", "faltante", "secuencia", "problema"];
  const medias = ["normal", "faltante", "secuencia", "problema", "geometria", "dinero"];
  const avanzadas = ["normal", "faltante", "secuencia", "problema", "geometria", "ecuacion", "dinero"];
  if (state.modo === "entrenamiento") return pick(["normal", "faltante", "secuencia", "problema"]);
  if (progreso < 0.3) return pick(basicas);
  if (progreso < 0.7) return pick(medias);
  return pick(avanzadas);
}

function elegirNivel() {
  const progreso = state.ronda / state.rondas;
  if (state.modo === "entrenamiento") {
    if (progreso < 0.5) return "facil";
    if (progreso < 0.85) return pick(["facil", "media"]);
    return pick(["media", "dificil"]);
  }
  if (progreso < 0.25) return pick(["facil", "facil", "media"]);
  if (progreso < 0.5) return pick(["facil", "media", "media"]);
  if (progreso < 0.72) return pick(["media", "media", "dificil"]);
  if (progreso < 0.88) return pick(["media", "dificil", "dificil", "maestra"]);
  if (state.modo === "leyenda" || state.modo === "historia") {
    return pick(["dificil", "maestra", "maestra", "leyenda"]);
  }
  if (state.modo === "experto") return pick(["dificil", "maestra", "maestra"]);
  return pick(["dificil", "dificil", "maestra"]);
}

function operacionFacil() {
  const a = rand(2, 15);
  const b = rand(1, 12);
  const tipo = pick(["+", "-", "doble", "doble_suma", "mitad"]);
  if (tipo === "+") return [`${a} + ${b}`, a + b, "FÁCIL"];
  if (tipo === "-") return [`${a} - ${b}`, a - b, "FÁCIL"];
  if (tipo === "doble") {
    const c = rand(1, 9);
    return [`${a} + ${b} - ${c}`, a + b - c, "FÁCIL"];
  }
  if (tipo === "doble_suma") return [`2 × ${a} + ${b}`, 2 * a + b, "FÁCIL"];
  const par = rand(2, 12) * 2;
  return [`${par} ÷ 2 + ${b}`, par / 2 + b, "FÁCIL"];
}

function operacionMedia() {
  const a = rand(1, 9);
  const b = rand(1, 9);
  const c = rand(2, 6);
  const divisor = rand(2, 6);
  const dividendo = divisor * rand(2, 9);
  const tipo = pick(["suma_mul", "mul_suma", "resta_mul", "division", "cuadrado_suma", "paren_div", "triple"]);
  if (tipo === "suma_mul") return [`${a} + ${b} × ${c}`, a + b * c, "MEDIA"];
  if (tipo === "mul_suma") return [`${a} × ${b} + ${c}`, a * b + c, "MEDIA"];
  if (tipo === "resta_mul") return [`${a} - ${b} × ${c}`, a - b * c, "MEDIA"];
  if (tipo === "division") return [`${dividendo} ÷ ${divisor} + ${a}`, dividendo / divisor + a, "MEDIA"];
  if (tipo === "cuadrado_suma") return [`${c}² + ${a}`, c * c + a, "MEDIA"];
  if (tipo === "paren_div") return [`(${dividendo} + ${divisor}) ÷ ${divisor}`, (dividendo + divisor) / divisor, "MEDIA"];
  return [`${a} + ${b} + ${c} × 2`, a + b + c * 2, "MEDIA"];
}

function operacionDificil() {
  const a = rand(2, 8);
  const b = rand(1, 8);
  const c = rand(2, 7);
  const d = rand(1, 6);
  const tipo = pick(["paren1", "paren2", "combo", "paren3", "doble_mul", "cuadrado_resta", "division_combo", "paren_doble"]);
  if (tipo === "paren1") return [`(${a} + ${b}) × ${c}`, (a + b) * c, "DIFÍCIL"];
  if (tipo === "paren2") return [`${a} × (${b} + ${c})`, a * (b + c), "DIFÍCIL"];
  if (tipo === "combo") return [`${a} + ${b} × ${c} - ${d}`, a + b * c - d, "DIFÍCIL"];
  if (tipo === "paren3") return [`(${a} + ${b}) × (${c} - ${d})`, (a + b) * (c - d), "DIFÍCIL"];
  if (tipo === "doble_mul") return [`${a} × ${b} + ${c} × ${d}`, a * b + c * d, "DIFÍCIL"];
  if (tipo === "cuadrado_resta") return [`(${a} + ${b})² - ${c}`, (a + b) ** 2 - c, "DIFÍCIL"];
  if (tipo === "division_combo") {
    const divisor = rand(2, 6);
    const base = divisor * rand(4, 12);
    return [`${base} ÷ ${divisor} + ${a} × ${b}`, base / divisor + a * b, "DIFÍCIL"];
  }
  return [`(${a} + ${b}) × (${c} + ${d}) - ${a}`, (a + b) * (c + d) - a, "DIFÍCIL"];
}

function operacionMaestra() {
  const a = rand(2, 9);
  const b = rand(2, 9);
  const c = rand(2, 8);
  const d = rand(1, 7);
  const divisor = rand(2, 6);
  const base = divisor * rand(5, 15);
  const tipo = pick(["mixta1", "mixta2", "mixta3", "potencia", "balance"]);
  if (tipo === "mixta1") return [`(${a} × ${b}) - (${c} × ${d}) + ${base} ÷ ${divisor}`, a * b - c * d + base / divisor, "MAESTRA"];
  if (tipo === "mixta2") return [`(${a} + ${b} + ${c}) × ${d} - ${base} ÷ ${divisor}`, (a + b + c) * d - base / divisor, "MAESTRA"];
  if (tipo === "mixta3") return [`${a}² + (${b} × ${c}) - ${d}`, a * a + b * c - d, "MAESTRA"];
  if (tipo === "potencia") return [`(${a} + ${d})² - ${b} × ${c}`, (a + d) ** 2 - b * c, "MAESTRA"];
  return [`(${base} ÷ ${divisor}) × (${a} - ${d}) + ${b}`, (base / divisor) * (a - d) + b, "MAESTRA"];
}

function operacionLeyenda() {
  const a = rand(3, 12);
  const b = rand(2, 10);
  const c = rand(2, 9);
  const d = rand(1, 8);
  const divisor = rand(2, 6);
  const base = divisor * rand(8, 20);
  const tipo = pick(["triple_combo", "doble_potencia", "torre", "division_final", "gran_balance"]);
  if (tipo === "triple_combo") return [`(${a} + ${b}) × (${c} + ${d}) - ${base} ÷ ${divisor}`, (a + b) * (c + d) - base / divisor, "LEYENDA"];
  if (tipo === "doble_potencia") return [`${a}² - ${b}² + ${c} × ${d}`, a * a - b * b + c * d, "LEYENDA"];
  if (tipo === "torre") return [`(${base} ÷ ${divisor} + ${a}) × 2 - ${b}`, (base / divisor + a) * 2 - b, "LEYENDA"];
  if (tipo === "division_final") return [`((${a} + ${b}) × ${divisor}) ÷ ${divisor} + ${c}²`, ((a + b) * divisor) / divisor + c * c, "LEYENDA"];
  return [`(${a} × ${b}) + (${c} × ${d}) - (${base} ÷ ${divisor})`, a * b + c * d - base / divisor, "LEYENDA"];
}

function rangoPorNivel(nivel) {
  if (nivel === "facil") return { min: 2, max: 18, mult: 5 };
  if (nivel === "media") return { min: 4, max: 35, mult: 8 };
  if (nivel === "dificil") return { min: 8, max: 60, mult: 12 };
  if (nivel === "maestra") return { min: 12, max: 90, mult: 15 };
  return { min: 18, max: 120, mult: 20 };
}

function etiquetaNivel(nivel, fallback = "RETO") {
  const mapa = {
    facil: "FÁCIL",
    media: "MEDIA",
    dificil: "DIFÍCIL",
    maestra: "MAESTRA",
    leyenda: "LEYENDA",
  };
  return mapa[nivel] || fallback;
}

function operacionFaltante(nivel) {
  const r = rangoPorNivel(nivel);
  const a = rand(r.min, r.max);
  const b = rand(2, Math.max(3, Math.floor(r.max / 3)));
  const tipo = pick(["suma", "resta", "multiplica", "divide"]);
  if (tipo === "suma") return [`□ + ${b} = ${a + b}`, a, "FALTANTE"];
  if (tipo === "resta") return [`□ - ${b} = ${a - b}`, a, "FALTANTE"];
  if (tipo === "multiplica") return [`□ × ${b} = ${a * b}`, a, "FALTANTE"];
  return [`□ ÷ ${b} = ${a}`, a * b, "FALTANTE"];
}

function operacionSecuencia(nivel) {
  const r = rangoPorNivel(nivel);
  const start = rand(1, Math.max(3, Math.floor(r.max / 4)));
  const step = rand(2, r.mult);
  const tipo = pick(["aritmetica", "doble", "cuadrados", "alternada"]);
  if (tipo === "aritmetica") {
    return [`Secuencia: ${start}, ${start + step}, ${start + step * 2}, □`, start + step * 3, "SECUENCIA"];
  }
  if (tipo === "doble") {
    return [`Secuencia: ${start}, ${start * 2}, ${start * 4}, □`, start * 8, "SECUENCIA"];
  }
  if (tipo === "cuadrados") {
    const n = rand(2, 7);
    return [`Secuencia: ${n * n}, ${(n + 1) ** 2}, ${(n + 2) ** 2}, □`, (n + 3) ** 2, "SECUENCIA"];
  }
  const a = rand(2, 8);
  return [`Secuencia: ${a}, ${a + 3}, ${(a + 3) * 2}, □`, (a + 3) * 2 + 3, "SECUENCIA"];
}

function operacionProblema(nivel) {
  const r = rangoPorNivel(nivel);
  const estudiantes = rand(3, r.mult);
  const puntos = rand(2, 12);
  const extra = rand(1, 20);
  const tipo = pick(["clase", "bombas", "cuadernos", "equipos"]);
  if (tipo === "clase") {
    return [`Problema: ${estudiantes} estudiantes ganan ${puntos} pts cada uno y luego suman ${extra}. Total`, estudiantes * puntos + extra, "PROBLEMA"];
  }
  if (tipo === "bombas") {
    const cajas = rand(2, 8);
    const cables = rand(3, 12);
    return [`Problema: hay ${cajas} cajas con ${cables} cables y se cortan ${extra}. Quedan`, cajas * cables - extra, "PROBLEMA"];
  }
  if (tipo === "cuadernos") {
    const packs = rand(2, 10);
    const hojas = rand(5, 20);
    return [`Problema: ${packs} paquetes de ${hojas} hojas más ${extra} hojas. Total`, packs * hojas + extra, "PROBLEMA"];
  }
  const grupos = rand(2, 9);
  const porGrupo = rand(2, 8);
  return [`Problema: ${grupos} equipos de ${porGrupo} y llegan ${extra} más. Total`, grupos * porGrupo + extra, "PROBLEMA"];
}

function operacionGeometria(nivel) {
  const r = rangoPorNivel(nivel);
  const a = rand(2, r.mult);
  const b = rand(2, r.mult);
  const tipo = pick(["area", "perimetro", "cuadrado", "triangulo"]);
  if (tipo === "area") return [`Área rectángulo: base ${a}, altura ${b}`, a * b, "GEOMETRÍA"];
  if (tipo === "perimetro") return [`Perímetro rectángulo: lados ${a} y ${b}`, 2 * (a + b), "GEOMETRÍA"];
  if (tipo === "cuadrado") return [`Área cuadrado: lado ${a}`, a * a, "GEOMETRÍA"];
  const base = rand(2, r.mult) * 2;
  const altura = rand(2, r.mult);
  return [`Área triángulo: base ${base}, altura ${altura}`, (base * altura) / 2, "GEOMETRÍA"];
}

function operacionEcuacion(nivel) {
  const r = rangoPorNivel(nivel);
  const x = rand(2, r.max);
  const a = rand(2, r.mult);
  const b = rand(1, r.mult);
  const tipo = pick(["suma", "multiplica", "mixta", "doble"]);
  if (tipo === "suma") return [`Resuelve x: x + ${a} = ${x + a}`, x, "ECUACIÓN"];
  if (tipo === "multiplica") return [`Resuelve x: ${a}x = ${a * x}`, x, "ECUACIÓN"];
  if (tipo === "mixta") return [`Resuelve x: ${a}x + ${b} = ${a * x + b}`, x, "ECUACIÓN"];
  return [`Resuelve x: 2x - ${b} = ${2 * x - b}`, x, "ECUACIÓN"];
}

function operacionDinero(nivel) {
  const r = rangoPorNivel(nivel);
  const precio = rand(2, r.mult) * 100;
  const cantidad = rand(2, 8);
  const descuento = rand(1, 5) * 100;
  const tipo = pick(["compra", "cambio", "bono"]);
  if (tipo === "compra") return [`Compra: ${cantidad} artículos de ${precio}. Total`, cantidad * precio, "DINERO"];
  if (tipo === "cambio") {
    const total = cantidad * precio;
    const paga = total + descuento;
    return [`Cambio: paga ${paga} por compra de ${total}. Cambio`, paga - total, "DINERO"];
  }
  return [`Bono: ${cantidad} cupones de ${precio} menos ${descuento}`, cantidad * precio - descuento, "DINERO"];
}

function startGame(modo) {
  const config = MODOS[modo];
  Object.assign(state, {
    modo,
    rondas: config.rondas,
    ronda: 0,
    aciertos: 0,
    puntos: 0,
    vidas: config.vidas,
    racha: 0,
    mejorRacha: 0,
    errores: 0,
    explosiones: 0,
    historial: [],
    freezeCupones: ayudaInicial(modo, "freeze"),
    escudos: ayudaInicial(modo, "escudo"),
    bonosTiempo: ayudaInicial(modo, "tiempo"),
    guias: ayudaInicial(modo, "guia"),
    digitos: ayudaInicial(modo, "digito"),
    vidasExtra: ayudaInicial(modo, "vida"),
    pases: ayudaInicial(modo, "pasar"),
    freezeTurnos: 0,
    escudoActivo: false,
    bonosUsados: 0,
  });
  nextRound();
}

function ayudaInicial(modo, tipo) {
  const ayudas = {
    entrenamiento: { freeze: 3, escudo: 3, tiempo: 3, guia: 4, digito: 3, vida: 2, pasar: 2 },
    normal: { freeze: 2, escudo: 2, tiempo: 3, guia: 3, digito: 2, vida: 1, pasar: 1 },
    rapido: { freeze: 2, escudo: 1, tiempo: 2, guia: 2, digito: 1, vida: 1, pasar: 1 },
    experto: { freeze: 2, escudo: 2, tiempo: 2, guia: 2, digito: 2, vida: 1, pasar: 1 },
    historia: { freeze: 3, escudo: 3, tiempo: 4, guia: 4, digito: 3, vida: 2, pasar: 2 },
    leyenda: { freeze: 3, escudo: 2, tiempo: 3, guia: 3, digito: 2, vida: 1, pasar: 2 },
  };
  return ayudas[modo]?.[tipo] ?? 1;
}

function nextRound() {
  clearInterval(state.timer);
  state.ronda += 1;
  if (state.ronda > state.rondas) {
    finalScreen();
    return;
  }
  const [expr, res, dif] = generarOperacion();
  state.expr = expr;
  state.respuesta = res;
  state.dificultad = dif;
  state.tiempoRonda = tiempoParaRonda();
  state.tiempo = state.tiempoRonda;
  state.pistaUsada = false;
  state.freezeTurnos = 0;
  state.escudoActivo = false;
  state.respondiendo = true;
  renderRound();
  state.timer = setInterval(tick, 1000);
  $("answer-input").focus();
}

function tiempoParaRonda() {
  const config = MODOS[state.modo];
  const descuento = Math.floor((state.ronda - 1) * 0.85);
  return Math.max(config.minTiempo, config.tiempo - descuento);
}

function renderRound() {
  showScreen("game-screen");
  $("hud-title").textContent = `FedeGame · ${MODOS[state.modo].nombre}`;
  $("hud-round").textContent = `Ronda ${state.ronda}/${state.rondas}`;
  $("hud-points").textContent = state.puntos;
  $("hud-lives").textContent = state.vidas;
  $("hud-difficulty").textContent = state.dificultad;
  $("mission-text").textContent = missionText();
  $("expression").textContent = state.expr;
  $("hint-text").textContent = "";
  $("result-text").textContent = "";
  $("answer-input").value = "";
  $("bomb").textContent = "💣";
  updateTimer();
  updateBonusState();
}

function missionText() {
  const index = Math.min(HISTORIA.length - 1, Math.max(0, Math.floor((state.ronda - 1) / 2)));
  return `Misión ${state.ronda}: ${HISTORIA[index]}`;
}

function tick() {
  if (!state.respondiendo) return;
  if (state.freezeTurnos > 0) {
    state.freezeTurnos -= 1;
  } else {
    state.tiempo -= 1;
  }
  updateTimer();
  updateBonusState();
  if (state.tiempo <= 0) timeOut();
}

function updateTimer() {
  $("time-left").textContent = `${state.tiempo} segundos`;
  const fraction = Math.max(0, Math.min(1, state.tiempo / state.tiempoRonda));
  $("timer-bar").style.width = `${fraction * 100}%`;
  $("timer-bar").style.backgroundColor = state.tiempo <= 10 ? "var(--red)" : state.tiempo <= 20 ? "var(--orange)" : "var(--green)";
}

function updateBonusState() {
  const freeze = state.freezeTurnos > 0 ? `x${state.freezeCupones} (${state.freezeTurnos}s)` : `x${state.freezeCupones}`;
  const escudo = state.escudoActivo ? "ACTIVO" : `x${state.escudos}`;
  $("bonus-state").textContent = [
    `FREEZE ${freeze}`,
    `ESCUDO ${escudo}`,
    `+10s x${state.bonosTiempo}`,
    `GUÍA x${state.guias}`,
    `DÍGITO x${state.digitos}`,
    `VIDA x${state.vidasExtra}`,
    `PASAR x${state.pases}`,
  ].join("\n");
}

function submitAnswer() {
  if (!state.respondiendo) return;
  const raw = $("answer-input").value.trim();
  if (!raw) return;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    result("Ingresa un número válido.", "var(--orange)");
    return;
  }
  if (value === state.respuesta) {
    correctAnswer();
  } else {
    wrongAnswer();
  }
}

function correctAnswer() {
  state.respondiendo = false;
  state.aciertos += 1;
  state.racha += 1;
  state.mejorRacha = Math.max(state.mejorRacha, state.racha);
  let points = 100 + Math.max(0, state.tiempo) * 3 + state.racha * 5;
  if (state.pistaUsada) points = Math.max(25, points - PISTA_COSTO);
  state.puntos += points;
  state.historial.push({ ronda: state.ronda, estado: "OK", expr: state.expr, respuesta: state.respuesta, puntos: points });
  $("hud-points").textContent = state.puntos;
  $("bomb").textContent = "✅";
  result(`✅ Correcto. +${points} pts`, "var(--green)");
  setTimeout(transitionRound, 1400);
}

function wrongAnswer() {
  state.racha = 0;
  if (state.escudoActivo) {
    state.escudoActivo = false;
    result("🛡 Escudo consumido: error bloqueado.", "var(--green)");
    $("answer-input").value = "";
    updateBonusState();
    return;
  }
  state.errores += 1;
  state.tiempo = Math.max(0, state.tiempo - MODOS[state.modo].penalizacion);
  result(`❌ Código erróneo. -${MODOS[state.modo].penalizacion}s`, "var(--red)");
  $("answer-input").value = "";
  updateTimer();
  if (state.tiempo <= 0) timeOut();
}

function timeOut() {
  state.respondiendo = false;
  state.vidas -= 1;
  state.racha = 0;
  state.explosiones += 1;
  state.historial.push({ ronda: state.ronda, estado: "BOOM", expr: state.expr, respuesta: state.respuesta, puntos: 0 });
  $("hud-lives").textContent = state.vidas;
  $("bomb").textContent = "💥";
  result(`💥 BOOM. Respuesta: ${state.respuesta}`, "var(--red)");
  setTimeout(() => {
    if (state.vidas <= 0) finalScreen();
    else transitionRound();
  }, 1700);
}

function transitionRound() {
  clearInterval(state.timer);
  if (state.ronda >= state.rondas) {
    finalScreen();
    return;
  }
  showScreen("between-screen");
  $("between-title").textContent = `Ronda ${state.ronda} completada`;
  $("between-score").textContent = `Aciertos: ${state.aciertos}/${state.ronda} · ${state.puntos} pts · Vidas: ${state.vidas}`;
  $("between-message").textContent = state.aciertos === state.ronda ? "Racha perfecta." : "Sigue la misión.";
}

function finalScreen() {
  clearInterval(state.timer);
  const won = state.vidas > 0 && state.ronda >= state.rondas;
  const newRecord = saveScore();
  showScreen("final-screen");
  $("final-title").textContent = won ? "FedeGame terminado" : "FedeGame: misión fallida";
  $("aura-laura").textContent = won ? "aura" : "laura";
  $("aura-laura").classList.toggle("laura", !won);
  $("final-points").textContent = `${cleanName()} · ${state.puntos} puntos · ${newRecord ? "NUEVO RÉCORD" : `Récord: ${record()} pts`}`;
  $("final-message").textContent = finalMessage();
  $("final-stats").textContent = `Aciertos: ${state.aciertos}/${state.rondas}\nErrores: ${state.errores}\nBombas explotadas: ${state.explosiones}\nMejor racha: ${state.mejorRacha}\nVidas restantes: ${state.vidas}\nBonos usados: ${state.bonosUsados}`;
  $("history-list").textContent = state.historial.slice(-5).map((item) => `R${String(item.ronda).padStart(2, "0")} ${item.estado.padEnd(4)} ${item.expr} = ${item.respuesta} +${item.puntos}`).join("\n");
  $("scores-list").textContent = scoresText();
  updateRecordLabel();
}

function finalMessage() {
  const percent = (state.aciertos / state.rondas) * 100;
  if (percent === 100) return "Perfecto. Desactivación total.";
  if (percent >= 80) return "Excelente trabajo, casi impecable.";
  if (percent >= 60) return "Buen trabajo. Sigue practicando.";
  if (percent >= 40) return "Bien. Puedes mejorar.";
  return "Sigue practicando: usa guía, dígito y bonos para aprender el orden correcto.";
}

function scoresText() {
  const scores = loadScores();
  if (!scores.length) return "Sin scores guardados todavía.";
  return scores.slice(0, 6).map((item, index) => {
    const name = String(item.nombre || "Jugador").slice(0, 12).padEnd(12, " ");
    return `${index + 1}. ${name} ${String(item.puntos).padStart(5, " ")} pts ${item.modo || "NORMAL"}`;
  }).join("\n");
}

function result(text, color) {
  $("result-text").textContent = text;
  $("result-text").style.color = color;
}

function showHint() {
  if (!state.respondiendo || state.pistaUsada) return;
  state.pistaUsada = true;
  state.puntos = Math.max(0, state.puntos - PISTA_COSTO);
  const sign = state.respuesta > 0 ? "positivo" : state.respuesta < 0 ? "negativo" : "cero";
  const parity = state.respuesta % 2 === 0 ? "par" : "impar";
  const near = Math.trunc(state.respuesta / 10) * 10;
  $("hud-points").textContent = state.puntos;
  $("hint-text").textContent = `Pista: resultado ${sign}, ${parity}, cerca de ${near}.`;
  result(`Pista usada: -${PISTA_COSTO} pts`, "var(--cyan)");
}

function useGuide() {
  if (!state.respondiendo || state.guias <= 0) return;
  state.guias -= 1;
  state.bonosUsados += 1;
  const tips = [];
  if (state.expr.includes("Secuencia")) tips.push("busca cuánto cambia de un número al siguiente");
  if (state.expr.includes("Resuelve x")) tips.push("despeja x haciendo la operación contraria");
  if (state.expr.includes("Área")) tips.push("usa base × altura; en triángulo divide entre 2");
  if (state.expr.includes("Perímetro")) tips.push("suma todos los lados");
  if (state.expr.includes("Problema")) tips.push("identifica primero qué se repite y qué se suma o resta");
  if (state.expr.includes("Compra") || state.expr.includes("Cambio") || state.expr.includes("Bono")) tips.push("multiplica precio por cantidad y luego ajusta");
  if (state.expr.includes("□")) tips.push("encuentra el número que completa la igualdad");
  if (state.expr.includes("(")) tips.push("primero resuelve los paréntesis");
  if (state.expr.includes("²")) tips.push("después calcula los cuadrados");
  if (state.expr.includes("×") || state.expr.includes("÷")) tips.push("luego multiplicación y división");
  tips.push("al final suma y resta de izquierda a derecha");
  $("hint-text").textContent = `Guía: ${tips.join(", ")}.`;
  result("📘 Guía matemática activada.", "var(--cyan)");
  updateBonusState();
}

function useDigit() {
  if (!state.respondiendo || state.digitos <= 0) return;
  state.digitos -= 1;
  state.bonosUsados += 1;
  const answer = String(Math.abs(state.respuesta));
  const last = answer.at(-1);
  const sign = state.respuesta < 0 ? "negativo" : state.respuesta > 0 ? "positivo" : "cero";
  $("hint-text").textContent = `Dígito: la respuesta es ${sign} y termina en ${last}.`;
  result("🔢 Cupón de dígito usado.", "var(--cyan)");
  updateBonusState();
}

function useExtraLife() {
  if (!state.respondiendo || state.vidasExtra <= 0) return;
  state.vidasExtra -= 1;
  state.vidas += 1;
  state.bonosUsados += 1;
  $("hud-lives").textContent = state.vidas;
  result("❤ Vida extra agregada.", "var(--green)");
  updateBonusState();
}

function useSkip() {
  if (!state.respondiendo || state.pases <= 0) return;
  state.pases -= 1;
  state.bonosUsados += 1;
  state.respondiendo = false;
  state.puntos += SKIP_PUNTOS;
  state.historial.push({ ronda: state.ronda, estado: "PASE", expr: state.expr, respuesta: state.respuesta, puntos: SKIP_PUNTOS });
  $("hud-points").textContent = state.puntos;
  $("bomb").textContent = "⏭";
  result(`⏭ Ronda pasada. +${SKIP_PUNTOS} pts de rescate.`, "var(--orange)");
  updateBonusState();
  setTimeout(transitionRound, 1200);
}

function useFreeze() {
  if (!state.respondiendo || state.freezeCupones <= 0) return;
  state.freezeCupones -= 1;
  state.freezeTurnos += FREEZE_SEGUNDOS;
  state.bonosUsados += 1;
  result(`🧊 FREEZE activado: ${FREEZE_SEGUNDOS}s`, "var(--cyan)");
  updateBonusState();
}

function useShield() {
  if (!state.respondiendo || state.escudos <= 0 || state.escudoActivo) return;
  state.escudos -= 1;
  state.escudoActivo = true;
  state.bonosUsados += 1;
  result("🛡 Escudo listo: bloqueará el próximo error.", "var(--green)");
  updateBonusState();
}

function useTimeBonus() {
  if (!state.respondiendo || state.bonosTiempo <= 0) return;
  state.bonosTiempo -= 1;
  state.bonosUsados += 1;
  state.tiempo += BONO_TIEMPO_SEGUNDOS;
  result(`⏱ Bono activado: +${BONO_TIEMPO_SEGUNDOS}s`, "var(--green)");
  updateTimer();
  updateBonusState();
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

function quitToStart() {
  clearInterval(state.timer);
  state.respondiendo = false;
  updateRecordLabel();
  showScreen("start-screen");
}

function buildKeypad() {
  const keypad = $("keypad");
  for (const key of ["7", "8", "9", "4", "5", "6", "1", "2", "3", "-", "0", "⌫"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = key;
    button.addEventListener("click", () => {
      const input = $("answer-input");
      if (key === "⌫") input.value = input.value.slice(0, -1);
      else if (key !== "-" || input.value.length === 0) input.value += key;
      input.focus();
    });
    keypad.appendChild(button);
  }
}

function bindEvents() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => startGame(button.dataset.mode));
  });
  $("submit-answer").addEventListener("click", submitAnswer);
  $("answer-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitAnswer();
  });
  $("hint-button").addEventListener("click", showHint);
  $("bonus-freeze").addEventListener("click", useFreeze);
  $("bonus-shield").addEventListener("click", useShield);
  $("bonus-time").addEventListener("click", useTimeBonus);
  $("bonus-guide").addEventListener("click", useGuide);
  $("bonus-digit").addEventListener("click", useDigit);
  $("bonus-life").addEventListener("click", useExtraLife);
  $("bonus-skip").addEventListener("click", useSkip);
  $("next-round").addEventListener("click", nextRound);
  $("restart-game").addEventListener("click", () => showScreen("start-screen"));

  for (const id of ["fullscreen-start", "fullscreen-game", "fullscreen-between", "fullscreen-final"]) {
    $(id).addEventListener("click", toggleFullscreen);
  }
  for (const id of ["quit-game", "quit-between", "quit-final"]) {
    $(id).addEventListener("click", quitToStart);
  }
  document.addEventListener("keydown", (event) => {
    if (event.code === "Space" && !$("start-screen").classList.contains("hidden")) {
      event.preventDefault();
      startGame("normal");
    }
  });
}

buildKeypad();
bindEvents();
updateRecordLabel();
