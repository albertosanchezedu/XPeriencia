/* ===================================================================
   EL COMBATE — módulo independiente (v3: simplificado)
   Sin sala de castigo, sin temporizador por pregunta.
   Acierto suma puntos, fallo resta. Cronómetro global de partida.
   =================================================================== */

var Combate = (function () {

  var DURACION_TOTAL = 180;
  var RONDAS_PARA_ROTAR = 2;
  var RACHA_PARA_FUROR = 3;
  var PUNTOS_ACIERTO = 10;
  var PUNTOS_FALLO = -10;

  var area;
  var lados = {};
  var enJuego = false;
  var handleTotal = null, restanteTotal = DURACION_TOTAL;
  var usadasPorEquipo = {};

  function init() { area = document.getElementById('combateArea'); }

  function iniciar() {
    if (!area) init();
    usadasPorEquipo = {};
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

  function crearEstadoLado(equipos) {
    return { equipos: equipos, activoIdx: 0, streak: 0, rachaFuror: 0, preguntaActual: null };
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
      '<div class="combate-divisor"></div>' +
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
    var vistas = usadasPorEquipo[equipoId];
    var libres = vistas ? pool.filter(function (q) { return !vistas.has(q.id); }) : pool;
    if (!libres.length) libres = pool;
    var elegida = Motor.seleccionarPorDificultad(libres, Motor.nivelDificultad(equipoId));
    if (elegida) (usadasPorEquipo[equipoId] = usadasPorEquipo[equipoId] || new Set()).add(elegida.id);
    return elegida;
  }

  function renderLado(lado) {
    var l = lados[lado];
    var cont = document.getElementById('lado-' + lado);
    if (!cont) return;

    var membrete = l.equipos.map(function (eq, i) {
      return '<span class="combate-miembro' + (i === (l.activoIdx % l.equipos.length) ? ' activo' : '') + '"><span class="emoji">' + eq.emoji + '</span>' + eq.nombre + '</span>';
    }).join('');
    var puntosVisibles = l.equipos[0].puntos;
    var furorBadge = l.rachaFuror >= RACHA_PARA_FUROR ? '<span class="combate-furor">🔥 FUROR x2</span>' : '';

    var opciones = (l.preguntaActual && l.preguntaActual.options) ? l.preguntaActual.options : [];
    var letras = ['A', 'B', 'C', 'D'];
    var botonesHtml = opciones.map(function (op, i) {
      return '<button class="combate-opcion" data-i="' + i + '"><span class="combate-opcion-letra">' + letras[i] + '</span>' + op + '</button>';
    }).join('');

    cont.innerHTML =
      '<div class="combate-header">' +
      '<div class="combate-miembros">' + membrete + '</div>' +
      '<div class="combate-puntos" id="puntos-' + lado + '">' + puntosVisibles + '</div>' +
      '</div>' +
      '<div class="combate-cuerpo">' +
      furorBadge +
      '<h3>' + (l.preguntaActual ? l.preguntaActual.question : 'Sin más preguntas disponibles') + '</h3>' +
      '<div class="combate-opciones-grid">' + botonesHtml + '</div>' +
      '</div>';

    cont.querySelectorAll('.combate-opcion').forEach(function (btn) {
      btn.onclick = function () { evaluarLado(lado, parseInt(btn.getAttribute('data-i'), 10), btn); };
    });
  }

  function siguientePregunta(lado) {
    var l = lados[lado];
    var activo = equipoActivo(lado);
    l.preguntaActual = preguntaChoice(activo.id);
    renderLado(lado);
  }

  function sumarPuntosBando(lado, cantidad) {
    lados[lado].equipos.forEach(function (eq) { Motor.sumarPuntos(eq.id, cantidad); });
    var pEl = document.getElementById('puntos-' + lado);
    if (pEl) { pEl.textContent = lados[lado].equipos[0].puntos; pEl.classList.remove('bump'); void pEl.offsetWidth; pEl.classList.add('bump'); }
  }

  function evaluarLado(lado, indiceElegido, btnEl) {
    if (!enJuego) return;
    var l = lados[lado];
    var activo = equipoActivo(lado);
    var p = l.preguntaActual;
    var acierto = p && indiceElegido === p.correct_index;

    if (p) Motor.registrarResultado(activo.id, p.concept_id, acierto, p.type);
    if (btnEl) btnEl.classList.add(acierto ? 'correcta' : 'incorrecta');

    if (acierto) {
      Sonido.acierto();
      l.streak++;
      l.rachaFuror++;
      var puntos = l.rachaFuror >= RACHA_PARA_FUROR ? PUNTOS_ACIERTO * 2 : PUNTOS_ACIERTO;
      sumarPuntosBando(lado, puntos);
      if (l.streak >= RONDAS_PARA_ROTAR) { l.streak = 0; l.activoIdx++; }
    } else {
      Sonido.fallo();
      l.streak = 0; l.rachaFuror = 0;
      sumarPuntosBando(lado, PUNTOS_FALLO);
      l.activoIdx++;
    }

    setTimeout(function () {
      if (!enJuego) return;
      siguientePregunta(lado);
    }, 550);
  }

  function finalizar() {
    if (!enJuego) return;
    enJuego = false;
    clearInterval(handleTotal);
    area.classList.add('hidden');
    area.innerHTML = '';
    Motor.setFase('RESULTADOS');
    UI.render();
  }

  return { iniciar: iniciar };
})();
