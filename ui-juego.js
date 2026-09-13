/* ===================================================================
   UI JUEGO — CONTENIDO_GATE, JUEGOS, JUGANDO (turnos/reto/resultados)
   =================================================================== */

(function () {

  var refs = UI.refs;

  /* =================== CONTENIDO (puerta obligatoria, sin auto-avance) =================== */
  UI.screens.CONTENIDO_GATE = function () {
    if (Motor.hayContenido()) { pintarContenidoConfirmado(); return; }
    pintarContenidoPendiente();
  };

  function pintarContenidoPendiente() {
    refs.flowScreen.innerHTML =
      '<h2>Ey, profe 👋</h2>' +
      '<div class="muted">Antes de nada, sube el contenido.txt de esta unidad para que preparemos las preguntas.</div>' +
      '<button class="big-cta" id="loadContentBtn">📚 Subir contenido.txt</button>' +
      '<button class="help-content-link" id="howToLink">¿No lo tienes generado todavía? Te digo cómo</button>' +
      '<div class="flow-footer"><button class="flow-back" id="backEquiposBtn">◀ Volver</button></div>';
    document.getElementById('backEquiposBtn').onclick = function () { Motor.setFase('EQUIPOS'); UI.render(); };
    document.getElementById('loadContentBtn').onclick = function () { Sonido.clic(); refs.contentFileInput.click(); };
    document.getElementById('howToLink').onclick = function () { Sonido.clic(); abrirAyudaContenido(); };
  }

  var PROMPT_CONTENIDO =
    'Actúa como generador de contenido curricular para una aplicación web educativa multijuego de Formación Profesional.\n\n' +
    'Tu misión es transformar los materiales que te voy a adjuntar (diapositivas, apuntes o documento del tema) en un único archivo de texto con contenido en formato JSON válido en UTF-8, siguiendo esta estructura obligatoria:\n\n' +
    '{"schema_version":"1.0","metadata":{"curso":"","modulo":"","unidad":"","titulo":"","descripcion":"","version":"","idioma":"es"},"concepts":[],"questions":[],"pairs":[],"expression":[],"taboo":[],"infiltrated":[],"answer_is":[],"challenges":[],"recovery":[]}\n\n' +
    'No inventes contenido que no aparezca en los materiales que te adjunto. Trabaja solo con eso.\n\n' +
    'Rellena cada bloque así:\n' +
    '- concepts: id (C001, C002...), term, definition, explanation, keywords, difficulty (1-5), category.\n' +
    '- questions: id (Q001...), concept_id, type (definition/recognition/comparison/application/case/reasoning/example), question, answer, explanation, difficulty. Prioriza preguntas que exijan comprender y aplicar, no solo memorizar.\n' +
    '- pairs: id (P001...), concept_id, term, match, difficulty.\n' +
    '- expression: id (E001...), concept_id, term, modes (draw/mime/explain), difficulty.\n' +
    '- taboo: id (T001...), concept_id, term, forbidden (palabras prohibidas), difficulty.\n' +
    '- infiltrated: id (I001...), category, word, related_words, difficulty.\n' +
    '- answer_is: id (A001...), concept_id, answer, difficulty.\n' +
    '- challenges: id (R001...), type, prompt (situación profesional realista), concept_ids, difficulty.\n' +
    '- recovery: retos breves para repasar conceptos con dificultades.\n\n' +
    'Usa cinco niveles de dificultad (1 muy accesible a 5 avanzado) según la exigencia cognitiva, no la longitud. No generes contenido de relleno: mejor 30 preguntas buenas que 100 repetitivas. Todos los IDs deben ser únicos y todos los concept_id usados deben existir en concepts.\n\n' +
    'Antes de responder, comprueba que el JSON es válido, está en UTF-8 y no le faltan campos.\n\n' +
    'Devuélveme SOLO el contenido final, sin explicaciones, listo para guardar como archivo .txt. Ponle de nombre al archivo el nombre del tema o unidad que te he adjuntado (por ejemplo "tecnicas_almacen_gestion_existencias.txt"), para poder identificarlo fácilmente entre varios.';

  function abrirAyudaContenido() {
    document.getElementById('contentHelpOverlay').classList.add('show');
  }
  document.getElementById('contentHelpCloseBtn').onclick = function () {
    document.getElementById('contentHelpOverlay').classList.remove('show');
  };
  document.getElementById('chpCopyBtn').onclick = function () {
    var btn = document.getElementById('chpCopyBtn');
    function marcarCopiado() {
      Sonido.avanzar();
      btn.textContent = '✔ Copiado';
      btn.classList.add('copied');
      setTimeout(function () { btn.textContent = '📋 Copiar prompt'; btn.classList.remove('copied'); }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(PROMPT_CONTENIDO).then(marcarCopiado).catch(function () {
        window.prompt('Copia manualmente este texto:', PROMPT_CONTENIDO);
      });
    } else {
      window.prompt('Copia manualmente este texto:', PROMPT_CONTENIDO);
    }
  };

  function pintarContenidoConfirmado() {
    var meta = Motor.getContenido().metadata || {};
    var etiqueta = [meta.modulo, meta.unidad].filter(Boolean).join(' · ') || meta.titulo || 'contenido cargado';
    refs.flowScreen.innerHTML =
      '<div class="content-confirm-screen">' +
      '<div class="big-check-icon">✅</div>' +
      '<div class="titulo-cargado">' + etiqueta + '</div>' +
      '<div class="sub-cargado">' + Motor.getContenido().concepts.length + ' conceptos listos para usarse</div>' +
      '<div class="acciones">' +
      '<button class="flow-back" id="cambiarContenidoBtn">🔄 Cambiar contenido</button>' +
      '<button class="big-cta" id="continuarContenidoBtn">▶ Continuar</button>' +
      '</div></div>';
    document.getElementById('cambiarContenidoBtn').onclick = function () { Sonido.clic(); refs.contentFileInput.click(); };
    document.getElementById('continuarContenidoBtn').onclick = function () { Sonido.avanzar(); Motor.setFase('JUEGOS'); UI.render(); };
  }

  refs.contentFileInput.onchange = function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var res = Motor.cargarContenido(reader.result);
      if (!res.ok) { alert('El archivo tiene errores:\n\n' + res.errores.join('\n')); return; }
      Sonido.acierto();
      if (Motor.getFase() === 'CONTENIDO_GATE') pintarContenidoConfirmado();
      else {
        var meta = Motor.getContenido().metadata || {};
        var etiqueta = [meta.modulo, meta.unidad].filter(Boolean).join(' · ') || meta.titulo || 'contenido cargado';
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

  /* =================== SORTEO DEL EQUIPO INICIAL =================== */
  var saltarPantallaTurno = false;

  function empezarPartida() {
    Motor.reiniciarRonda();
    Sonido.transicion();
    var equipos = Motor.getEquipos();
    var cont = document.getElementById('playIntroContent');
    refs.playIntro.classList.add('show');
    cont.innerHTML =
      '<div style="font-size:32px;font-weight:900">' + juegoSeleccionado.emoji + ' ' + juegoSeleccionado.titulo + '</div>' +
      '<div style="font-size:16px;color:rgba(255,255,255,.6);margin:14px 0 34px;font-weight:700">Empieza jugando…</div>' +
      '<div id="sorteoCard"><div id="sorteoCardInner"><span class="emoji">' + equipos[0].emoji + '</span><span class="name">' + equipos[0].nombre + '</span></div></div>' +
      '<div id="sorteoResultado" style="margin-top:34px;min-height:56px"></div>';

    var inner = document.getElementById('sorteoCardInner');
    var card = document.getElementById('sorteoCard');
    var vueltas = 13 + Math.floor(Math.random() * 4);
    var elegido = Math.floor(Math.random() * equipos.length);
    var intervalo = 35;

    function pintar(n) {
      var eq = equipos[n % equipos.length];
      inner.querySelector('.emoji').textContent = eq.emoji;
      inner.querySelector('.name').textContent = eq.nombre;
    }

    function tick(n) {
      inner.classList.add('slide-out');
      setTimeout(function () {
        pintar(n);
        inner.classList.remove('slide-out');
        inner.classList.add('slide-in');
        requestAnimationFrame(function () { inner.classList.remove('slide-in'); });
        Sonido.clic();
        if (n < vueltas) {
          intervalo *= 1.18;
          setTimeout(function () { tick(n + 1); }, intervalo);
        } else {
          pintar(elegido);
          card.classList.add('final');
          Motor.activarEquipo(elegido);
          Sonido.avanzar();
          var elegidoEq = equipos[elegido];
          document.getElementById('sorteoResultado').innerHTML =
            '<div style="font-size:26px;font-weight:900;color:var(--accent-lima);margin-bottom:18px">¡Empieza ' + elegidoEq.emoji + ' ' + elegidoEq.nombre + '!</div>' +
            '<button class="big-cta" id="vamosAllaBtn">▶ ¡Vamos allá!</button>';
          document.getElementById('vamosAllaBtn').onclick = lanzarTransicionFinal;
        }
      }, 100);
    }
    setTimeout(function () { tick(0); }, 400);
  }

  function lanzarTransicionFinal() {
    Sonido.transicion();
    var cont = document.getElementById('playIntroContent');
    cont.innerHTML = '<div class="txt">¡A JUGAR!</div>';
    setTimeout(function () {
      refs.playIntro.classList.remove('show');
      saltarPantallaTurno = true;
      Motor.setFase('JUGANDO');
      UI.render();
    }, 750);
  }

  /* =================== JUGANDO =================== */
  var preguntasEnRacha = 0;

  UI.screens.JUGANDO = function () {
    renderTeamsPanel(true);
    if (saltarPantallaTurno) {
      saltarPantallaTurno = false;
      preguntasEnRacha = 0;
      setTimeout(renderReto, 250);
    } else {
      irAPreparacion(false);
    }
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
    if (animar) cards.forEach(function (c, i) { setTimeout(function () { c.classList.add('appear'); }, i * 80); });
    else cards.forEach(function (c) { c.classList.add('appear'); });
  }
  Motor.on('puntuacion:cambio', function (d) {
    var el = document.getElementById('score-' + d.equipo.id);
    if (el) { el.textContent = d.equipo.puntos; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  });

  function irAPreparacion(esInicio) {
    Motor.setEstado('PREPARACION');
    preguntasEnRacha = 0;
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
    preguntasEnRacha = 0;
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
        refs.stageContent.innerHTML =
          '<div class="muted" style="margin-bottom:8px">' + equipo.emoji + ' ' + equipo.nombre + ' · pregunta ' + (preguntasEnRacha + 1) + ' de 3</div>' +
          '<h2 style="text-align:center;max-width:640px;font-size:26px">' + pregunta.question + '</h2>';
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
    document.getElementById('btnPlus').onclick = function () { Sonido.clic(); volarPuntos(equipo, 5); };
    document.getElementById('btnMinus').onclick = function () { Sonido.clic(); Motor.sumarPuntos(equipo.id, -5); };
    document.getElementById('btnPause').onclick = function () { Sonido.clic(); Motor.pausarTemporizador(); };
    document.getElementById('btnNext').onclick = function () { Sonido.clic(); Motor.detenerTemporizador(); preguntasEnRacha = 0; Motor.siguienteEquipo(); };
  }

  /* ---- Feedback grande de acierto/fallo (mismo peso visual que "tiempo agotado") ---- */
  function mostrarFeedbackGrande(tipo, titulo, emoji, cb) {
    var el = document.getElementById('feedbackBanner');
    el.className = tipo + ' shake';
    el.style.display = 'flex';
    el.innerHTML = '<div class="fb-emoji">' + emoji + '</div><div class="fb-title">' + titulo + '</div>';
    if (tipo === 'ok') {
      var conf = document.createElement('div');
      conf.className = 'confetti-full';
      var colores = ['#CFFF04', '#7FE0FF', '#FFD700', '#FF2D55'];
      for (var i = 0; i < 26; i++) {
        var bit = document.createElement('div');
        bit.className = 'bit';
        bit.style.left = (Math.random() * 100) + '%';
        bit.style.background = colores[i % colores.length];
        bit.style.animationDuration = (0.9 + Math.random() * 0.5) + 's';
        bit.style.animationDelay = (Math.random() * 0.25) + 's';
        conf.appendChild(bit);
      }
      el.appendChild(conf);
    }
    setTimeout(function () {
      el.style.display = 'none';
      el.classList.remove('shake');
      if (cb) cb();
    }, 1000);
  }

  /* ---- Puntos que vuelan físicamente hasta la tarjeta del equipo ---- */
  function volarPuntos(equipo, puntos) {
    if (puntos <= 0) { Motor.sumarPuntos(equipo.id, puntos); return; }
    var scoreEl = document.getElementById('score-' + equipo.id);
    if (!scoreEl) { Motor.sumarPuntos(equipo.id, puntos); return; }
    var destRect = scoreEl.getBoundingClientRect();
    var startRect = refs.stageContent.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'punto-volador';
    el.textContent = '+' + puntos;
    var startX = startRect.left + startRect.width / 2;
    var startY = startRect.top + startRect.height / 2;
    el.style.left = startX + 'px';
    el.style.top = startY + 'px';
    el.style.transform = 'translate(-50%,-50%) scale(1)';
    el.style.opacity = '1';
    document.body.appendChild(el);
    var dx = (destRect.left + destRect.width / 2) - startX;
    var dy = (destRect.top + destRect.height / 2) - startY;
    requestAnimationFrame(function () {
      el.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(.5)';
      el.style.opacity = '0.15';
    });
    setTimeout(function () {
      el.remove();
      Motor.sumarPuntos(equipo.id, puntos);
    }, 700);
  }

  function evaluar(acierto, pregunta, equipo, puntos) {
    Motor.detenerTemporizador();
    Motor.setEstado('FEEDBACK');
    if (pregunta) Motor.registrarResultado(equipo.id, pregunta.concept_id, acierto, pregunta.type);

    if (acierto) {
      Sonido.acierto();
      mostrarFeedbackGrande('ok', '¡GENIAL!', '🎉');
      volarPuntos(equipo, puntos);
      preguntasEnRacha++;
      Motor.incrementarRonda();
      setTimeout(function () {
        if (Motor.objetivoAlcanzado()) { irAResultados(); return; }
        if (preguntasEnRacha < 3) renderReto();
        else Motor.siguienteEquipo();
      }, 1050);
    } else {
      Sonido.fallo();
      mostrarFeedbackGrande('fail', 'RESPUESTA INCORRECTA', '😬');
      preguntasEnRacha = 0;
      Motor.incrementarRonda();
      setTimeout(function () {
        if (Motor.objetivoAlcanzado()) irAResultados();
        else Motor.siguienteEquipo();
      }, 1050);
    }
  }

  /* =================== RESULTADOS / TROFEO =================== */
  function irAResultados() { Motor.detenerTemporizador(); Motor.setFase('RESULTADOS'); UI.render(); }
  UI.actions.finalizar = irAResultados;

  UI.screens.RESULTADOS = function () {
    Sonido.victoria();
    var ranking = Motor.clasificacion();
    refs.flowScreen.innerHTML =
      '<div class="results-box">' +
      '<div class="trophy">🏆</div>' +
      '<h2>¡Enhorabuena, equipo ' + (ranking[0] ? ranking[0].nombre : '') + '!</h2>' +
      '<div class="rank-list">' + ranking.map(function (eq, i) {
        return '<div class="rank-row"><span class="pos">' + (i + 1) + '</span><span class="emoji">' + eq.emoji + '</span><span>' + eq.nombre + '</span><span class="pts">' + eq.puntos + '</span></div>';
      }).join('') + '</div>' +
      '<div style="display:flex;gap:12px;margin-top:6px">' +
      '<button class="big-cta" id="otroJuegoBtn">▶ Elegir otro juego</button>' +
      '<button class="flow-back" id="menuPrincipalBtn">🏠 Menú principal</button>' +
      '</div></div>';

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
