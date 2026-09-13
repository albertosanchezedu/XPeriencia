/* ===================================================================
   EL COMBATE — módulo de juego independiente.
   No modifica motor.js, chivatini.js, sonido.js, ui-core.js,
   ui-equipos.js ni ui-juego.js: solo LOS USA (API pública).
   =================================================================== */

var Combate = (function () {

  var DURACION_PREGUNTA = 20;      // segundos por pregunta, algo más ágil que Reto rápido
  var RONDAS_PARA_ROTAR = 2;       // aciertos seguidos antes de pasar el turno al compañero
  var PREGUNTAS_PARA_SALIR_CASTIGO = 3;

  var area, arena, sorteoEl;
  var lados = {}; // { rojo: {...estado}, azul: {...estado} }
  var enJuego = false;

  function init() {
    area = document.getElementById('combateArea');
  }

  /* =================== SORTEO DE BANDOS =================== */
  function iniciar() {
    if (!area) init();
    var equipos = Motor.getEquipos().slice();
    // barajado simple
    for (var i = equipos.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = equipos[i]; equipos[i] = equipos[j]; equipos[j] = tmp;
    }
    var mitad = Math.ceil(equipos.length / 2);
    var grupoRojo = equipos.slice(0, mitad);
    var grupoAzul = equipos.slice(mitad);
    if (grupoAzul.length === 0) { grupoAzul = [grupoRojo.pop()]; } // por si solo hay 1 equipo total (caso límite)

    Motor.reiniciarRonda();

    UI.refs.flowScreen.classList.add('hidden');
    UI.refs.gameArea.classList.add('hidden');
    area.classList.remove('hidden');
    area.innerHTML =
      '<div id="combateSorteo">' +
      '<div class="titulo">⚔️ El combate</div>' +
      '<div class="combate-bandos-preview">' +
      '<div class="combate-bando-col rojo"><div class="bando-nombre">🔴 BANDO ROJO</div><div id="colRojo"></div></div>' +
      '<div class="combate-bando-col azul"><div class="bando-nombre">🔵 BANDO AZUL</div><div id="colAzul"></div></div>' +
      '</div>' +
      '<div id="combateSorteoAccion"></div>' +
      '</div>';

    var colRojo = document.getElementById('colRojo');
    var colAzul = document.getElementById('colAzul');
    var todos = [];
    grupoRojo.forEach(function (eq) { todos.push({ eq: eq, col: colRojo }); });
    grupoAzul.forEach(function (eq) { todos.push({ eq: eq, col: colAzul }); });

    todos.forEach(function (item, i) {
      setTimeout(function () {
        Sonido.clic();
        var chip = document.createElement('div');
        chip.className = 'combate-chip';
        chip.innerHTML = '<span class="emoji">' + item.eq.emoji + '</span>' + item.eq.nombre;
        item.col.appendChild(chip);
        requestAnimationFrame(function () { chip.classList.add('show'); });
      }, 350 + i * 280);
    });

    setTimeout(function () {
      Sonido.avanzar();
      document.getElementById('combateSorteoAccion').innerHTML =
        '<button class="big-cta combate-vamos-btn" id="combateVamosBtn">▶ ¡Empezar combate!</button>';
      document.getElementById('combateVamosBtn').onclick = function () {
        empezarArena(grupoRojo, grupoAzul);
      };
    }, 350 + todos.length * 280 + 300);
  }

  /* =================== ARENA (PANTALLA DIVIDIDA) =================== */
  function crearEstadoLado(equipos, color) {
    return {
      color: color, equipos: equipos, activoIdx: 0,
      streak: 0, enCastigo: false, castigoProgreso: 0,
      preguntaActual: null, restante: DURACION_PREGUNTA, handleTimer: null
    };
  }

  function empezarArena(grupoRojo, grupoAzul) {
    lados.rojo = crearEstadoLado(grupoRojo, 'rojo');
    lados.azul = crearEstadoLado(grupoAzul, 'azul');
    enJuego = true;

    area.innerHTML =
      '<div id="combateArena">' +
      '<div class="combate-lado rojo" id="lado-rojo"></div>' +
      '<div class="combate-lado azul" id="lado-azul"></div>' +
      '</div>';

    siguientePregunta('rojo');
    siguientePregunta('azul');
  }

  function equipoActivo(lado) {
    var l = lados[lado];
    return l.equipos[l.activoIdx % l.equipos.length];
  }

  function renderLado(lado) {
    var l = lados[lado];
    var cont = document.getElementById('lado-' + lado);
    if (!cont) return;
    cont.classList.toggle('castigo', l.enCastigo);

    var membrete = l.equipos.map(function (eq, i) {
      return '<span class="combate-miembro' + (i === (l.activoIdx % l.equipos.length) ? ' activo' : '') + '"><span class="emoji">' + eq.emoji + '</span>' + eq.nombre + '</span>';
    }).join('');

    var puntosVisibles = l.equipos[0].puntos; // todos los del bando comparten el mismo valor

    var cuerpoHtml;
    if (l.enCastigo) {
      var pasos = '';
      for (var i = 0; i < PREGUNTAS_PARA_SALIR_CASTIGO; i++) pasos += '<span class="paso' + (i < l.castigoProgreso ? ' hecho' : '') + '"></span>';
      cuerpoHtml =
        '<div class="combate-castigo-badge">🔒 SALA DE CASTIGO</div>' +
        '<div class="muted">Todo el bando colabora para salir: acertad ' + PREGUNTAS_PARA_SALIR_CASTIGO + ' preguntas seguidas.</div>' +
        '<div class="combate-castigo-progreso">' + pasos + '</div>' +
        '<h3>' + (l.preguntaActual ? l.preguntaActual.question : '') + '</h3>';
    } else {
      cuerpoHtml = '<h3>' + (l.preguntaActual ? l.preguntaActual.question : 'Sin más preguntas disponibles') + '</h3>';
    }

    cont.innerHTML =
      '<div class="combate-header">' +
      '<div class="combate-miembros">' + membrete + '</div>' +
      '<div class="combate-timer" id="timer-' + lado + '">' + l.restante + '</div>' +
      '<div class="combate-puntos" id="puntos-' + lado + '">' + puntosVisibles + '</div>' +
      '</div>' +
      '<div class="combate-cuerpo" id="cuerpo-' + lado + '">' + cuerpoHtml + '</div>' +
      '<div class="combate-controles">' +
      '<button class="ok" id="ok-' + lado + '">✅ Acierto</button>' +
      '<button class="fail" id="fail-' + lado + '">❌ Fallo</button>' +
      '</div>';

    document.getElementById('ok-' + lado).onclick = function () { evaluarLado(lado, true); };
    document.getElementById('fail-' + lado).onclick = function () { evaluarLado(lado, false); };
  }

  function siguientePregunta(lado) {
    var l = lados[lado];
    var activo = equipoActivo(lado);
    l.preguntaActual = Motor.preguntaParaEquipo(activo.id);
    l.restante = DURACION_PREGUNTA;
    renderLado(lado);
    iniciarTimer(lado);
  }

  function iniciarTimer(lado) {
    var l = lados[lado];
    clearInterval(l.handleTimer);
    var timerEl = document.getElementById('timer-' + lado);
    l.handleTimer = setInterval(function () {
      l.restante--;
      var el = document.getElementById('timer-' + lado);
      if (el) {
        el.textContent = l.restante;
        el.classList.toggle('warn', l.restante <= 10 && l.restante > 4);
        el.classList.toggle('danger', l.restante <= 4);
      }
      if (l.restante <= 0) {
        clearInterval(l.handleTimer);
        Sonido.tiempoAgotado();
        evaluarLado(lado, false);
      }
    }, 1000);
  }

  function sumarPuntosBando(lado, cantidad) {
    lados[lado].equipos.forEach(function (eq) { Motor.sumarPuntos(eq.id, cantidad); });
    var pEl = document.getElementById('puntos-' + lado);
    if (pEl) {
      pEl.textContent = lados[lado].equipos[0].puntos;
      pEl.classList.remove('bump'); void pEl.offsetWidth; pEl.classList.add('bump');
    }
  }

  function evaluarLado(lado, acierto) {
    if (!enJuego) return;
    var l = lados[lado];
    clearInterval(l.handleTimer);
    var activo = equipoActivo(lado);

    if (l.preguntaActual) Motor.registrarResultado(activo.id, l.preguntaActual.concept_id, acierto, l.preguntaActual.type);

    if (l.enCastigo) {
      if (acierto) {
        Sonido.acierto();
        l.castigoProgreso++;
        if (l.castigoProgreso >= PREGUNTAS_PARA_SALIR_CASTIGO) {
          l.enCastigo = false; l.castigoProgreso = 0; l.streak = 0;
          sumarPuntosBando(lado, 10);
        }
      } else {
        Sonido.fallo();
        var cuerpo = document.getElementById('cuerpo-' + lado);
        if (cuerpo) { cuerpo.classList.add('combate-flash-fail'); setTimeout(function () { cuerpo.classList.remove('combate-flash-fail'); }, 400); }
        // un fallo en castigo no penaliza más: simplemente no suma progreso
      }
    } else {
      if (acierto) {
        Sonido.acierto();
        sumarPuntosBando(lado, 10);
        l.streak++;
        if (l.streak >= RONDAS_PARA_ROTAR) { l.streak = 0; l.activoIdx++; }
      } else {
        Sonido.fallo();
        l.streak = 0;
        l.enCastigo = true;
        l.castigoProgreso = 0;
      }
    }

    Motor.incrementarRonda();

    setTimeout(function () {
      if (Motor.objetivoAlcanzado()) { finalizar(); return; }
      siguientePregunta(lado);
    }, 700);
  }

  function finalizar() {
    if (!enJuego) return;
    enJuego = false;
    Object.keys(lados).forEach(function (lado) { clearInterval(lados[lado].handleTimer); });
    area.classList.add('hidden');
    area.innerHTML = '';
    Motor.setFase('RESULTADOS');
    UI.render();
  }

  return { iniciar: iniciar };
})();
