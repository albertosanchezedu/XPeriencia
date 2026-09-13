/* ===================================================================
   UI JUEGO — CONTENIDO_GATE, JUEGOS, JUGANDO (turnos/reto/resultados)
   =================================================================== */

(function () {

  var refs = UI.refs;

  /* =================== CONTENIDO (puerta obligatoria) =================== */
  UI.screens.CONTENIDO_GATE = function () {
    if (Motor.hayContenido()) { Motor.setFase('JUEGOS'); UI.render(); return; }
    refs.flowScreen.innerHTML =
      '<h2>Ey, profe 👋</h2>' +
      '<div class="muted">Antes de nada, sube el contenido.txt de esta unidad para que preparemos las preguntas.</div>' +
      '<button class="big-cta" id="loadContentBtn">📚 Subir contenido.txt</button>' +
      '<div id="contentConfirmBox"></div>' +
      '<div class="flow-footer"><button class="flow-back" id="backEquiposBtn">◀ Volver</button></div>';
    document.getElementById('backEquiposBtn').onclick = function () { Motor.setFase('EQUIPOS'); UI.render(); };
    document.getElementById('loadContentBtn').onclick = function () { Sonido.clic(); refs.contentFileInput.click(); };
  };

  refs.contentFileInput.onchange = function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var res = Motor.cargarContenido(reader.result);
      if (!res.ok) { alert('El archivo tiene errores:\n\n' + res.errores.join('\n')); return; }
      var meta = Motor.getContenido().metadata || {};
      var etiqueta = [meta.modulo, meta.unidad].filter(Boolean).join(' · ') || meta.titulo || 'contenido cargado';
      if (Motor.getFase() === 'CONTENIDO_GATE') {
        var box = document.getElementById('contentConfirmBox');
        if (box) {
          box.innerHTML = '<div class="content-loaded-box"><span class="ok-tag">✔ Listo,</span> ya tengo cargado <strong>' + etiqueta + '</strong> (' + Motor.getContenido().concepts.length + ' conceptos). ¡Vamos a por el catálogo!</div>';
          Sonido.acierto();
          setTimeout(function () { Motor.setFase('JUEGOS'); UI.render(); }, 1700);
        } else { Motor.setFase('JUEGOS'); UI.render(); }
      } else {
        alert('Contenido actualizado: ' + etiqueta + ' (' + Motor.getContenido().concepts.length + ' conceptos).');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };
  UI.actions.cargarContenido = function () { refs.contentFileInput.click(); };

  /* =================== JUEGOS (catálogo) =================== */
  var CATALOGO_JUEGOS = [
    { id: 'reto_rapido', emoji: '⚡', titulo: 'Reto rápido', desc: 'Preguntas de aplicación con temporizador. El docente valida cada respuesta oralmente. Ideal para repasar conceptos concretos en poco tiempo.', disponible: true },
    { id: 'infiltrado', emoji: '🕵️', titulo: 'Infiltrado', desc: 'Un equipo no conoce el concepto secreto y debe disimularlo mientras el resto da pistas. Próximamente.', disponible: false },
    { id: 'combate', emoji: '⚔️', titulo: 'El combate', desc: 'Duelo directo entre dos equipos con preguntas de opción múltiple a contrarreloj. Próximamente.', disponible: false },
    { id: 'batalla_naval', emoji: '🚢', titulo: 'Batalla naval', desc: 'Localiza conceptos en un tablero por coordenadas y hunde la flota rival respondiendo bien. Próximamente.', disponible: false },
    { id: 'flashcards', emoji: '🃏', titulo: 'Flashcards', desc: 'Tarjetas con giro 3D: término por delante, definición al dar la vuelta. Próximamente.', disponible: false },
    { id: 'pictionary', emoji: '🎨', titulo: 'Pictionary FP', desc: 'Dibuja, mima o explica el concepto para que tu equipo lo adivine. Próximamente.', disponible: false }
  ];
  var juegoSeleccionado = null;

  UI.screens.JUEGOS = function () {
    refs.flowScreen.innerHTML =
      '<h2>¿A qué jugamos?</h2>' +
      '<div class="muted">Toca un juego para ver de qué va. Los que están en gris llegarán pronto.</div>' +
      '<div class="game-catalog" id="gameCatalog"></div>' +
      '<div class="game-desc-box" id="gameDescBox">Selecciona un juego para ver su descripción.</div>' +
      '<button class="big-cta" id="confirmarJuegoBtn" disabled>▶ Empezar a jugar</button>' +
      '<div class="flow-footer"><button class="flow-back" id="backEquiposBtn2">◀ Volver</button></div>';

    document.getElementById('backEquiposBtn2').onclick = function () { Motor.setFase('EQUIPOS'); UI.render(); };

    var cat = document.getElementById('gameCatalog');
    cat.innerHTML = CATALOGO_JUEGOS.map(function (j) {
      return '<div class="game-card' + (j.disponible ? '' : ' soon') + '" data-id="' + j.id + '">' +
        (j.disponible ? '' : '<span class="soon-badge">PRÓXIMAMENTE</span>') +
        '<div class="g-emoji emoji">' + j.emoji + '</div><div class="g-title">' + j.titulo + '</div></div>';
    }).join('');
    cat.querySelectorAll('.game-card').forEach(function (card) {
      card.onclick = function () {
        var j = CATALOGO_JUEGOS.find(function (x) { return x.id === card.getAttribute('data-id'); });
        Sonido.clic();
        document.getElementById('gameDescBox').innerHTML = '<strong>' + j.titulo + '</strong> — ' + j.desc;
        if (!j.disponible) { document.getElementById('confirmarJuegoBtn').disabled = true; juegoSeleccionado = null; return; }
        juegoSeleccionado = j;
        document.getElementById('confirmarJuegoBtn').disabled = false;
        cat.querySelectorAll('.game-card').forEach(function (c) { c.style.borderColor = 'transparent'; });
        card.style.borderColor = 'var(--accent-lima)';
      };
    });
    document.getElementById('confirmarJuegoBtn').onclick = function () { empezarPartida(); };
  };

  var requiereSorteo = false;

  function empezarPartida() {
    Motor.reiniciarRonda();
    Sonido.transicion();
    refs.playIntro.classList.add('show');
    var cont = document.getElementById('playIntroContent');
    var equipos = Motor.getEquipos();
    cont.innerHTML =
      '<div style="font-size:34px;font-weight:900">' + juegoSeleccionado.emoji + ' ' + juegoSeleccionado.titulo + '</div>' +
      '<div style="font-size:16px;color:rgba(255,255,255,.6);margin:10px 0 24px;font-weight:700">Empieza jugando…</div>' +
      '<div id="sorteoRow" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;max-width:600px"></div>' +
      '<div id="sorteoResultado" style="margin-top:22px;font-size:26px;font-weight:900;color:var(--accent-lima);min-height:34px"></div>';
    var row = document.getElementById('sorteoRow');
    row.innerHTML = equipos.map(function (eq) {
      return '<div class="sorteo-chip" style="background:#1f2e38;border:3px solid transparent;border-radius:16px;padding:14px 18px;display:flex;flex-direction:column;align-items:center;gap:4px;transition:transform .12s,border-color .12s;">' +
        '<span class="emoji" style="font-size:26px">' + eq.emoji + '</span><span style="color:#fff;font-size:12px;font-weight:700">' + eq.nombre + '</span></div>';
    }).join('');

    var vueltas = 9 + Math.floor(Math.random() * 3);
    var elegido = Math.floor(Math.random() * equipos.length);
    var intervalo = 70;
    var chips = row.querySelectorAll('.sorteo-chip');

    function paso(n) {
      chips.forEach(function (c) { c.style.borderColor = 'transparent'; c.style.transform = 'scale(1)'; });
      var i = n % chips.length;
      chips[i].style.borderColor = 'var(--accent-cyan)';
      chips[i].style.transform = 'scale(1.1)';
      Sonido.clic();
      if (n < vueltas) {
        intervalo *= 1.12;
        setTimeout(function () { paso(n + 1); }, intervalo);
      } else {
        chips.forEach(function (c) { c.style.borderColor = 'transparent'; c.style.transform = 'scale(1)'; });
        chips[elegido].style.borderColor = 'var(--accent-lima)';
        chips[elegido].style.transform = 'scale(1.15)';
        Motor.activarEquipo(elegido);
        Sonido.avanzar();
        document.getElementById('sorteoResultado').textContent = '¡Empieza ' + equipos[elegido].emoji + ' ' + equipos[elegido].nombre + '!';
        requiereSorteo = true;
        setTimeout(function () {
          refs.playIntro.classList.remove('show');
          Motor.setFase('JUGANDO');
          UI.render();
        }, 1100);
      }
    }
    setTimeout(function () { paso(0); }, 500);
  }

  /* =================== JUGANDO =================== */
  UI.screens.JUGANDO = function () {
    renderTeamsPanel(true);
    var esInicio = requiereSorteo;
    requiereSorteo = false;
    irAPreparacion(esInicio);
  };

  function renderTeamsPanel(animar) {
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
    var cards = refs.teamsPanel.querySelectorAll('.team-card');
    if (animar) {
      cards.forEach(function (c, i) { setTimeout(function () { c.classList.add('appear'); }, i * 80); });
    } else {
      // sin escalonado, pero SIEMPRE visibles: si no, al re-pintar (cambio de
      // turno, puntuación...) las tarjetas nuevas nacían en opacity:0 y no
      // se volvían a mostrar nunca — ese era el bug de "los equipos desaparecen".
      cards.forEach(function (c) { c.classList.add('appear'); });
    }
  }
  Motor.on('puntuacion:cambio', function (d) {
    var el = document.getElementById('score-' + d.equipo.id);
    if (el) { el.textContent = d.equipo.puntos; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  });

  function irAPreparacion(esInicio) {
    Motor.setEstado('PREPARACION');
    mostrarTurno(Motor.getEquipoActivo(), esInicio);
  }
  function mostrarTurno(equipo, esInicio) {
    refs.turnScreen.innerHTML =
      '<div class="label">' + (esInicio ? 'Empieza jugando' : 'Siguiente turno') + '</div>' +
      '<div class="team"><span class="emoji">' + equipo.emoji + '</span>' + equipo.nombre + '</div>' +
      (equipo.portavoz ? '<div class="portavoz-call">Vamos, ' + equipo.portavoz + ' — ¡os toca!</div>' : '') +
      '<button class="big-cta" id="continuarTurnoBtn">Continuar</button>';
    requestAnimationFrame(function () { refs.turnScreen.classList.add('show'); });
    document.getElementById('continuarTurnoBtn').onclick = function () {
      Sonido.avanzar();
      refs.turnScreen.classList.remove('show');
      Motor.setEstado('TURNO');
      renderTeamsPanel(false);
      setTimeout(renderReto, 200);
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

    refs.stageContent.classList.remove('show', 'flash-fail');
    setTimeout(function () {
      if (!pregunta) {
        refs.stageContent.innerHTML = '<div class="muted">No hay más preguntas disponibles en el contenido cargado.</div>';
      } else {
        refs.stageContent.innerHTML = '<h2 style="text-align:center;max-width:640px;font-size:26px">' + pregunta.question + '</h2>';
      }
      renderControles(equipo, pregunta);
      requestAnimationFrame(function () { refs.stageContent.classList.add('show'); });
      if (pregunta) iniciarRetoTimer();
    }, 120);
  }

  function iniciarRetoTimer() {
    refs.timerWrap.classList.remove('warn', 'danger');
    var timerNum = refs.timerWrap.querySelector('.t-num');
    Motor.iniciarTemporizador(30,
      function (restante) {
        timerNum.textContent = restante;
        refs.timerWrap.classList.toggle('warn', restante <= 15 && restante > 5);
        refs.timerWrap.classList.toggle('danger', restante <= 5);
      },
      function () {
        Sonido.tiempoAgotado();
        refs.timeUpBanner.style.display = 'flex';
        refs.timeUpBanner.classList.add('shake');
        refs.timeUpBanner.innerHTML =
          '<div class="catastrofe-emoji">💥</div><div>¡OH NO! SE ACABÓ EL TIEMPO</div><div class="timeup-actions">' +
          '<button class="ctrl-btn ok" id="tuOk">✅ Acierto</button>' +
          '<button class="ctrl-btn fail" id="tuFail">❌ Fallo</button></div>';
        document.getElementById('tuOk').onclick = function () { refs.timeUpBanner.style.display = 'none'; refs.timeUpBanner.classList.remove('shake'); evaluar(true, retoActual, equipoRetoActual, 10); };
        document.getElementById('tuFail').onclick = function () { refs.timeUpBanner.style.display = 'none'; refs.timeUpBanner.classList.remove('shake'); evaluar(false, retoActual, equipoRetoActual, 0); };
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
    document.getElementById('btnGreat').onclick = function () { evaluar(true, pregunta, equipo, 15); };
    document.getElementById('btnPlus').onclick = function () { Sonido.clic(); Motor.sumarPuntos(equipo.id, 5); };
    document.getElementById('btnMinus').onclick = function () { Sonido.clic(); Motor.sumarPuntos(equipo.id, -5); };
    document.getElementById('btnPause').onclick = function () { Sonido.clic(); Motor.pausarTemporizador(); };
    document.getElementById('btnNext').onclick = function () { Sonido.clic(); Motor.detenerTemporizador(); Motor.siguienteEquipo(); };
  }

  function celebrarAcierto() {
    var burst = document.createElement('div');
    burst.className = 'celebra-burst';
    burst.innerHTML = '<div class="big-check">🎉</div>';
    var colores = ['#CFFF04', '#7FE0FF', '#FFD700', '#FF2D55'];
    for (var i = 0; i < 16; i++) {
      var bit = document.createElement('div');
      bit.className = 'confetti-bit';
      var ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 120;
      bit.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      bit.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      bit.style.setProperty('--rot', (Math.random() * 360) + 'deg');
      bit.style.background = colores[i % colores.length];
      burst.appendChild(bit);
    }
    refs.stageContent.appendChild(burst);
    setTimeout(function () { burst.remove(); }, 850);
  }

  function evaluar(acierto, pregunta, equipo, puntos) {
    Motor.detenerTemporizador();
    Motor.setEstado('FEEDBACK');
    if (pregunta) {
      Motor.registrarResultado(equipo.id, pregunta.concept_id, acierto, pregunta.type);
      if (acierto) { Sonido.acierto(); celebrarAcierto(); }
      else { Sonido.fallo(); refs.stageContent.classList.add('flash-fail'); }
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
    Sonido.victoria();
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
      '<button class="stats-toggle-btn" id="statsToggleBtn">📊 ¿Qué tenemos que reforzar?</button>' +
      '<div class="stats-panel" id="statsPanel"><div class="inner">' +
      '<div class="crack">habéis sido unos crack en: ' + nombresDe(resumen.dominados) + '</div>' +
      '<div class="reforzar">recordad reforzar: ' + nombresDe(resumen.reforzar) + '</div>' +
      '</div></div>' +
      '<div style="display:flex;gap:12px;margin-top:6px">' +
      '<button class="big-cta" id="otroJuegoBtn">▶ Elegir otro juego</button>' +
      '<button class="flow-back" id="menuPrincipalBtn">🏠 Menú principal</button>' +
      '</div></div>';

    document.getElementById('statsToggleBtn').onclick = function () {
      Sonido.clic();
      document.getElementById('statsPanel').classList.toggle('open');
    };
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
