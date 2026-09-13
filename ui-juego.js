/* ===================================================================
   UI JUEGO — CONTENIDO_GATE, JUEGOS, JUGANDO (turnos/reto/resultados)
   =================================================================== */

(function () {

  var refs = UI.refs;

  /* =================== CONTENIDO (puerta obligatoria, sin cháchara) =================== */
  UI.screens.CONTENIDO_GATE = function () {
    if (Motor.hayContenido()) { Motor.setFase('JUEGOS'); UI.render(); return; }
    refs.flowScreen.innerHTML =
      '<h2>Cargad el contenido de la unidad</h2>' +
      '<div class="muted">Necesitamos el contenido.txt para preparar preguntas y retos.</div>' +
      '<button class="big-cta" id="loadContentBtn">📚 Cargar contenido.txt</button>' +
      '<div class="flow-footer"><button class="flow-back" id="backEquiposBtn">◀ Volver</button></div>';
    document.getElementById('backEquiposBtn').onclick = function () { Motor.setFase('EQUIPOS'); UI.render(); };
    document.getElementById('loadContentBtn').onclick = function () { refs.contentFileInput.click(); };
  };

  refs.contentFileInput.onchange = function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var res = Motor.cargarContenido(reader.result);
      if (!res.ok) { alert('El archivo tiene errores:\n\n' + res.errores.join('\n')); return; }
      if (Motor.getFase() === 'CONTENIDO_GATE') { Motor.setFase('JUEGOS'); UI.render(); }
      else alert('Contenido cargado: ' + Motor.getContenido().concepts.length + ' conceptos.');
    };
    reader.readAsText(file, 'UTF-8');
  };
  UI.actions.cargarContenido = function () { refs.contentFileInput.click(); };

  /* =================== JUEGOS (catálogo) =================== */
  var CATALOGO_JUEGOS = [
    { id: 'reto_rapido', emoji: '⚡', titulo: 'Reto rápido', desc: 'Preguntas de aplicación con temporizador. El docente valida cada respuesta oralmente. Ideal para repasar conceptos concretos en poco tiempo.' }
  ];
  var juegoSeleccionado = null;

  UI.screens.JUEGOS = function () {
    refs.flowScreen.innerHTML =
      '<h2>¿A qué jugamos?</h2>' +
      '<div class="muted">Toca un juego para ver de qué va. Los nuevos juegos irán apareciendo aquí.</div>' +
      '<div class="game-catalog" id="gameCatalog"></div>' +
      '<div class="game-desc-box" id="gameDescBox">Selecciona un juego para ver su descripción.</div>' +
      '<button class="big-cta" id="confirmarJuegoBtn" disabled>▶ Empezar a jugar</button>' +
      '<div class="flow-footer"><button class="flow-back" id="backEquiposBtn2">◀ Volver</button></div>';

    document.getElementById('backEquiposBtn2').onclick = function () { Motor.setFase('EQUIPOS'); UI.render(); };

    var cat = document.getElementById('gameCatalog');
    cat.innerHTML = CATALOGO_JUEGOS.map(function (j) {
      return '<div class="game-card" data-id="' + j.id + '"><div class="g-emoji emoji">' + j.emoji + '</div><div class="g-title">' + j.titulo + '</div></div>';
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
    document.getElementById('confirmarJuegoBtn').onclick = function () { empezarPartida(); };
  };

  function empezarPartida() {
    UI.mostrarTransicionJuego(function () {
      Motor.setFase('JUGANDO');
      UI.render();
    });
  }

  /* =================== JUGANDO =================== */
  UI.screens.JUGANDO = function () {
    renderTeamsPanel();
    irAPreparacion();
  };

  function renderTeamsPanel() {
    var equipos = Motor.getEquipos();
    var activoIdx = Motor.getEquipoActivoIdx();
    refs.teamsPanel.innerHTML = equipos.map(function (eq, i) {
      return '<div class="team-card' + (i === activoIdx ? ' active' : '') + '">' +
        '<span class="now-playing">▶ Ahora juega</span>' +
        '<div class="t-name"><span class="t-emoji emoji">' + eq.emoji + '</span>' + eq.nombre + '</div>' +
        (eq.portavoz ? '<div class="t-portavoz">🎤 ' + eq.portavoz + '</div>' : '') +
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
    refs.turnScreen.style.display = 'flex';
    refs.turnScreen.innerHTML =
      '<div class="label">' + (esInicio ? 'Empieza jugando' : 'Siguiente turno') + '</div>' +
      '<div class="team"><span class="emoji">' + equipo.emoji + '</span>' + equipo.nombre + '</div>' +
      (equipo.portavoz ? '<div class="portavoz-call">Vamos, ' + equipo.portavoz + ' — ¡os toca!</div>' : '') +
      '<button class="big-cta" id="continuarTurnoBtn">Continuar</button>';
    document.getElementById('continuarTurnoBtn').onclick = function () {
      refs.turnScreen.style.display = 'none';
      Motor.setEstado('TURNO');
      renderTeamsPanel();
      renderReto();
    };
  }
  Motor.on('turno:siguiente', function (d) {
    if (Motor.getFase() !== 'JUGANDO') return;
    mostrarTurno(d.siguiente, false);
  });

  var retoActual = null, equipoRetoActual = null;

  function renderReto() {
    Motor.setEstado('PREGUNTA_RETO');
    var equipo = Motor.getEquipoActivo();
    var pregunta = Motor.preguntaParaEquipo(equipo.id);
    retoActual = pregunta; equipoRetoActual = equipo;

    if (!pregunta) {
      refs.stageContent.innerHTML = '<div class="muted">No hay más preguntas disponibles en el contenido cargado.</div>';
      renderControles(equipo, null);
      return;
    }
    refs.stageContent.innerHTML = '<h2 style="text-align:center;max-width:640px;font-size:26px">' + pregunta.question + '</h2>';
    renderControles(equipo, pregunta);
    iniciarRetoTimer();
  }

  function iniciarRetoTimer() {
    refs.timerWrap.classList.remove('warn', 'danger');
    refs.timerWarnText.classList.remove('show');
    var timerNum = refs.timerWrap.querySelector('.t-num');
    Motor.iniciarTemporizador(30,
      function (restante) {
        timerNum.textContent = restante;
        refs.timerWrap.classList.toggle('warn', restante <= 15 && restante > 5);
        refs.timerWrap.classList.toggle('danger', restante <= 5);
        if (restante === 10) { refs.timerWarnText.textContent = '¡Quedan 10s!'; refs.timerWarnText.classList.add('show'); }
        if (restante <= 4) refs.timerWarnText.classList.remove('show');
      },
      function () {
        refs.timerWarnText.classList.remove('show');
        refs.timeUpBanner.style.display = 'flex';
        refs.timeUpBanner.innerHTML =
          '<div>Tiempo agotado</div><div class="timeup-actions">' +
          '<button class="ctrl-btn ok" id="tuOk">✅ Acierto</button>' +
          '<button class="ctrl-btn fail" id="tuFail">❌ Fallo</button></div>';
        document.getElementById('tuOk').onclick = function () { refs.timeUpBanner.style.display = 'none'; evaluar(true, retoActual, equipoRetoActual, 10); };
        document.getElementById('tuFail').onclick = function () { refs.timeUpBanner.style.display = 'none'; evaluar(false, retoActual, equipoRetoActual, 0); };
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
    Motor.incrementarRonda();
    setTimeout(function () {
      if (Motor.objetivoAlcanzado()) irAResultados();
      else Motor.siguienteEquipo();
    }, 900);
  }

  /* =================== RESULTADOS / TROFEO =================== */
  function irAResultados() { Motor.detenerTemporizador(); Motor.setFase('RESULTADOS'); UI.render(); }
  UI.actions.finalizar = irAResultados;

  UI.screens.RESULTADOS = function () {
    var ranking = Motor.clasificacion();
    var resumen = Motor.analizarDominioGrupal();
    var contenido = Motor.getContenido();
    function nombresDe(ids) {
      if (!contenido) return ids.join(', ') || '—';
      return ids.map(function (id) { var c = contenido.concepts.find(function (c) { return c.id === id; }); return c ? c.term : id; }).join(', ') || '—';
    }
    refs.flowScreen.innerHTML =
      '<div class="results-box">' +
      '<div class="trophy">🏆</div>' +
      '<h2>¡Enhorabuena, equipo ' + (ranking[0] ? ranking[0].nombre : '') + '!</h2>' +
      '<div class="rank-list">' + ranking.map(function (eq, i) {
        return '<div class="rank-row"><span class="pos">' + (i + 1) + '</span><span class="emoji">' + eq.emoji + '</span><span>' + eq.nombre + '</span><span class="pts">' + eq.puntos + '</span></div>';
      }).join('') + '</div>' +
      '<div class="crack">💪 Habéis sido unos crack en: ' + nombresDe(resumen.dominados) + '</div>' +
      '<div class="reforzar">🔧 Recordad reforzar: ' + nombresDe(resumen.reforzar) + '</div>' +
      '<div style="display:flex;gap:12px;margin-top:6px">' +
      '<button class="big-cta" id="otroJuegoBtn">▶ Elegir otro juego</button>' +
      '<button class="flow-back" id="menuPrincipalBtn">🏠 Menú principal</button>' +
      '</div></div>';
    if (ranking[0]) Chivatini.victoria(ranking[0]);
    document.getElementById('otroJuegoBtn').onclick = function () {
      Motor.setModo(Motor.getModo().tipo);
      Motor.setFase('JUEGOS');
      UI.render();
    };
    document.getElementById('menuPrincipalBtn').onclick = function () {
      Motor.persistir();
      Motor.setFase('SPLASH');
      UI.render();
    };
  };

})();
