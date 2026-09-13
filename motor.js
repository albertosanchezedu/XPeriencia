/* ===================================================================
   MOTOR FP — NÚCLEO COMÚN
   Todo juego debe apoyarse en este objeto global `Motor`.
   No duplicar equipos, puntuación, dificultad, contenido, Chivatini
   ni persistencia dentro de un juego concreto.
   =================================================================== */

var Motor = (function () {

  /* ---------------------------------------------------------------
     1. BUS DE EVENTOS
     --------------------------------------------------------------- */
  var listeners = {};
  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function off() {
      listeners[evt] = (listeners[evt] || []).filter(function (f) { return f !== fn; });
    };
  }
  function emit(evt, payload) {
    (listeners[evt] || []).forEach(function (fn) { fn(payload); });
  }

  /* ---------------------------------------------------------------
     2. ESTADOS DE PARTIDA
     --------------------------------------------------------------- */
  var ESTADOS = [
    'CONFIGURACION', 'TUTORIAL', 'PREPARACION', 'TURNO',
    'PREGUNTA_RETO', 'FEEDBACK', 'CAMBIO_TURNO',
    'RECUPERACION', 'RESULTADOS', 'FINALIZACION'
  ];
  var estadoActual = 'CONFIGURACION';
  function setEstado(nuevo, extra) {
    var anterior = estadoActual;
    estadoActual = nuevo;
    emit('estado:cambio', { anterior: anterior, actual: nuevo, extra: extra || {} });
  }
  function getEstado() { return estadoActual; }

  /* ---------------------------------------------------------------
     3. EQUIPOS
     --------------------------------------------------------------- */
  var equipos = [];
  var equipoActivoIdx = 0;

  function validarEquipos(lista) {
    if (lista.length < 2 || lista.length > 8) {
      return 'Debe haber entre 2 y 8 equipos.';
    }
    var nombres = lista.map(function (e) { return e.nombre.trim().toLowerCase(); });
    var emojis = lista.map(function (e) { return e.emoji; });
    var nombresVacios = lista.some(function (e) { return !e.nombre.trim(); });
    if (nombresVacios) return 'Todos los equipos deben tener nombre.';
    if (new Set(nombres).size !== nombres.length) return 'No puede haber nombres de equipo repetidos.';
    if (new Set(emojis).size !== emojis.length) return 'No puede haber símbolos/emojis repetidos.';
    return null;
  }

  function crearEquipos(lista) {
    var error = validarEquipos(lista);
    if (error) { return { ok: false, error: error }; }
    equipos = lista.map(function (e, i) {
      return {
        id: 'T' + (i + 1),
        nombre: e.nombre.trim(),
        emoji: e.emoji,
        puntos: 0,
        dificultad: 3,             // nivel interno oculto (1-5), arranca intermedio
        historial: [],             // {conceptId, acierto, dificultad, tipo, tiempoMs}
        rachaAciertos: 0,
        rachaErrores: 0
      };
    });
    equipoActivoIdx = 0;
    persistir();
    emit('equipos:creados', equipos);
    return { ok: true };
  }

  function getEquipos() { return equipos; }
  function getEquipoActivo() { return equipos[equipoActivoIdx]; }
  function getEquipoActivoIdx() { return equipoActivoIdx; }

  function activarEquipo(idx) {
    equipoActivoIdx = idx;
    emit('equipos:activo', getEquipoActivo());
  }

  function siguienteEquipo() {
    var anterior = getEquipoActivo();
    equipoActivoIdx = (equipoActivoIdx + 1) % equipos.length;
    var siguiente = getEquipoActivo();
    emit('turno:siguiente', { anterior: anterior, siguiente: siguiente });
    return siguiente;
  }

  /* ---------------------------------------------------------------
     4. PUNTUACIÓN
     --------------------------------------------------------------- */
  function sumarPuntos(equipoId, cantidad) {
    var eq = equipos.find(function (e) { return e.id === equipoId; });
    if (!eq) return;
    eq.puntos = Math.max(0, eq.puntos + cantidad);
    persistir();
    emit('puntuacion:cambio', { equipo: eq, delta: cantidad });
  }

  /* ---------------------------------------------------------------
     5. DIFICULTAD ADAPTATIVA (oculta al alumnado)
     --------------------------------------------------------------- */
  // Ajuste progresivo: 3 aciertos seguidos → sube; 2 errores seguidos → baja.
  function registrarResultado(equipoId, conceptId, acierto, tipo, tiempoMs) {
    var eq = equipos.find(function (e) { return e.id === equipoId; });
    if (!eq) return;

    eq.historial.push({
      conceptId: conceptId, acierto: acierto, dificultad: eq.dificultad,
      tipo: tipo || 'desconocido', tiempoMs: tiempoMs || null, ts: Date.now()
    });

    if (acierto) {
      eq.rachaAciertos++; eq.rachaErrores = 0;
      if (eq.rachaAciertos >= 3 && eq.dificultad < 5) {
        eq.dificultad++; eq.rachaAciertos = 0;
      }
    } else {
      eq.rachaErrores++; eq.rachaAciertos = 0;
      if (eq.rachaErrores >= 2 && eq.dificultad > 1) {
        eq.dificultad--; eq.rachaErrores = 0;
      }
    }
    persistir();
    emit('dificultad:actualizada', { equipo: eq });
  }

  function nivelDificultad(equipoId) {
    var eq = equipos.find(function (e) { return e.id === equipoId; });
    return eq ? eq.dificultad : 3;
  }

  // Devuelve, para un equipo, los conceptos dominados y los que necesitan refuerzo.
  function analizarDominio(equipoId) {
    var eq = equipos.find(function (e) { return e.id === equipoId; });
    if (!eq) return { dominados: [], reforzar: [] };
    var porConcepto = {};
    eq.historial.forEach(function (h) {
      porConcepto[h.conceptId] = porConcepto[h.conceptId] || { aciertos: 0, fallos: 0 };
      if (h.acierto) porConcepto[h.conceptId].aciertos++;
      else porConcepto[h.conceptId].fallos++;
    });
    var dominados = [], reforzar = [];
    Object.keys(porConcepto).forEach(function (cid) {
      var s = porConcepto[cid];
      var total = s.aciertos + s.fallos;
      var ratio = s.aciertos / total;
      if (total >= 1 && ratio >= 0.66) dominados.push(cid);
      else if (total >= 1 && ratio < 0.5) reforzar.push(cid);
    });
    return { dominados: dominados, reforzar: reforzar };
  }

  // Agregado de todo el grupo (para feedback final de partida)
  function analizarDominioGrupal() {
    var dominadosSet = {}, reforzarSet = {};
    equipos.forEach(function (eq) {
      var r = analizarDominio(eq.id);
      r.dominados.forEach(function (c) { dominadosSet[c] = true; });
      r.reforzar.forEach(function (c) { reforzarSet[c] = true; });
    });
    return { dominados: Object.keys(dominadosSet), reforzar: Object.keys(reforzarSet) };
  }

  /* ---------------------------------------------------------------
     6. CONTENIDO (contenido.txt)
     --------------------------------------------------------------- */
  var contenido = null;
  var CAMPOS_RAIZ = ['schema_version', 'metadata', 'concepts', 'questions', 'pairs',
    'expression', 'taboo', 'infiltrated', 'answer_is', 'challenges', 'recovery'];

  function validarContenido(json) {
    var errores = [];
    CAMPOS_RAIZ.forEach(function (campo) {
      if (!(campo in json)) errores.push('Falta el campo raíz "' + campo + '".');
    });
    if (errores.length) return errores;

    var idsConceptos = {};
    (json.concepts || []).forEach(function (c, i) {
      ['id', 'term', 'definition'].forEach(function (f) {
        if (!c[f]) errores.push('concepts[' + i + '] no tiene "' + f + '".');
      });
      if (c.id) {
        if (idsConceptos[c.id]) errores.push('concept_id duplicado: ' + c.id);
        idsConceptos[c.id] = true;
      }
    });

    function comprobarConceptId(lista, nombreLista, campo) {
      (lista || []).forEach(function (item, i) {
        var cid = item[campo];
        if (Array.isArray(cid)) {
          cid.forEach(function (id) {
            if (!idsConceptos[id]) errores.push(nombreLista + '[' + i + '] referencia concept_id inexistente: ' + id);
          });
        } else if (cid && !idsConceptos[cid]) {
          errores.push(nombreLista + '[' + i + '] referencia concept_id inexistente: ' + cid);
        }
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
    try {
      json = typeof textoOJson === 'string' ? JSON.parse(textoOJson) : textoOJson;
    } catch (e) {
      return { ok: false, errores: ['El archivo no es JSON válido: ' + e.message] };
    }
    var errores = validarContenido(json);
    if (errores.length) return { ok: false, errores: errores };
    contenido = json;
    persistir();
    emit('contenido:cargado', contenido);
    return { ok: true };
  }

  function getContenido() { return contenido; }

  // Selección de contenido compatible ajustada a la dificultad oculta de un equipo
  function seleccionarPorDificultad(lista, dificultad, margen) {
    margen = margen === undefined ? 1 : margen;
    if (!lista || !lista.length) return null;
    var candidatos = lista.filter(function (item) {
      return Math.abs((item.difficulty || 3) - dificultad) <= margen;
    });
    var pool = candidatos.length ? candidatos : lista;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function preguntaParaEquipo(equipoId) {
    if (!contenido) return null;
    var dif = nivelDificultad(equipoId);
    return seleccionarPorDificultad(contenido.questions, dif);
  }

  /* ---------------------------------------------------------------
     7. TEMPORIZADOR
     --------------------------------------------------------------- */
  var timerState = { restante: 0, total: 0, activo: false, handle: null };

  function iniciarTemporizador(segundos, onTick, onFin) {
    detenerTemporizador();
    timerState.total = segundos;
    timerState.restante = segundos;
    timerState.activo = true;
    emit('timer:inicio', timerState);
    timerState.handle = setInterval(function () {
      timerState.restante--;
      emit('timer:tick', timerState);
      if (onTick) onTick(timerState.restante);
      if (timerState.restante <= 0) {
        detenerTemporizador();
        emit('timer:fin', timerState);
        if (onFin) onFin();
      }
    }, 1000);
  }
  function detenerTemporizador() {
    if (timerState.handle) clearInterval(timerState.handle);
    timerState.handle = null;
    timerState.activo = false;
  }
  function pausarTemporizador() {
    if (timerState.handle) { clearInterval(timerState.handle); timerState.handle = null; timerState.activo = false; }
    emit('timer:pausa', timerState);
  }
  function reanudarTemporizador(onTick, onFin) {
    if (timerState.restante <= 0 || timerState.handle) return;
    timerState.activo = true;
    timerState.handle = setInterval(function () {
      timerState.restante--;
      emit('timer:tick', timerState);
      if (onTick) onTick(timerState.restante);
      if (timerState.restante <= 0) {
        detenerTemporizador();
        emit('timer:fin', timerState);
        if (onFin) onFin();
      }
    }, 1000);
  }

  /* ---------------------------------------------------------------
     8. PERSISTENCIA (evitar pérdidas accidentales de partida)
     --------------------------------------------------------------- */
  var STORAGE_KEY = 'motorfp_sesion_v1';
  function persistir() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        equipos: equipos, equipoActivoIdx: equipoActivoIdx,
        contenido: contenido, estado: estadoActual
      }));
    } catch (e) { /* almacenamiento no disponible: continuar sin persistencia */ }
  }
  function restaurarSesion() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      equipos = data.equipos || [];
      equipoActivoIdx = data.equipoActivoIdx || 0;
      contenido = data.contenido || null;
      estadoActual = data.estado || 'CONFIGURACION';
      return equipos.length > 0;
    } catch (e) { return false; }
  }
  function limpiarSesion() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    equipos = []; equipoActivoIdx = 0; contenido = null; estadoActual = 'CONFIGURACION';
  }

  /* ---------------------------------------------------------------
     API PÚBLICA
     --------------------------------------------------------------- */
  return {
    on: on, emit: emit,
    ESTADOS: ESTADOS, setEstado: setEstado, getEstado: getEstado,
    crearEquipos: crearEquipos, validarEquipos: validarEquipos,
    getEquipos: getEquipos, getEquipoActivo: getEquipoActivo, getEquipoActivoIdx: getEquipoActivoIdx,
    activarEquipo: activarEquipo, siguienteEquipo: siguienteEquipo,
    sumarPuntos: sumarPuntos,
    registrarResultado: registrarResultado, nivelDificultad: nivelDificultad,
    analizarDominio: analizarDominio, analizarDominioGrupal: analizarDominioGrupal,
    cargarContenido: cargarContenido, getContenido: getContenido,
    seleccionarPorDificultad: seleccionarPorDificultad, preguntaParaEquipo: preguntaParaEquipo,
    iniciarTemporizador: iniciarTemporizador, detenerTemporizador: detenerTemporizador,
    pausarTemporizador: pausarTemporizador, reanudarTemporizador: reanudarTemporizador,
    persistir: persistir, restaurarSesion: restaurarSesion, limpiarSesion: limpiarSesion
  };
})();
