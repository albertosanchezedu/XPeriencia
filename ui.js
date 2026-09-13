/* ===================================================================
   UI — arnés de demostración del motor común.
   Esto NO es un juego: es la prueba de que equipos, puntuación,
   Chivatini, contenido, turnos, temporizador y dificultad funcionan
   de forma compartida. Los juegos reales se montarán sobre esta base.
   =================================================================== */

(function () {

  var stage = document.getElementById('stage');
  var teamsPanel = document.getElementById('teamsPanel');
  var turnScreen = document.getElementById('turnScreen');
  var timeUpBanner = document.getElementById('timeUpBanner');
  var timerWrap = document.getElementById('timerWrap');
  var timerNum = timerWrap.querySelector('.t-num');

  Chivatini.init();

  /* ---------------- CONFIGURACIÓN ---------------- */
  var EMOJIS_DISPONIBLES = ['📦','🚚','🛒','🏬','🧾','📈','🏷️','🧮','🗃️','🛠️','💼','📋'];
  var filas = [];

  function renderConfig() {
    Motor.setEstado('CONFIGURACION');
    stage.innerHTML =
      '<div class="config-screen">' +
      '<h2>Configurar equipos</h2>' +
      '<div id="filasEquipos"></div>' +
      '<button class="nav-btn" id="addTeamBtn">➕ Añadir equipo</button>' +
      '<div id="errorBox"></div>' +
      '<button class="big-cta" id="startBtn">EMPEZAR</button>' +
      '</div>';

    filas = [];
    for (var i = 0; i < 2; i++) agregarFila();
    document.getElementById('addTeamBtn').onclick = function () {
      if (filas.length < 8) agregarFila();
    };
    document.getElementById('startBtn').onclick = intentarCrearEquipos;
  }

  function agregarFila() {
    var idx = filas.length;
    var row = document.createElement('div');
    row.className = 'team-form-row';
    var emoji = EMOJIS_DISPONIBLES[idx % EMOJIS_DISPONIBLES.length];
    row.innerHTML =
      '<button type="button" class="emoji-pick">' + emoji + '</button>' +
      '<input type="text" placeholder="Nombre del equipo" value="Equipo ' + (idx + 1) + '">' +
      '<button type="button" class="remove-team">✕</button>';
    document.getElementById('filasEquipos').appendChild(row);
    var data = { emoji: emoji, input: row.querySelector('input') };
    row.querySelector('.emoji-pick').onclick = function () {
      var pos = EMOJIS_DISPONIBLES.indexOf(data.emoji);
      data.emoji = EMOJIS_DISPONIBLES[(pos + 1) % EMOJIS_DISPONIBLES.length];
      row.querySelector('.emoji-pick').textContent = data.emoji;
    };
    row.querySelector('.remove-team').onclick = function () {
      if (filas.length <= 2) return;
      row.remove();
      filas = filas.filter(function (f) { return f !== data; });
    };
    filas.push(data);
  }

  function intentarCrearEquipos() {
    var lista = filas.map(function (f) {
      return { nombre: f.input.value, emoji: f.emoji };
    });
    var res = Motor.crearEquipos(lista);
    var box = document.getElementById('errorBox');
    if (!res.ok) {
      box.innerHTML = '<div class="error-box">⚠️ ' + res.error + '</div>';
      return;
    }
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
        '<span class="now-playing">▶ AHORA JUEGA</span>' +
        '<div class="t-name"><span class="t-emoji">' + eq.emoji + '</span>' + eq.nombre.toUpperCase() + '</div>' +
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
      '<div class="team">' + equipo.emoji + ' ' + equipo.nombre.toUpperCase() + '</div>' +
      '<button class="big-cta" id="continuarTurnoBtn">CONTINUAR</button>';
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
        '<div class="config-screen" style="text-align:center">' +
        '<h2>Sin contenido cargado</h2>' +
        '<p>Carga un <b>contenido.txt</b> con el botón "📚 CONTENIDO" para ver preguntas reales aquí.</p>' +
        '</div>';
      renderControles(equipo, null);
      return;
    }

    stage.innerHTML =
      '<div id="timerWrap-inner"></div>' +
      '<h2 style="text-align:center;max-width:640px">' + pregunta.question + '</h2>';

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
        timeUpBanner.innerHTML = '<div>⏰ TIEMPO AGOTADO</div><button class="big-cta" id="tuContinuar">CONTINUAR</button>';
        document.getElementById('tuContinuar').onclick = function () {
          timeUpBanner.style.display = 'none';
        };
      }
    );
    timerNum.textContent = 30;
  }

  /* ---------------- CONTROLES DOCENTE ---------------- */
  function renderControles(equipo, pregunta) {
    var wrap = document.getElementById('teacherControls');
    wrap.innerHTML =
      '<button class="ctrl-btn ok" id="btnOk">✅ ACIERTO</button>' +
      '<button class="ctrl-btn fail" id="btnFail">❌ FALLO</button>' +
      '<button class="ctrl-btn great" id="btnGreat">⭐ EXCELENTE</button>' +
      '<button class="ctrl-btn plus" id="btnPlus">➕ PUNTOS</button>' +
      '<button class="ctrl-btn minus" id="btnMinus">➖ PUNTOS</button>' +
      '<button class="ctrl-btn neutral" id="btnPause">⏸ PAUSA</button>' +
      '<button class="ctrl-btn neutral" id="btnNext">➡ SIGUIENTE TURNO</button>';

    document.getElementById('btnOk').onclick = function () { evaluar(true, pregunta, equipo, 10); };
    document.getElementById('btnFail').onclick = function () { evaluar(false, pregunta, equipo, 0); };
    document.getElementById('btnGreat').onclick = function () { evaluar(true, pregunta, equipo, 15); Chivatini.felicitar(equipo, '¡respuesta excelente!'); };
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
  document.getElementById('contentBtn').onclick = function () {
    document.getElementById('contentFile').click();
  };
  document.getElementById('contentFile').onchange = function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var res = Motor.cargarContenido(reader.result);
      if (!res.ok) {
        alert('El archivo tiene errores:\n\n' + res.errores.join('\n'));
      } else {
        alert('Contenido cargado: ' + Motor.getContenido().concepts.length + ' conceptos.');
      }
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
      '<div class="crack">💪 HABÉIS SIDO UNOS CRACK EN: ' + nombresDe(resumen.dominados) + '</div>' +
      '<div class="reforzar">🔧 RECORDAD REFORZAR: ' + nombresDe(resumen.reforzar) + '</div>' +
      '</div>';
    document.getElementById('teacherControls').innerHTML = '';
    var ganador = Motor.getEquipos().slice().sort(function (a, b) { return b.puntos - a.puntos; })[0];
    if (ganador) Chivatini.victoria(ganador);
  };

  /* ---------------- ARRANQUE ---------------- */
  if (Motor.restaurarSesion() && Motor.getEquipos().length) {
    renderTeamsPanel();
    irAPreparacion();
  } else {
    renderConfig();
  }

})();
