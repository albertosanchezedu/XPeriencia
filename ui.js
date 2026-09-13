/* ===================================================================
   UI v2 — arnés de demostración del motor común.
   =================================================================== */

(function () {

  var stage = document.getElementById('stage');
  var teamsPanel = document.getElementById('teamsPanel');
  var turnScreen = document.getElementById('turnScreen');
  var timeUpBanner = document.getElementById('timeUpBanner');
  var timerWrap = document.getElementById('timerWrap');
  var timerNum = timerWrap.querySelector('.t-num');
  var identityOverlay = document.getElementById('identityOverlay');
  var identityGrid = document.getElementById('identityGrid');

  Chivatini.init();

  /* ---------------- CONFIGURACIÓN: elegir equipos ---------------- */
  function renderConfig() {
    Motor.setEstado('CONFIGURACION');
    stage.innerHTML =
      '<div class="config-screen">' +
      '<h2>¡Vamos a jugar!</h2>' +
      '<div class="muted">¿Qué equipos entran hoy en juego? Elige entre 2 y 8.</div>' +
      '<div class="slots-grid" id="slotsGrid"></div>' +
      '<div id="errorBox"></div>' +
      '<button class="big-cta" id="startBtn" disabled>▶ Empezar partida</button>' +
      '</div>';

    // arrancamos con 2 equipos por defecto para no obligar a elegir de cero
    Motor.getEquipos().forEach(function (e) { Motor.quitarEquipo(e.id); });
    var presets = Motor.presetsDisponibles();
    Motor.crearEquipoDesdePreset(presets[0]);
    Motor.crearEquipoDesdePreset(Motor.presetsDisponibles()[0]);

    renderSlots();
    document.getElementById('startBtn').onclick = intentarEmpezar;
  }

  function renderSlots() {
    var grid = document.getElementById('slotsGrid');
    var equipos = Motor.getEquipos();
    var html = equipos.map(function (eq) {
      return '<div class="slot-card">' +
        (equipos.length > 2 ? '<button class="remove-slot" data-id="' + eq.id + '">✕</button>' : '') +
        '<div class="emoji">' + eq.emoji + '</div>' +
        '<div class="name">' + eq.nombre + '</div>' +
        '<div class="score">0</div>' +
        '</div>';
    }).join('');
    if (equipos.length < 8) {
      html += '<div class="add-slot" id="addSlotBtn"><div style="font-size:22px">＋</div>Añadir equipo</div>';
    }
    grid.innerHTML = html;

    grid.querySelectorAll('.remove-slot').forEach(function (btn) {
      btn.onclick = function () {
        Motor.quitarEquipo(btn.getAttribute('data-id'));
        renderSlots();
        actualizarBotonEmpezar();
      };
    });
    var addBtn = document.getElementById('addSlotBtn');
    if (addBtn) addBtn.onclick = abrirSelectorIdentidad;

    actualizarBotonEmpezar();
  }

  function actualizarBotonEmpezar() {
    var startBtn = document.getElementById('startBtn');
    if (!startBtn) return;
    var n = Motor.getEquipos().length;
    startBtn.disabled = n < 2;
  }

  function abrirSelectorIdentidad() {
    var presets = Motor.presetsDisponibles();
    identityGrid.innerHTML = presets.map(function (p) {
      return '<div class="identity-opt" data-nombre="' + p.nombre + '">' +
        '<div class="emoji">' + p.emoji + '</div>' +
        '<div class="name">' + p.nombre + '</div>' +
        '<div class="muted" style="font-size:12px">0</div>' +
        '</div>';
    }).join('');
    identityGrid.querySelectorAll('.identity-opt').forEach(function (opt) {
      opt.onclick = function () {
        var nombre = opt.getAttribute('data-nombre');
        var preset = presets.find(function (p) { return p.nombre === nombre; });
        Motor.crearEquipoDesdePreset(preset);
        identityOverlay.classList.remove('show');
        renderSlots();
      };
    });
    identityOverlay.classList.add('show');
  }
  document.getElementById('identityCancel').onclick = function () {
    identityOverlay.classList.remove('show');
  };

  function intentarEmpezar() {
    var res = Motor.confirmarInicio();
    var box = document.getElementById('errorBox');
    if (!res.ok) { box.innerHTML = '<div class="error-box">⚠️ ' + res.error + '</div>'; return; }
    box.innerHTML = '';
    renderTeamsPanel();
    Chivatini.bienvenida();
    irAPreparacion();
  }

  /* ---------------- PANEL DE EQUIPOS (persistente) ---------------- */
  function renderTeamsPanel() {
    var equipos = Motor.getEquipos();
    var activoIdx = Motor.getEquipoActivoIdx();
    teamsPanel.innerHTML = equipos.map(function (eq, i) {
      return '<div class="team-card' + (i === activoIdx ? ' active' : '') + '" data-idx="' + i + '">' +
        '<span class="now-playing">▶ Ahora juega</span>' +
        '<div class="t-name"><span class="t-emoji">' + eq.emoji + '</span>' + eq.nombre + '</div>' +
        '<div class="t-score" id="score-' + eq.id + '">' + eq.puntos + '</div>' +
        '</div>';
    }).join('');
  }

  Motor.on('puntuacion:cambio', function (d) {
    var el = document.getElementById('score-' + d.equipo.id);
    if (el) {
      el.textContent = d.equipo.puntos;
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    }
  });

  /* ---------------- PREPARACIÓN / TURNO ---------------- */
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
    Chivatini.cambioTurno(d.siguiente);
    mostrarTurno(d.siguiente, false);
  });

  /* ---------------- RETO / PREGUNTA (demo con contenido.txt) ---------------- */
  function renderReto() {
    Motor.setEstado('PREGUNTA_RETO');
    var equipo = Motor.getEquipoActivo();
    var pregunta = Motor.preguntaParaEquipo(equipo.id);

    if (!pregunta) {
      stage.innerHTML =
        '<div class="config-screen">' +
        '<h2>Aún no hay contenido cargado</h2>' +
        '<div class="muted">Carga un contenido.txt con el botón "Contenido" para ver preguntas reales aquí.</div>' +
        '</div>';
      renderControles(equipo, null);
      return;
    }

    stage.innerHTML = '<h2 style="text-align:center;max-width:640px;font-size:26px">' + pregunta.question + '</h2>';
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
        timeUpBanner.innerHTML = '<div>Tiempo agotado</div><button class="big-cta" id="tuContinuar">Continuar</button>';
        document.getElementById('tuContinuar').onclick = function () { timeUpBanner.style.display = 'none'; };
      }
    );
    timerNum.textContent = 30;
  }

  /* ---------------- CONTROLES DOCENTE ---------------- */
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
    setTimeout(function () { Motor.siguienteEquipo(); }, 900);
  }

  /* ---------------- CARGA DE CONTENIDO ---------------- */
  document.getElementById('contentBtn').onclick = function () { document.getElementById('contentFile').click(); };
  document.getElementById('contentFile').onchange = function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var res = Motor.cargarContenido(reader.result);
      if (!res.ok) alert('El archivo tiene errores:\n\n' + res.errores.join('\n'));
      else alert('Contenido cargado: ' + Motor.getContenido().concepts.length + ' conceptos.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  /* ---------------- RESULTADOS ---------------- */
  document.getElementById('endBtn').onclick = function () {
    Motor.detenerTemporizador();
    Motor.setEstado('RESULTADOS');
    var resumen = Motor.analizarDominioGrupal();
    var contenido = Motor.getContenido();
    function nombresDe(ids) {
      if (!contenido) return ids.join(', ');
      return ids.map(function (id) {
        var c = contenido.concepts.find(function (c) { return c.id === id; });
        return c ? c.term : id;
      }).join(', ') || '—';
    }
    stage.innerHTML =
      '<div class="results-box">' +
      '<h2>Resultados</h2>' +
      '<div class="crack">💪 Habéis sido unos crack en: ' + nombresDe(resumen.dominados) + '</div>' +
      '<div class="reforzar">🔧 Recordad reforzar: ' + nombresDe(resumen.reforzar) + '</div>' +
      '</div>';
    document.getElementById('teacherControls').innerHTML = '';
    var ganador = Motor.getEquipos().slice().sort(function (a, b) { return b.puntos - a.puntos; })[0];
    if (ganador) Chivatini.victoria(ganador);
  };

  /* ---------------- BOTÓN DE AYUDA ---------------- */
  var helpBtn = document.getElementById('helpBtn');
  var helpPanel = document.getElementById('helpPanel');
  helpBtn.onclick = function (e) { e.stopPropagation(); helpPanel.classList.toggle('open'); };
  document.addEventListener('click', function (e) {
    if (helpPanel.classList.contains('open') && !helpPanel.contains(e.target) && e.target !== helpBtn) {
      helpPanel.classList.remove('open');
    }
  });

  /* ---------------- ARRANQUE ---------------- */
  if (Motor.restaurarSesion() && Motor.getEquipos().length) {
    renderTeamsPanel();
    irAPreparacion();
  } else {
    renderConfig();
  }

})();
