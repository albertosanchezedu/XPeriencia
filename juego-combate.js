/* ===================================================================
   EL COMBATE — módulo independiente (v2: opción múltiple + furor)
   =================================================================== */

var Combate = (function () {

  var DURACION_PREGUNTA = 20;
  var DURACION_TOTAL = 180; // 3 minutos, cronómetro global compartido
  var RONDAS_PARA_ROTAR = 2;
  var PREGUNTAS_PARA_SALIR_CASTIGO = 3;
  var RACHA_PARA_FUROR = 3;

  var area;
  var lados = {};
  var enJuego = false;
  var handleTotal = null, restanteTotal = DURACION_TOTAL;

  function init() { area = document.getElementById('combateArea'); }

  /* =================== SORTEO DE BANDOS =================== */
  function iniciar() {
    if (!area) init();
    var equipos = Motor.getEquipos().slice();
    for (var i = equipos.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = equipos[i]; equipos[i] = equipos[j]; equipos[j] = tmp;
    }
    var mitad = Math.ceil(equipos.length / 2);
    var grupoRojo = equipos.slice(0, mitad);
    var grupoAzul = equipos.slice(mitad);
    if (grupoAzul.length === 0) grupoAzul = [grupoRojo.pop()];

    UI.refs.flowScreen.classList.add('hidden');
    UI.refs.gameArea.classList.add('hidden');
    area.classList.remove('hidden');
    area.innerHTML =
      '<div id="combateSorteo"><div class="titulo">⚔️ El combate</div>' +
      '<div class="combate-bandos-preview">' +
      '<div class="combate-bando-col rojo"><div class="bando-nombre">🔴 BANDO ROJO</div><div id="colRojo"></div></div>' +
      '<div class="combate-bando-col azul"><div class="bando-nombre">🔵 BANDO AZUL</div><div id="colAzul"></div></div>' +
      '</div><div id="combateSorteoAccion"></div></div>';

    var colRojo = document.getElementById('colRojo'), colAzul = document.getElementById('colAzul');
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
      document.getElementById('combateSorteoAccion').innerHTML = '<button class="big-cta combate-vamos-btn" id="combateVamosBtn">▶ ¡Empezar combate!</button>';
      document.getElementById('combateVamosBtn').onclick = function () { empezarArena(grupoRojo, grupoAzul); };
    }, 350 + todos.length * 280 + 300);
  }

  /* =================== ARENA =================== */
  function crearEstadoLado(equipos) {
    return { equipos: equipos, activoIdx: 0, streak: 0, rachaFuror: 0, enCastigo: false, castigoProgreso: 0, preguntaActual: null, restante: DURACION_PREGUNTA, handleTimer: null };
  }

  function empezarArena(grupoRojo, grupoAzul) {
    lados.rojo = crearEstadoLado(grupoRojo);
    lados.azul = crearEstadoLado(grupoAzul);
    enJuego = true;
    restanteTotal = DURACION_TOTAL;

    area.innerHTML =
      '<div style="text-align:center;margin-bottom:8px"><span class="overall-timer" id="combateTotalTimer">3:00</span></div>' +
      '<div id="combateArena">' +
      '<div class="combate-lado rojo" id="lado-rojo"></div>' +
      '<div class="combate-lado azul" id="lado-azul"></div>' +
      '</div>';

    clearInterval(handleTotal);
    handleTotal = setInterval(function () {
      restanteTotal--;
      var el = document.getElementById('combateTotalTimer');
      if (el) {
        var m = Math.floor(restanteTotal / 60), s = restanteTotal % 60;
        el.textContent = m + ':' + (s < 10 ? '0' : '') + s;
        el.classList.toggle('danger', restanteTotal <= 20);
      }
      if (restanteTotal <= 0) finalizar();
    }, 1000);

    siguientePregunta('rojo');
    siguientePregunta('azul');
  }

  function equipoActivo(lado) { var l = lados[lado]; return l.equipos[l.activoIdx % l.equipos.length]; }

  function preguntaChoice(equipoId) {
    var contenido = Motor.getContenido();
    if (!contenido) return null;
    var pool = contenido.questions.filter(function (q) { return q.type === 'choice' && q.options && q.options.length >= 3; });
    if (!pool.length) pool = contenido.questions;
    return Motor.seleccionarPorDificultad(pool, Motor.nivelDificultad(equipoId));
  }

  function renderLado(lado) {
    var l = lados[lado];
    var cont = document.getElementById('lado-' + lado);
    if (!cont) return;
    cont.classList.toggle('castigo', l.enCastigo);

    var membrete = l.equipos.map(function (eq, i) {
      return '<span class="combate-miembro' + (i === (l.activoIdx % l.equipos.length) ? ' activo' : '') + '"><span class="emoji">' + eq.emoji + '</span>' + eq.nombre + '</span>';
    }).join('');
    var puntosVisibles = l.equipos[0].puntos;
    var furorBadge = l.rachaFuror >= RACHA_PARA_FUROR ? '<span class="combate-furor">🔥 FUROR x2</span>' : '';

    var opciones = (l.preguntaActual && l.preguntaActual.options) ? l.preguntaActual.options : [];
    var maxOpc = l.enCastigo ? 3 : opciones.length;
    var botonesHtml = opciones.slice(0, maxOpc).map(function (op, i) {
      return '<button class="combate-opcion" data-i="' + i + '">' + op + '</button>';
    }).join('');

    var cuerpoHtml;
    if (l.enCastigo) {
      var pasos = '';
      for (var i = 0; i < PREGUNTAS_PARA_SALIR_CASTIGO; i++) pasos += '<span class="paso' + (i < l.castigoProgreso ? ' hecho' : '') + '"></span>';
      cuerpoHtml =
        '<div class="combate-castigo-badge">🔒 SALA DE CASTIGO — ¡SALID YA!</div>' +
        '<div class="muted">Todo el bando colabora: acertad ' + PREGUNTAS_PARA_SALIR_CASTIGO + ' seguidas para salir.</div>' +
        '<div class="combate-castigo-progreso">' + pasos + '</div>' +
        '<h3>' + (l.preguntaActual ? l.preguntaActual.question : '') + '</h3>' +
        '<div class="combate-opciones">' + botonesHtml + '</div>';
    } else {
      cuerpoHtml =
        furorBadge +
        '<h3>' + (l.preguntaActual ? l.preguntaActual.question : 'Sin más preguntas disponibles') + '</h3>' +
        '<div class="combate-opciones">' + botonesHtml + '</div>';
    }

    cont.innerHTML =
      '<div class="combate-header">' +
      '<div class="combate-miembros">' + membrete + '</div>' +
      '<div class="combate-puntos" id="puntos-' + lado + '">' + puntosVisibles + '</div>' +
      '</div>' +
      '<div class="carta-vf-barra" style="margin:0 16px"><div class="carta-vf-barra-fill" id="barra-' + lado + '"></div></div>' +
      '<div class="combate-cuerpo" id="cuerpo-' + lado + '">' + cuerpoHtml + '</div>';

    cont.querySelectorAll('.combate-opcion').forEach(function (btn) {
      btn.onclick = function () { evaluarLado(lado, parseInt(btn.getAttribute('data-i'), 10)); };
    });
  }

  function siguientePregunta(lado) {
    var l = lados[lado];
    var activo = equipoActivo(lado);
    l.preguntaActual = preguntaChoice(activo.id);
    l.restante = DURACION_PREGUNTA;
    renderLado(lado);
    iniciarTimer(lado);
  }

  function iniciarTimer(lado) {
    var l = lados[lado];
    clearInterval(l.handleTimer);
    var barra = document.getElementById('barra-' + lado);
    if (barra) { barra.style.transition = 'none'; barra.style.width = '100%'; void barra.offsetWidth; barra.style.transition = 'width ' + DURACION_PREGUNTA + 's linear'; barra.style.width = '0%'; }
    l.handleTimer = setInterval(function () {
      l.restante--;
      if (l.restante === 10 || l.restante === 5) Sonido.clic();
      if (l.restante <= 0) { clearInterval(l.handleTimer); Sonido.tiempoAgotado(); evaluarLado(lado, -1); }
    }, 1000);
  }

  function sumarPuntosBando(lado, cantidad) {
    lados[lado].equipos.forEach(function (eq) { Motor.sumarPuntos(eq.id, cantidad); });
    var pEl = document.getElementById('puntos-' + lado);
    if (pEl) { pEl.textContent = lados[lado].equipos[0].puntos; pEl.classList.remove('bump'); void pEl.offsetWidth; pEl.classList.add('bump'); }
  }

  function evaluarLado(lado, indiceElegido) {
    if (!enJuego) return;
    var l = lados[lado];
    clearInterval(l.handleTimer);
    var activo = equipoActivo(lado);
    var p = l.preguntaActual;
    var acierto = p && indiceElegido === p.correct_index;

    if (p) Motor.registrarResultado(activo.id, p.concept_id, acierto, p.type);

    if (l.enCastigo) {
      if (acierto) {
        Sonido.acierto();
        l.castigoProgreso++;
        if (l.castigoProgreso >= PREGUNTAS_PARA_SALIR_CASTIGO) { l.enCastigo = false; l.castigoProgreso = 0; l.streak = 0; sumarPuntosBando(lado, 10); }
      } else {
        Sonido.fallo();
        var cuerpo = document.getElementById('cuerpo-' + lado);
        if (cuerpo) { cuerpo.classList.add('combate-flash-fail'); setTimeout(function () { cuerpo.classList.remove('combate-flash-fail'); }, 400); }
      }
    } else {
      if (acierto) {
        Sonido.acierto();
        l.streak++;
        l.rachaFuror++;
        var puntos = l.rachaFuror >= RACHA_PARA_FUROR ? 20 : 10;
        sumarPuntosBando(lado, puntos);
        if (l.streak >= RONDAS_PARA_ROTAR) { l.streak = 0; l.activoIdx++; }
      } else {
        Sonido.fallo();
        l.streak = 0; l.rachaFuror = 0;
        l.enCastigo = true; l.castigoProgreso = 0;
      }
    }

    setTimeout(function () {
      if (!enJuego) return;
      siguientePregunta(lado);
    }, 650);
  }

  function finalizar() {
    if (!enJuego) return;
    enJuego = false;
    clearInterval(handleTotal);
    Object.keys(lados).forEach(function (lado) { clearInterval(lados[lado].handleTimer); });
    area.classList.add('hidden');
    area.innerHTML = '';
    Motor.setFase('RESULTADOS');
    UI.render();
  }

  return { iniciar: iniciar };
})();
