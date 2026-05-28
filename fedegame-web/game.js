const MODOS = {
  normal: { nombre: "NORMAL", rondas: 8, vidas: 3, tiempo: 30, penalizacion: 5 },
  rapido: { nombre: "RÁPIDO", rondas: 6, vidas: 2, tiempo: 20, penalizacion: 4 },
  experto: { nombre: "EXPERTO", rondas: 10, vidas: 2, tiempo: 26, penalizacion: 6 },
  historia: { nombre: "HISTORIA", rondas: 12, vidas: 4, tiempo: 28, penalizacion: 5 },
  leyenda: { nombre: "LEYENDA", rondas: 14, vidas: 2, tiempo: 24, penalizacion: 7 },
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
  let nivel;
  if (state.modo === "leyenda" && state.ronda >= 9) {
    nivel = pick(["leyenda", "maestra", "maestra"]);
  } else if (state.modo === "leyenda" && state.ronda >= 4) {
    nivel = pick(["maestra", "dificil", "leyenda"]);
  } else if (state.modo === "historia" && state.ronda >= 10) {
    nivel = pick(["leyenda", "maestra", "dificil"]);
  } else if (state.modo === "historia" && state.ronda >= 6) {
    nivel = pick(["maestra", "dificil", "media"]);
  } else if (state.modo === "experto" && state.ronda >= 7) {
    nivel = pick(["maestra", "dificil", "dificil"]);
  } else if (state.modo === "experto" && state.ronda >= 3) {
    nivel = pick(["dificil", "media", "maestra"]);
  } else if (state.ronda <= 2) {
    nivel = "facil";
  } else if (state.ronda <= 5) {
    nivel = pick(["media", "media", "facil"]);
  } else {
    nivel = pick(["dificil", "dificil", "media", "maestra"]);
  }

  if (nivel === "facil") return operacionFacil();
  if (nivel === "media") return operacionMedia();
  if (nivel === "dificil") return operacionDificil();
  if (nivel === "maestra") return operacionMaestra();
  return operacionLeyenda();
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
    freezeCupones: modo === "historia" || modo === "leyenda" ? 2 : 1,
    escudos: 1,
    bonosTiempo: modo === "normal" || modo === "historia" ? 2 : 1,
    freezeTurnos: 0,
    escudoActivo: false,
    bonosUsados: 0,
  });
  nextRound();
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
  state.tiempoRonda = Math.max(12, MODOS[state.modo].tiempo - (state.ronda - 1) * 2);
  state.tiempo = state.tiempoRonda;
  state.pistaUsada = false;
  state.freezeTurnos = 0;
  state.escudoActivo = false;
  state.respondiendo = true;
  renderRound();
  state.timer = setInterval(tick, 1000);
  $("answer-input").focus();
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
  $("bonus-state").textContent = `FREEZE ${freeze} · ESCUDO ${escudo} · +10s x${state.bonosTiempo}`;
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
  return "Necesitas más práctica.";
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
