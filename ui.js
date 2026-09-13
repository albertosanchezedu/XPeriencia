/* ===================================================================
   UI v3 — flujo completo de la aplicación
   =================================================================== */

(function () {

  var splashScreen = document.getElementById('splashScreen');
  var flowScreen = document.getElementById('flowScreen');
  var gameArea = document.getElementById('gameArea');
  var stage = document.getElementById('stage');
  var stageContent = document.getElementById('stageContent');
  var teamsPanel = document.getElementById('teamsPanel');
  var turnScreen = document.getElementById('turnScreen');
  var timeUpBanner = document.getElementById('timeUpBanner');
  var timerWrap = document.getElementById('timerWrap');
  var timerNum = timerWrap.querySelector('.t-num');
  var identityOverlay = document.getElementById('identityOverlay');
  var identityGrid = document.getElementById('identityGrid');
  var contentFileInput = document.getElementById('contentFile');

  Chivatini.init();

  /* =================== PORTADA =================== */
  var EMOJIS_FONDO = ['📦','🚚','🛒','🏬','📈','🏷️','🗃️','💼','🧾','📊'];
  function pintarEmojisFondo() {
    var cont = document.getElementById('splashEmojis');
    var html = '';
    for (var i = 0; i < 16; i++) {
      var e = EMOJIS_FONDO[i % EMOJIS_FONDO.length];
      var left = Math.random() * 100;
      var delay = Math.random() * 14;
      var dur = 14 + Math.random() * 10;
      html += '<span class="float-emoji" style="left:' + left + '%;animation-duration:' + dur + 's;animation-delay:-' + delay + 's;">' + e + '</span>';
    }
    cont.innerHTML = html;
  }
  pintarEmojisFondo();

  function mostrarSplash() {
    splashScreen.style.display = 'flex';
    flowScreen.classList.add('hidden');
    gameArea.classList.add('hidden');
    document.getElementById('splashContinueBtn').classList.toggle('hidden', !Motor.haySesionGuardada());
  }
  document.getElementById('splashStartBtn').onclick = function () {
    Motor.reiniciarTodo();
    splashScreen.style.display = 'none';
    Chivatini.decir('¡Hola! Soy Chivatini, os voy a acompañar durante todo el juego.', 'inicio');
    Motor.setFase('MODO');
    render();
  };
  document.getElementById('splashContinueBtn').onclick = function () {
    Motor.restaurarSesion();
    splashScreen.style.display = 'none';
    render();
  };

  /* =================== RENDER PRINCIPAL (según fase) =================== */
  function render() {
    var fase = Motor.getFase();
    if (fase === 'SPLASH') { mostrarSplash(); return; }
    if (fase === 'JUGANDO') {
      flowScreen.classList.add('hidden');
      gameArea.classList.remove('hidden');
      renderTeamsPanel();
      return;
    }
    flowScreen.classList.remove('hidden');
    gameArea.classList.add('hidden');
    if (fase === 'MODO') renderModo();
    else if (fase === 'EQUIPOS') renderEquipos();
    else if (fase === 'CONTENIDO_GATE') renderContenidoGate();
    else if (fase === 'JUEGOS') renderJuegos();
    else if (fase === 'RESULTADOS') renderResultados();
    renderHelpPanel();
  }

  /* =================== MODO =================== */
  function renderModo() {
    flowScreen.innerHTML =
      '<h2>¿Cómo jugáis hoy?</h2>' +
      '<div class="muted">Elige el formato de la sesión</div>' +
      '<div class="mode-grid">' +
      '<div class="mode-card" data-modo="libre"><div class="m-emoji">🎯</div><div class="m-title">Modo libre</div><div class="m-desc">Jugáis lo que queráis y finalizáis cuando decidáis.</div></div>' +
      '<div class="mode-card" data-modo="mejor3"><div class="m-emoji">🥉</div><div class="m-title">Torneo · mejor de 3</div><div class="m-desc">Se juegan 3 rondas y gana quien sume más puntos.</div></div>' +
      '<div class="mode-card" data-modo="mejor5"><div class="m-emoji">🥇</div><div class="m-title">Torneo · mejor de 5</div><div class="m-desc">Se juegan 5 rondas y gana quien sume más puntos.</div></div>' +
      '</div>';
    flowScreen.querySelectorAll('.mode-card').forEach(function (card) {
      card.onclick = function () {
        Motor.setModo(card.getAttribute('data-modo'));
        Motor.setFase('EQUIPOS');
        render();
      };
    });
  }

  /* =================== EQUIPOS (rejilla adaptativa) =================== */
  function colsPara(effectiveSlots) {
    if (effectiveSlots <= 1) return 1;
    if (effectiveSlots <= 2) return 2;
    if (effectiveSlots <= 4) return 2;
    if (effectiveSlots <= 6) return 3;
    return 4;
  }
  function slotsEfectivos(n) {
    if (n <= 1) return 1;
    if (n <= 2) return 2;
    if (n <= 4) return 4;
    if (n <= 6) return 6;
    return 8;
  }

  function renderEquipos() {
    if (Motor.getEquipos().length === 0) {
      var presets = Motor.presetsDisponibles();
      Motor.crearEquipoDesdePreset(presets[0]);
      Motor.crearEquipoDesdePreset(Motor.presetsDisponibles()[0]);
    }
    pintarEquiposFlow();
  }

  function pintarEquiposFlow() {
    var equipos = Motor.getEquipos();
    var efectivos = slotsEfectivos(equipos.length);
    var cols = colsPara(efectivos);

    var celdas = equipos.map(function (eq) {
      return '<div class="team-cell' + (eq.listo ? ' ready' : '') + '">' +
        (equipos.length > 2 ? '<button class="remove-slot" data-id="' + eq.id + '">✕</button>' : '') +
        '<div class="emoji">' + eq.emoji + '</div>' +
        '<div class="name">' + eq.nombre + '</div>' +
        '<div class="score">0</div>' +
        '<button class="listo-btn" data-id="' + eq.id + '">' + (eq.listo ? '✓ Listo' : 'Marcar listo') + '</button>' +
        '</div>';
    });
    var huecosRestantes = efectivos - equipos.length;
    if (equipos.length < 8 && huecosRestantes > 0) {
      celdas.push('<div class="team-cell add-slot" id="addSlotBtn"><div style="font-size:26px">＋</div>Añadir equipo</div>');
      huecosRestantes--;
    }
    for (var i = 0; i < huecosRestantes; i++) celdas.push('<div class="team-cell add-slot" style="opacity:.35;cursor:default"></div>');

    flowScreen.innerHTML =
      '<h2>¿Qué equipos entran hoy en juego?</h2>' +
      '<div class="muted">Añade entre 2 y 8 equipos y marcad "Listo" cuando estéis todos preparados.</div>' +
      '<div class="team-grid-wrap"><div class="team-grid cols-' + cols + '" id="teamGrid">' + celdas.join('') + '</div>' +
      '<div id="equiposError"></div>' +
      '<button class="big-cta" id="continuarEquiposBtn" disabled>▶ Continuar</button></div>' +
      '<div class="flow-footer"><button class="flow-back" id="backModoBtn">◀ Volver</button></div>';

    document.getElementById('backModoBtn').onclick = function () { Motor.setFase('MODO'); render(); };
    var addBtn = document.getElementById('addSlotBtn');
    if (addBtn) addBtn.onclick = abrirSelectorIdentidad;
    flowScreen.querySelectorAll('.remove-slot').forEach(function (btn) {
      btn.onclick = function (e) { e.stopPropagation(); Motor.quitarEquipo(btn.getAttribute('data-id')); pintarEquiposFlow(); };
    });
    flowScreen.querySelectorAll('.listo-btn').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        var eq = Motor.getEquipos().find(function (x) { return x.id === id; });
        Motor.marcarListo(id, !eq.listo);
        pintarEquiposFlow();
      };
    });
    document.getElementById('continuarEquiposBtn').onclick = function () {
      var res = Motor.confirmarInicio();
      if (!res.ok) { document.getElementById('equiposError').innerHTML = '<div class="error-box">⚠️ ' + res.error + '</div>'; return; }
      Motor.setFase('CONTENIDO_GATE');
      render();
    };
    actualizarBotonContinuarEquipos();
  }
  function actualizarBotonContinuarEquipos() {
    var btn = document.getElementById('continuarEquiposBtn');
    if (btn) btn.disabled = !Motor.todosListos();
  }

  function abrirSelectorIdentidad() {
    var presets = Motor.presetsDisponibles();
    identityGrid.innerHTML = presets.map(function (p) {
      return '<div class="identity-opt" data-nombre="' + p.nombre + '"><div class="emoji">' + p.emoji + '</div><div class="name">' + p.nombre + '</div></div>';
    }).join('');
    identityGrid.querySelectorAll('.identity-opt').forEach(function (opt) {
      opt.onclick = function () {
        var nombre = opt.getAttribute('data-nombre');
        var preset = presets.find(function (p) { return p.nombre === nombre; });
        Motor.crearEquipoDesdePreset(preset);
        identityOverlay.classList.remove('show');
        pintarEquiposFlow();
      };
    });
    identityOverlay.classList.add('show');
  }
  document.getElementById('identityCancel').onclick = function () { identityOverlay.classList.remove('show'); };

  /* =================== CONTENIDO (puerta obligatoria) =================== */
  function renderContenidoGate() {
    if (Motor.hayContenido()) { Motor.setFase('JUEGOS'); render(); return; }
    flowScreen.innerHTML =
      '<h2>Antes de empezar…</h2>' +
      '<div class="muted">Chivatini necesita el contenido curricular para poder preparar preguntas y retos.</div>' +
      '<button class="big-cta" id="loadContentBtn">📚 Cargar contenido.txt</button>' +
      '<div class="flow-footer"><button class="flow-back" id="backEquiposBtn">◀ Volver</button></div>';
    document.getElementById('backEquiposBtn').onclick = function () { Motor.setFase('EQUIPOS'); render(); };
    document.getElementById('loadContentBtn').onclick = function () { contentFileInput.click(); };
    Chivatini.decir('Antes de nada, necesito que cargues el contenido.txt de vuestra unidad.', 'recuperacion', { duracion: 3400 });
  }

  contentFileInput.onchange = function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var res = Motor.cargarContenido(reader.result);
      if (!res.ok) { alert('El archivo tiene errores:\n\n' + res.errores.join('\n')); return; }
      if (Motor.getFase() === 'CONTENIDO_GATE') { Motor.setFase('JUEGOS'); render(); }
      else alert('Contenido cargado: ' + Motor.getContenido().concepts.length + ' conceptos.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  /* =================== JUEGOS (catálogo) =================== */
  var CATALOGO_JUEGOS = [
    { id: 'reto_rapido', emoji: '⚡', titulo: 'Reto rápido', desc: 'Preguntas de aplicación con temporizador. El docente valida cada respuesta oralmente. Ideal para repasar conceptos concretos en poco tiempo.' }
  ];
  var juegoSeleccionado = null;

  function renderJuegos() {
    flowScreen.innerHTML =
      '<h2>¿A qué jugamos?</h2>' +
      '<div class="muted">Toca un juego para ver de qué va. Los nuevos juegos irán apareciendo aquí.</div>' +
      '<div class="game-catalog" id="gameCatalog"></div>' +
      '<div class="game-desc-box" id="gameDescBox">Selecciona un juego para ver su descripción.</div>' +
      '<button class="big-cta" id="confirmarJuegoBtn" disabled>▶ Confirmar y jugar</button>' +
      '<div class="flow-footer"><button class="flow-back" id="backContenidoBtn">◀ Volver</button></div>';

    document.getElementById('backContenidoBtn').onclick = function () { Motor.setFase('EQUIPOS'); render(); };

    var cat = document.getElementById('gameCatalog');
    cat.innerHTML = CATALOGO_JUEGOS.map(function (j) {
      return '<div class="game-card" data-id="' + j.id + '"><div class="g-emoji">' + j.emoji + '</div><div class="g-title">' + j.titulo + '</div></div>';
    }).join('');
    cat.querySelectorAll('.game-card').forEach(function (card) {
      card.onclick = function () {
        var j = CATALOGO_JUEGOS.find(function (x) { return x.id === card.getAttribute('data-id'); });
        juegoSeleccionado = j;
        document.getElementById('gameDescBox').innerHTML = '<strong>' + j.titulo + '</strong> — ' + j.desc;
        document.getElementById('confirmarJuegoBtn').disabled = false;
        cat.querySelectorAll('.game-card').forEach(function (c) { c.style.borderColor = 'transparent'; });
        card.style.borderColor = 'var(--accent-lima)';
      };
    });
    document.getElementById('confirmarJuegoBtn').onclick = function () {
      Chivatini.confirmar('¿Empezamos ' + juegoSeleccionado.titulo.toLowerCase() + '?', function () {
        document.getElementById('chivaConfirmBtn').classList.remove('show');
        empezarPartida();
      });
      var btnVamos = document.getElementById('chivaConfirmBtn');
      btnVamos.classList.add('show');
      btnVamos.onclick = function () {
        btnVamos.classList.remove('show');
        Chivatini.completarYCerrar();
      };
    };
  }

  /* =================== JUGANDO =================== */
  function empezarPartida() {
    Motor.incrementarRonda.__reset = true; // marcador, no usado por Motor pero documenta intención
    Motor.setFase('JUGANDO');
    Chivatini.bienvenida();
    render();
    irAPreparacion();
  }

  function renderTeamsPanel() {
    var equipos = Motor.getEquipos();
    var activoIdx = Motor.getEquipoActivoIdx();
    teamsPanel.innerHTML = equipos.map(function (eq, i) {
      return '<div class="team-card' + (i === activoIdx ? ' active' : '') + '">' +
        '<span class="now-playing">▶ Ahora juega</span>' +
        '<div class="t-name"><span class="t-emoji">' + eq.emoji + '</span>' + eq.nombre + '</div>' +
        '<div class="t-score" id="score-' + eq.id + '">' + eq.puntos + '</div>' +
        '</div>';
    }).join('');
  }
  Motor.on('puntuacion:cambio', function (d) {
    var el = document.getElementById('score-' + d.equipo.id);
    if (el) { el.textContent = d.equipo.puntos; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  });

  function irAPreparacion() {
    Motor.setEstado('PREPARACION');
    mostrarTurno(Motor.getEquipoActivo(), true);
  }
  function mostrarTurno(equipo, esInicio) {
    turnScreen.style.display = 'flex';
    turnScreen.innerHTML =
      '<div class="label">' + (esInicio ? 'Empieza jugando' : 'Siguiente turno') + '</div>' +
      '<div class="team">' + equipo.emoji + ' ' + equipo.nombre + '</div>' +
      '<button class="big-cta" id="continuarTurnoBtn">Continuar</button>';
    document.getElementById('continuarTurnoBtn').onclick = function () {
      turnScreen.style.display = 'none';
      Motor.setEstado('TURNO');
      renderTeamsPanel();
      Chivatini.anunciarTurno(equipo);
      renderReto();
    };
  }
  Motor.on('turno:siguiente', function (d) {
    if (Motor.getFase() !== 'JUGANDO') return;
    Chivatini.cambioTurno(d.siguiente);
    mostrarTurno(d.siguiente, false);
  });

  var retoActual = null, equipoRetoActual = null;

  function renderReto() {
    Motor.setEstado('PREGUNTA_RETO');
    var equipo = Motor.getEquipoActivo();
    var pregunta = Motor.preguntaParaEquipo(equipo.id);
    retoActual = pregunta; equipoRetoActual = equipo;

    if (!pregunta) {
      stageContent.innerHTML = '<div class="muted">No hay más preguntas disponibles en el contenido cargado.</div>';
      renderControles(equipo, null);
      return;
    }
    stageContent.innerHTML = '<h2 style="text-align:center;max-width:640px;font-size:26px">' + pregunta.question + '</h2>';
    renderControles(equipo, pregunta);
    iniciarRetoTimer();
  }

  function iniciarRetoTimer() {
    timerWrap.classList.remove('warn', 'danger');
    Motor.iniciarTemporizador(30,
      function (restante) {
        timerNum.textContent = restante;
        Chivatini.avisoTiempo(restante);
        timerWrap.classList.toggle('warn', restante <= 15 && restante > 5);
        timerWrap.classList.toggle('danger', restante <= 5);
      },
      function () {
        Chivatini.tiempoAgotado();
        timeUpBanner.style.display = 'flex';
        timeUpBanner.innerHTML =
          '<div>Tiempo agotado</div><div class="timeup-actions">' +
          '<button class="ctrl-btn ok" id="tuOk">✅ Acierto</button>' +
          '<button class="ctrl-btn fail" id="tuFail">❌ Fallo</button></div>';
        document.getElementById('tuOk').onclick = function () { timeUpBanner.style.display = 'none'; evaluar(true, retoActual, equipoRetoActual, 10); };
        document.getElementById('tuFail').onclick = function () { timeUpBanner.style.display = 'none'; evaluar(false, retoActual, equipoRetoActual, 0); };
      }
    );
    timerNum.textContent = 30;
  }

  function renderControles(equipo, pregunta) {
    var wrap = document.getElementById('teacherControls');
    wrap.innerHTML =
      '<button class="ctrl-btn ok" id="btnOk">✅ Acierto</button>' +
      '<button class="ctrl-btn fail" id="btnFail">❌ Fallo</button>' +
      '<button class="ctrl-btn great" id="btnGreat">⭐ Excelente</button>' +
      '<button class="ctrl-btn plus" id="btnPlus">➕ Puntos</button>' +
      '<button class="ctrl-btn minus" id="btnMinus">➖ Puntos</button>' +
      '<button class="ctrl-btn neutral" id="btnPause">⏸ Pausa</button>' +
      '<button class="ctrl-btn neutral" id="btnNext">➡ Siguiente turno</button>';
    document.getElementById('btnOk').onclick = function () { evaluar(true, pregunta, equipo, 10); };
    document.getElementById('btnFail').onclick = function () { evaluar(false, pregunta, equipo, 0); };
    document.getElementById('btnGreat').onclick = function () { evaluar(true, pregunta, equipo, 15); Chivatini.felicitar(equipo, 'respuesta excelente.'); };
    document.getElementById('btnPlus').onclick = function () { Motor.sumarPuntos(equipo.id, 5); };
    document.getElementById('btnMinus').onclick = function () { Motor.sumarPuntos(equipo.id, -5); };
    document.getElementById('btnPause').onclick = function () { Motor.pausarTemporizador(); };
    document.getElementById('btnNext').onclick = function () { Motor.detenerTemporizador(); Motor.siguienteEquipo(); };
  }

  function evaluar(acierto, pregunta, equipo, puntos) {
    Motor.detenerTemporizador();
    Motor.setEstado('FEEDBACK');
    if (pregunta) {
      Motor.registrarResultado(equipo.id, pregunta.concept_id, acierto, pregunta.type);
      if (acierto) Chivatini.acierto(equipo); else Chivatini.error(equipo);
    }
    Motor.sumarPuntos(equipo.id, acierto ? puntos : 0);
    var ronda = Motor.incrementarRonda();
    setTimeout(function () {
      if (Motor.objetivoAlcanzado()) irAResultados();
      else Motor.siguienteEquipo();
    }, 900);
  }

  /* =================== RESULTADOS / TROFEO =================== */
  function irAResultados() {
    Motor.detenerTemporizador();
    Motor.setFase('RESULTADOS');
    render();
  }
  function renderResultados() {
    var ranking = Motor.clasificacion();
    var resumen = Motor.analizarDominioGrupal();
    var contenido = Motor.getContenido();
    function nombresDe(ids) {
      if (!contenido) return ids.join(', ') || '—';
      return ids.map(function (id) { var c = contenido.concepts.find(function (c) { return c.id === id; }); return c ? c.term : id; }).join(', ') || '—';
    }
    flowScreen.innerHTML =
      '<div class="results-box">' +
      '<div class="trophy">🏆</div>' +
      '<h2>¡Enhorabuena, equipo ' + (ranking[0] ? ranking[0].nombre : '') + '!</h2>' +
      '<div class="rank-list">' + ranking.map(function (eq, i) {
        return '<div class="rank-row"><span class="pos">' + (i + 1) + '</span><span>' + eq.emoji + ' ' + eq.nombre + '</span><span class="pts">' + eq.puntos + '</span></div>';
      }).join('') + '</div>' +
      '<div class="crack">💪 Habéis sido unos crack en: ' + nombresDe(resumen.dominados) + '</div>' +
      '<div class="reforzar">🔧 Recordad reforzar: ' + nombresDe(resumen.reforzar) + '</div>' +
      '<div style="display:flex;gap:12px;margin-top:6px">' +
      '<button class="big-cta" id="otroJuegoBtn">▶ Elegir otro juego</button>' +
      '<button class="flow-back" id="menuPrincipalBtn">🏠 Menú principal</button>' +
      '</div></div>';
    if (ranking[0]) Chivatini.victoria(ranking[0]);
    document.getElementById('otroJuegoBtn').onclick = function () {
      Motor.setFase('JUEGOS');
      // el marcador y los equipos se mantienen; solo se reinicia el contador de rondas del modo
      Motor.setModo(Motor.getModo().tipo);
      render();
    };
    document.getElementById('menuPrincipalBtn').onclick = confirmarMenuPrincipal;
  }

  /* =================== MENÚ ÚNICO (ayuda + acciones + salir) =================== */
  var helpBtn = document.getElementById('helpBtn');
  var helpPanel = document.getElementById('helpPanel');
  helpBtn.onclick = function (e) { e.stopPropagation(); renderHelpPanel(); helpPanel.classList.toggle('open'); };
  document.addEventListener('click', function (e) {
    if (helpPanel.classList.contains('open') && !helpPanel.contains(e.target) && e.target !== helpBtn) helpPanel.classList.remove('open');
  });

  function renderHelpPanel() {
    var fase = Motor.getFase();
    var acciones = [];
    if (fase === 'JUGANDO' || fase === 'JUEGOS') {
      acciones.push('<button class="hp-btn" id="hpContenido">📚 Cargar / cambiar contenido</button>');
    }
    if (fase === 'JUGANDO') {
      acciones.push('<button class="hp-btn" id="hpFinalizar">🏁 Finalizar y ver resultados</button>');
    }
    if (fase !== 'SPLASH') {
      acciones.push('<button class="hp-btn" id="hpMenu">🏠 Salir al menú principal</button>');
    }
    document.getElementById('hpActions').innerHTML = acciones.join('');
    var b1 = document.getElementById('hpContenido'); if (b1) b1.onclick = function () { helpPanel.classList.remove('open'); contentFileInput.click(); };
    var b2 = document.getElementById('hpFinalizar'); if (b2) b2.onclick = function () { helpPanel.classList.remove('open'); irAResultados(); };
    var b3 = document.getElementById('hpMenu'); if (b3) b3.onclick = function () { helpPanel.classList.remove('open'); confirmarMenuPrincipal(); };
  }

  function confirmarMenuPrincipal() {
    if (confirm('¿Salir al menú principal? El progreso actual se guarda automáticamente y podrás continuarlo luego.')) {
      Motor.persistir();
      Motor.setFase('SPLASH');
      mostrarSplash();
    }
  }

  /* =================== ARRANQUE =================== */
  if (Motor.restaurarSesion() && Motor.getFase() !== 'SPLASH') {
    // hay sesión previa: dejamos que decida desde la portada si continuar o empezar de cero
  }
  mostrarSplash();

})();
