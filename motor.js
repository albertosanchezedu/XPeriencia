/* ===================================================================
   MOTOR FP — NÚCLEO COMÚN (v4)
   Añade: portavoz por equipo (para juegos de un jugador), identidad
   de equipo personalizada (emoji + nombre propios), además de las
   preestablecidas rápidas.
   =================================================================== */

var Motor = (function () {

  var TEAM_PRESETS = [
    { nombre: 'Logística',     emoji: '📦' },
    { nombre: 'Distribución',  emoji: '🚚' },
    { nombre: 'Retail',        emoji: '🛒' },
    { nombre: 'Comercial',     emoji: '🏬' },
    { nombre: 'Ventas',        emoji: '📈' },
    { nombre: 'Marketing',     emoji: '🏷️' },
    { nombre: 'Almacén',       emoji: '🗃️' },
    { nombre: 'Gestión',       emoji: '💼' }
  ];

  var EMOJI_PALETTE = [
    '📦','🚚','🛒','🏬','📈','🏷️','🗃️','💼','🧾','📊','🏭','🛍️',
    '💻','🖥️','🩺','💉','🍽️','👨‍🍳','💇','✂️','⚡','🔧','🚗','🧵','🎨','🌾','🖊️','🔬'
  ];

  /* ---------------- BUS DE EVENTOS ---------------- */
  var listeners = {};
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); return function off() { listeners[evt] = (listeners[evt] || []).filter(function (f) { return f !== fn; }); }; }
  function emit(evt, payload) { (listeners[evt] || []).forEach(function (fn) { fn(payload); }); }

  /* ---------------- FASES ---------------- */
  var FASES = ['SPLASH', 'MODO', 'EQUIPOS', 'CONTENIDO_GATE', 'JUEGOS', 'JUGANDO', 'RESULTADOS'];
  var fase = 'SPLASH';
  function setFase(f, extra) { var anterior = fase; fase = f; emit('fase:cambio', { anterior: anterior, actual: f, extra: extra || {} }); persistir(); }
  function getFase() { return fase; }

  var ESTADOS = ['CONFIGURACION', 'TUTORIAL', 'PREPARACION', 'TURNO', 'PREGUNTA_RETO', 'FEEDBACK', 'CAMBIO_TURNO', 'RECUPERACION', 'RESULTADOS', 'FINALIZACION'];
  var estadoActual = 'CONFIGURACION';
  function setEstado(nuevo, extra) { var anterior = estadoActual; estadoActual = nuevo; emit('estado:cambio', { anterior: anterior, actual: nuevo, extra: extra || {} }); }
  function getEstado() { return estadoActual; }

  /* ---------------- MODO DE PARTIDA ---------------- */
  var modo = { tipo: 'libre', objetivoRondas: null };
  function setModo(tipo) { modo.tipo = tipo; modo.objetivoRondas = tipo === 'mejor3' ? 3 : (tipo === 'mejor5' ? 5 : null); persistir(); }
  function getModo() { return modo; }
  var rondaActual = 0;
  function incrementarRonda() { rondaActual++; persistir(); return rondaActual; }
  function getRondaActual() { return rondaActual; }
  function objetivoAlcanzado() { return modo.objetivoRondas !== null && rondaActual >= modo.objetivoRondas; }

  /* ---------------- EQUIPOS ---------------- */
  var equipos = [];
  var equipoActivoIdx = 0;

  function presetsDisponibles() {
    var usados = equipos.map(function (e) { return e.nombre.toLowerCase(); });
    return TEAM_PRESETS.filter(function (p) { return usados.indexOf(p.nombre.toLowerCase()) === -1; });
  }
  function emojisUsados() { return equipos.map(function (e) { return e.emoji; }); }

  function crearEquipoBase(nombre, emoji, portavoz) {
    equipos.push({
      id: 'T' + (equipos.length + 1), nombre: nombre, emoji: emoji, portavoz: portavoz || '',
      puntos: 0, dificultad: 3, historial: [], rachaAciertos: 0, rachaErrores: 0, listo: false
    });
    persistir();
    emit('equipos:cambio', equipos);
  }

  function crearEquipoDesdePreset(preset) {
    if (equipos.length >= 8) return { ok: false, error: 'Máximo 8 equipos.' };
    if (equipos.some(function (e) { return e.nombre.toLowerCase() === preset.nombre.toLowerCase(); })) return { ok: false, error: 'Ese equipo ya está en juego.' };
    crearEquipoBase(preset.nombre, preset.emoji, '');
    return { ok: true };
  }

  function crearEquipoPersonalizado(nombre, emoji, portavoz) {
    if (equipos.length >= 8) return { ok: false, error: 'Máximo 8 equipos.' };
    nombre = (nombre || '').trim();
    if (!nombre) return { ok: false, error: 'Ponle un nombre al equipo.' };
    if (equipos.some(function (e) { return e.nombre.toLowerCase() === nombre.toLowerCase(); })) return { ok: false, error: 'Ya hay un equipo con ese nombre.' };
    if (equipos.some(function (e) { return e.emoji === emoji; })) return { ok: false, error: 'Ese símbolo ya lo usa otro equipo.' };
    crearEquipoBase(nombre, emoji, portavoz);
    return { ok: true };
  }

  function quitarEquipo(id) {
    equipos = equipos.filter(function (e) { return e.id !== id; });
    equipos.forEach(function (e, i) { e.id = 'T' + (i + 1); });
    equipoActivoIdx = 0;
    persistir();
    emit('equipos:cambio', equipos);
  }

  function marcarListo(id, valor) {
    var eq = equipos.find(function (e) { return e.id === id; });
    if (eq) { eq.listo = valor; persistir(); emit('equipos:cambio', equipos); }
  }
  function todosListos() { return equipos.length >= 2 && equipos.every(function (e) { return e.listo; }); }

  function confirmarInicio() {
    if (equipos.length < 2) return { ok: false, error: 'Hacen falta al menos 2 equipos.' };
    if (!todosListos()) return { ok: false, error: 'Todos los equipos deben marcar "Listo".' };
    equipoActivoIdx = 0;
    persistir();
    emit('equipos:confirmados', equipos);
    return { ok: true };
  }

  function getEquipos() { return equipos; }
  function getEquipoActivo() { return equipos[equipoActivoIdx]; }
  function getEquipoActivoIdx() { return equipoActivoIdx; }
  function activarEquipo(idx) { equipoActivoIdx = idx; emit('equipos:activo', getEquipoActivo()); }
  function siguienteEquipo() {
    var anterior = getEquipoActivo();
    equipoActivoIdx = (equipoActivoIdx + 1) % equipos.length;
    var siguiente = getEquipoActivo();
    emit('turno:siguiente', { anterior: anterior, siguiente: siguiente });
    return siguiente;
  }

  /* ---------------- PUNTUACIÓN ---------------- */
  function sumarPuntos(equipoId, cantidad) {
    var eq = equipos.find(function (e) { return e.id === equipoId; });
    if (!eq) return;
    eq.puntos = Math.max(0, eq.puntos + cantidad);
    persistir();
    emit('puntuacion:cambio', { equipo: eq, delta: cantidad });
  }
  function clasificacion() { return equipos.slice().sort(function (a, b) { return b.puntos - a.puntos; }); }

  /* ---------------- DIFICULTAD ADAPTATIVA ---------------- */
  function registrarResultado(equipoId, conceptId, acierto, tipo, tiempoMs) {
    var eq = equipos.find(function (e) { return e.id === equipoId; });
    if (!eq) return;
    eq.historial.push({ conceptId: conceptId, acierto: acierto, dificultad: eq.dificultad, tipo: tipo || 'desconocido', tiempoMs: tiempoMs || null, ts: Date.now() });
    if (acierto) { eq.rachaAciertos++; eq.rachaErrores = 0; if (eq.rachaAciertos >= 3 && eq.dificultad < 5) { eq.dificultad++; eq.rachaAciertos = 0; } }
    else { eq.rachaErrores++; eq.rachaAciertos = 0; if (eq.rachaErrores >= 2 && eq.dificultad > 1) { eq.dificultad--; eq.rachaErrores = 0; } }
    persistir();
    emit('dificultad:actualizada', { equipo: eq });
  }
  function nivelDificultad(equipoId) { var eq = equipos.find(function (e) { return e.id === equipoId; }); return eq ? eq.dificultad : 3; }

  function analizarDominio(equipoId) {
    var eq = equipos.find(function (e) { return e.id === equipoId; });
    if (!eq) return { dominados: [], reforzar: [] };
    var porConcepto = {};
    eq.historial.forEach(function (h) {
      porConcepto[h.conceptId] = porConcepto[h.conceptId] || { aciertos: 0, fallos: 0 };
      if (h.acierto) porConcepto[h.conceptId].aciertos++; else porConcepto[h.conceptId].fallos++;
    });
    var dominados = [], reforzar = [];
    Object.keys(porConcepto).forEach(function (cid) {
      var s = porConcepto[cid], total = s.aciertos + s.fallos, ratio = s.aciertos / total;
      if (total >= 1 && ratio >= 0.66) dominados.push(cid);
      else if (total >= 1 && ratio < 0.5) reforzar.push(cid);
    });
    return { dominados: dominados, reforzar: reforzar };
  }
  function analizarDominioGrupal() {
    var dominadosSet = {}, reforzarSet = {};
    equipos.forEach(function (eq) {
      var r = analizarDominio(eq.id);
      r.dominados.forEach(function (c) { dominadosSet[c] = true; });
      r.reforzar.forEach(function (c) { reforzarSet[c] = true; });
    });
    return { dominados: Object.keys(dominadosSet), reforzar: Object.keys(reforzarSet) };
  }

  /* ---------------- CONTENIDO ---------------- */
  var contenido = null;
  var CAMPOS_RAIZ = ['schema_version', 'metadata', 'concepts', 'questions', 'pairs', 'expression', 'taboo', 'infiltrated', 'answer_is', 'challenges', 'recovery'];
  function validarContenido(json) {
    var errores = [];
    CAMPOS_RAIZ.forEach(function (campo) { if (!(campo in json)) errores.push('Falta el campo raíz "' + campo + '".'); });
    if (errores.length) return errores;
    var idsConceptos = {};
    (json.concepts || []).forEach(function (c, i) {
      ['id', 'term', 'definition'].forEach(function (f) { if (!c[f]) errores.push('concepts[' + i + '] no tiene "' + f + '".'); });
      if (c.id) { if (idsConceptos[c.id]) errores.push('concept_id duplicado: ' + c.id); idsConceptos[c.id] = true; }
    });
    function comprobarConceptId(lista, nombreLista, campo) {
      (lista || []).forEach(function (item, i) {
        var cid = item[campo];
        if (Array.isArray(cid)) cid.forEach(function (id) { if (!idsConceptos[id]) errores.push(nombreLista + '[' + i + '] referencia concept_id inexistente: ' + id); });
        else if (cid && !idsConceptos[cid]) errores.push(nombreLista + '[' + i + '] referencia concept_id inexistente: ' + cid);
      });
    }
    comprobarConceptId(json.questions, 'questions', 'concept_id');
    comprobarConceptId(json.pairs, 'pairs', 'concept_id');
    comprobarConceptId(json.expression, 'expression', 'concept_id');
    comprobarConceptId(json.taboo, 'taboo', 'concept_id');
    comprobarConceptId(json.answer_is, 'answer_is', 'concept_id');
    comprobarConceptId(json.challenges, 'challenges', 'concept_ids');
    return errores;
  }
  function cargarContenido(textoOJson) {
    var json;
    try { json = typeof textoOJson === 'string' ? JSON.parse(textoOJson) : textoOJson; }
    catch (e) { return { ok: false, errores: ['El archivo no es JSON válido: ' + e.message] }; }
    var errores = validarContenido(json);
    if (errores.length) return { ok: false, errores: errores };
    contenido = json;
    persistir();
    emit('contenido:cargado', contenido);
    return { ok: true };
  }
  function getContenido() { return contenido; }
  function hayContenido() { return !!(contenido && contenido.questions && contenido.questions.length); }
  function seleccionarPorDificultad(lista, dificultad, margen) {
    margen = margen === undefined ? 1 : margen;
    if (!lista || !lista.length) return null;
    var candidatos = lista.filter(function (item) { return Math.abs((item.difficulty || 3) - dificultad) <= margen; });
    var pool = candidatos.length ? candidatos : lista;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function preguntaParaEquipo(equipoId) { if (!contenido) return null; return seleccionarPorDificultad(contenido.questions, nivelDificultad(equipoId)); }

  /* ---------------- TEMPORIZADOR ---------------- */
  var timerState = { restante: 0, total: 0, activo: false, handle: null };
  function iniciarTemporizador(segundos, onTick, onFin) {
    detenerTemporizador();
    timerState.total = segundos; timerState.restante = segundos; timerState.activo = true;
    emit('timer:inicio', timerState);
    timerState.handle = setInterval(function () {
      timerState.restante--;
      emit('timer:tick', timerState);
      if (onTick) onTick(timerState.restante);
      if (timerState.restante <= 0) { detenerTemporizador(); emit('timer:fin', timerState); if (onFin) onFin(); }
    }, 1000);
  }
  function detenerTemporizador() { if (timerState.handle) clearInterval(timerState.handle); timerState.handle = null; timerState.activo = false; }
  function pausarTemporizador() { if (timerState.handle) { clearInterval(timerState.handle); timerState.handle = null; timerState.activo = false; } emit('timer:pausa', timerState); }

  /* ---------------- PERSISTENCIA ---------------- */
  var STORAGE_KEY = 'motorfp_sesion_v4';
  function persistir() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        fase: fase, equipos: equipos, equipoActivoIdx: equipoActivoIdx,
        contenido: contenido, estado: estadoActual, modo: modo, rondaActual: rondaActual
      }));
    } catch (e) {}
  }
  function haySesionGuardada() { try { return !!localStorage.getItem(STORAGE_KEY); } catch (e) { return false; } }
  function restaurarSesion() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      fase = data.fase || 'SPLASH';
      equipos = data.equipos || [];
      equipoActivoIdx = data.equipoActivoIdx || 0;
      contenido = data.contenido || null;
      estadoActual = data.estado || 'CONFIGURACION';
      modo = data.modo || { tipo: 'libre', objetivoRondas: null };
      rondaActual = data.rondaActual || 0;
      return true;
    } catch (e) { return false; }
  }
  function reiniciarTodo() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    fase = 'SPLASH'; equipos = []; equipoActivoIdx = 0; contenido = null;
    estadoActual = 'CONFIGURACION'; modo = { tipo: 'libre', objetivoRondas: null }; rondaActual = 0;
    emit('app:reiniciada');
  }

  return {
    on: on, emit: emit,
    TEAM_PRESETS: TEAM_PRESETS, EMOJI_PALETTE: EMOJI_PALETTE,
    presetsDisponibles: presetsDisponibles, emojisUsados: emojisUsados,
    FASES: FASES, setFase: setFase, getFase: getFase,
    ESTADOS: ESTADOS, setEstado: setEstado, getEstado: getEstado,
    setModo: setModo, getModo: getModo,
    incrementarRonda: incrementarRonda, getRondaActual: getRondaActual, objetivoAlcanzado: objetivoAlcanzado,
    crearEquipoDesdePreset: crearEquipoDesdePreset, crearEquipoPersonalizado: crearEquipoPersonalizado, quitarEquipo: quitarEquipo,
    marcarListo: marcarListo, todosListos: todosListos, confirmarInicio: confirmarInicio,
    getEquipos: getEquipos, getEquipoActivo: getEquipoActivo, getEquipoActivoIdx: getEquipoActivoIdx,
    activarEquipo: activarEquipo, siguienteEquipo: siguienteEquipo,
    sumarPuntos: sumarPuntos, clasificacion: clasificacion,
    registrarResultado: registrarResultado, nivelDificultad: nivelDificultad,
    analizarDominio: analizarDominio, analizarDominioGrupal: analizarDominioGrupal,
    cargarContenido: cargarContenido, getContenido: getContenido, hayContenido: hayContenido,
    seleccionarPorDificultad: seleccionarPorDificultad, preguntaParaEquipo: preguntaParaEquipo,
    iniciarTemporizador: iniciarTemporizador, detenerTemporizador: detenerTemporizador, pausarTemporizador: pausarTemporizador,
    persistir: persistir, haySesionGuardada: haySesionGuardada, restaurarSesion: restaurarSesion, reiniciarTodo: reiniciarTodo
  };
})();
