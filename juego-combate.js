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
  var handleTotal = null, restanteTotal = DURACION_TOTAL, pausado = false;
  var usadasPorEquipo = {};

  var EMOJIS_FONDO = ['📦','🚚','🛒','🏬','📈','🏷️','💻','⚙️','🔧','🚗','🩺','🍽️','✂️','🎨','🌾','🖊️','🔬','📐'];
  function pintarFondoCombate() {
    var html = '';
    for (var i = 0; i < 12; i++) {
      var e = EMOJIS_FONDO[i % EMOJIS_FONDO.length];
      var left = Math.random() * 96, delay = Math.random() * 20, dur = 18 + Math.random() * 12, size = 26 + Math.random() * 26;
      html += '<span class="bg-float-emoji" style="left:' + left + '%;bottom:-60px;font-size:' + size + 'px;animation-duration:' + dur + 's;animation-delay:-' + delay + 's;">' + e + '</span>';
    }
    return '<div class="combate-bg-emojis">' + html + '</div>';
  }

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
      '<div class="muted" style="color:rgba(255,255,255,.7);max-width:520px;margin:-14px 0 22px">Cada equipo de su bando responde <strong>2 preguntas</strong> y luego le toca al siguiente compañero del mismo bando. Arriba de cada lado verás quién responde ahora.</div>' +
      '<div class="combate-bandos-preview">' +
      '<div class="combate-bando-col rojo"><div class="bando-nombre">🔴 BANDO ROJO</div><div id="colRojo"></div></div>' +
      '<div id="sorteoCentro" class="sorteo-centro"></div>' +
      '<div class="combate-bando-col azul"><div class="bando-nombre">🔵 BANDO AZUL</div><div id="colAzul"></div></div>' +
      '</div><div id="combateSorteoAccion"></div></div>';

    var colRojo = document.getElementById('colRojo'), colAzul = document.getElementById('colAzul');
    var centro = document.getElementById('sorteoCentro');
    var intercalados = [];
    var maxLen = Math.max(grupoRojo.length, grupoAzul.length);
    for (var k = 0; k < maxLen; k++) {
      if (grupoRojo[k]) intercalados.push({ eq: grupoRojo[k], col: colRojo });
      if (grupoAzul[k]) intercalados.push({ eq: grupoAzul[k], col: colAzul });
    }

    function mostrarUno(idx) {
      if (idx >= intercalados.length) {
        setTimeout(function () {
          Sonido.avanzar();
          document.getElementById('combateSorteoAccion').innerHTML = '<button class="big-cta combate-vamos-btn" id="combateVamosBtn">▶ ¡Empezar combate!</button>';
          document.getElementById('combateVamosBtn').onclick = function () {
            Sonido.transicion();
            var flash = UI.refs.playIntro;
            var cont = document.getElementById('playIntroContent');
            cont.innerHTML = '<div class="txt">¡A JUGAR!</div>';
            flash.classList.add('show');
            setTimeout(function () { flash.classList.remove('show'); empezarArena(grupoRojo, grupoAzul); }, 750);
          };
        }, 200);
        return;
      }
      var item = intercalados[idx];
      Sonido.clic();
      centro.innerHTML = '<div class="combate-chip centro">' + item.eq.emoji + ' ' + item.eq.nombre + '</div>';
      requestAnimationFrame(function () { centro.querySelector('.combate-chip').classList.add('show'); });
      setTimeout(function () {
        centro.innerHTML = '';
        var chip = document.createElement('div');
        chip.className = 'combate-chip';
        chip.innerHTML = '<span class="emoji">' + item.eq.emoji + '</span>' + item.eq.nombre;
        item.col.appendChild(chip);
        requestAnimationFrame(function () { chip.classList.add('show'); });
        setTimeout(function () { mostrarUno(idx + 1); }, 260);
      }, 480);
    }
    setTimeout(function () { mostrarUno(0); }, 400);
  }

  function crearEstadoLado(equipos) {
    return { equipos: equipos, activoIdx: 0, streak: 0, rachaFuror: 0, preguntaActual: null, poderDisponible: false, bloqueadoHasta: 0 };
  }

  function empezarArena(grupoRojo, grupoAzul) {
    lados.rojo = crearEstadoLado(grupoRojo);
    lados.azul = crearEstadoLado(grupoAzul);
    enJuego = true;
    Motor.setFase('JUGANDO');
    restanteTotal = DURACION_TOTAL;
    pausado = false;

    area.innerHTML = pintarFondoCombate() +
      '<div style="text-align:center;margin-bottom:8px;position:relative;z-index:1"><span class="timer-pill" id="combateTotalTimer"><span class="t-icon">⏱️</span><span class="t-num">3:00</span></span></div>' +
      '<div id="combateArena">' +
      '<div class="combate-lado rojo" id="lado-rojo"></div>' +
      '<div class="combate-divisor"></div>' +
      '<div class="combate-lado azul" id="lado-azul"></div>' +
      '</div>';

    clearInterval(handleTotal);
    handleTotal = setInterval(function () {
      restanteTotal--;
      pintarTotalCombate();
      if (restanteTotal <= 0) finalizar();
    }, 1000);
    pintarTotalCombate();

    document.getElementById('combateTotalTimer').onclick = function () {
      Sonido.clic();
      pausado = !pausado;
      var el = document.getElementById('combateTotalTimer');
      area.classList.toggle('pausado', pausado);
      if (pausado) { clearInterval(handleTotal); el.classList.add('pausado'); }
      else {
        el.classList.remove('pausado');
        handleTotal = setInterval(function () { restanteTotal--; pintarTotalCombate(); if (restanteTotal <= 0) finalizar(); }, 1000);
      }
    };

    siguientePregunta('rojo');
    siguientePregunta('azul');
  }

  function pintarTotalCombate() {
    var el = document.getElementById('combateTotalTimer');
    if (!el) return;
    var m = Math.floor(restanteTotal / 60), s = restanteTotal % 60;
    el.querySelector('.t-num').textContent = m + ':' + (s < 10 ? '0' : '') + s;
    el.classList.toggle('danger', restanteTotal <= 20);
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
    if (!elegida) return null;
    (usadasPorEquipo[equipoId] = usadasPorEquipo[equipoId] || new Set()).add(elegida.id);
    return barajarOpciones(elegida);
  }

  // Evita que la respuesta correcta caiga siempre en la misma posición:
  // devuelve una COPIA de la pregunta con las opciones barajadas y el
  // índice correcto recalculado, sin tocar el original.
  function barajarOpciones(pregunta) {
    var indices = pregunta.options.map(function (_, i) { return i; });
    for (var i = indices.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
    }
    var nuevasOpciones = indices.map(function (i) { return pregunta.options[i]; });
    var nuevoCorrectIndex = indices.indexOf(pregunta.correct_index);
    var copia = {};
    for (var k in pregunta) copia[k] = pregunta[k];
    copia.options = nuevasOpciones;
    copia.correct_index = nuevoCorrectIndex;
    return copia;
  }

  function renderLado(lado) {
    var l = lados[lado];
    var cont = document.getElementById('lado-' + lado);
    if (!cont) return;

    var membrete = l.equipos.map(function (eq, i) {
      return '<span class="combate-miembro' + (i === (l.activoIdx % l.equipos.length) ? ' activo' : '') + '"><span class="emoji">' + eq.emoji + '</span>' + eq.nombre + '</span>';
    }).join('');
    var equipoResponde = equipoActivo(lado);
    var puntosVisibles = l.equipos[0].puntos;
    var furorBadge = l.rachaFuror >= RACHA_PARA_FUROR ? '<span class="combate-furor">🔥 FUROR x2</span>' : '';

    var opciones = (l.preguntaActual && l.preguntaActual.options) ? l.preguntaActual.options : [];
    var letras = ['A', 'B', 'C', 'D'];
    var botonesHtml = opciones.map(function (op, i) {
      return '<button class="combate-opcion" data-i="' + i + '"><span class="combate-opcion-letra">' + letras[i] + '</span>' + op + '</button>';
    }).join('');

    var poderesHtml = '';
    if (l.poderDisponible) {
      poderesHtml =
        '<div class="combate-poderes">' +
        '<div class="combate-poderes-label">🔥 ¡Usa un poder contra el rival!</div>' +
        '<button class="combate-poder-btn" data-poder="bloqueo">🔒 Bloquear 5s</button>' +
        '<button class="combate-poder-btn" data-poder="apagon">⚫ Apagón 4s</button>' +
        '<button class="combate-poder-btn" data-poder="cambiar">🔀 Cambiar su pregunta</button>' +
        '</div>';
    }

    cont.innerHTML =
      '<div class="combate-responde">▶ Responde ahora: ' + equipoResponde.emoji + ' ' + equipoResponde.nombre + '</div>' +
      '<div class="combate-header">' +
      '<div class="combate-miembros">' + membrete + '</div>' +
      '<div class="combate-puntos" id="puntos-' + lado + '">' + puntosVisibles + '</div>' +
      '</div>' +
      '<div class="combate-cuerpo">' +
      furorBadge +
      '<h3>' + (l.preguntaActual ? l.preguntaActual.question : 'Sin más preguntas disponibles') + '</h3>' +
      '<div class="combate-opciones-grid">' + botonesHtml + '</div>' +
      '</div>' +
      poderesHtml +
      '<div class="combate-bloqueo-overlay" id="bloqueo-' + lado + '"></div>';

    cont.querySelectorAll('.combate-opcion').forEach(function (btn) {
      btn.onclick = function () { evaluarLado(lado, parseInt(btn.getAttribute('data-i'), 10), btn); };
    });
    cont.querySelectorAll('.combate-poder-btn').forEach(function (btn) {
      btn.onclick = function () { usarPoder(lado, btn.getAttribute('data-poder')); };
    });
  }

  function rivalDe(lado) { return lado === 'rojo' ? 'azul' : 'rojo'; }

  function activarCajaSorpresa(lado) {
    var rival = rivalDe(lado);
    var cont = document.getElementById('lado-' + lado);
    if (cont) {
      var banner = document.createElement('div');
      banner.className = 'combate-sorpresa-banner';
      banner.textContent = '🎁 ¡CAJA SORPRESA!';
      cont.appendChild(banner);
      setTimeout(function () { banner.remove(); }, 900);
    }
    var efectos = ['bloqueo', 'apagon', 'glitch', 'locos'];
    var tipo = efectos[Math.floor(Math.random() * efectos.length)];
    setTimeout(function () { aplicarEfectoSobre(rival, tipo); }, 650);
  }

  function aplicarEfectoSobre(rival, tipo) {
    if (!enJuego) return;
    var rl = lados[rival];
    var overlay = document.getElementById('bloqueo-' + rival);
    if (tipo === 'bloqueo' || tipo === 'apagon') {
      var dur = tipo === 'bloqueo' ? 5000 : 4000;
      rl.bloqueadoHasta = Date.now() + dur;
      if (overlay) {
        overlay.className = 'combate-bloqueo-overlay activo' + (tipo === 'apagon' ? ' apagon' : '');
        overlay.textContent = tipo === 'apagon' ? '⚫ ¡Apagón!' : '🔒 ¡Bloqueado!';
      }
      setTimeout(function () { if (overlay) overlay.className = 'combate-bloqueo-overlay'; rl.bloqueadoHasta = 0; }, dur);
    } else if (tipo === 'glitch') {
      var cont = document.getElementById('lado-' + rival);
      if (cont) { cont.classList.add('glitch'); setTimeout(function () { cont.classList.remove('glitch'); }, 3000); }
    } else if (tipo === 'locos') {
      var grid = document.querySelector('#lado-' + rival + ' .combate-opciones-grid');
      if (!grid) return;
      var vueltas = 0;
      var iv = setInterval(function () {
        var hijos = Array.prototype.slice.call(grid.children);
        for (var i = hijos.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); grid.insertBefore(hijos[i], hijos[j]); }
        vueltas++;
        if (vueltas >= 6) clearInterval(iv);
      }, 550);
    }
  }

  function usarPoder(lado, tipo) {
    var l = lados[lado];
    if (!l.poderDisponible) return;
    l.poderDisponible = false;
    l.rachaFuror = 0;
    Sonido.avanzar();
    var rival = rivalDe(lado);
    var rl = lados[rival];
    var overlay = document.getElementById('bloqueo-' + rival);

    if (tipo === 'cambiar') {
      siguientePregunta(rival);
      renderLado(lado);
      return;
    }
    var duracion = tipo === 'bloqueo' ? 5000 : 4000;
    rl.bloqueadoHasta = Date.now() + duracion;
    if (overlay) {
      overlay.className = 'combate-bloqueo-overlay activo' + (tipo === 'apagon' ? ' apagon' : '');
      overlay.textContent = tipo === 'apagon' ? '⚫ ¡Apagón!' : '🔒 ¡Bloqueado!';
    }
    setTimeout(function () {
      if (overlay) overlay.className = 'combate-bloqueo-overlay';
      rl.bloqueadoHasta = 0;
    }, duracion);
    renderLado(lado);
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
    if (!enJuego || pausado) return;
    var l = lados[lado];
    if (Date.now() < l.bloqueadoHasta) return; // bloqueado por el rival, no puede responder
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
      if (l.rachaFuror >= RACHA_PARA_FUROR) l.poderDisponible = true;
      if (l.streak >= RONDAS_PARA_ROTAR) { l.streak = 0; l.activoIdx++; }
      if (Math.random() < 0.22) activarCajaSorpresa(lado);
    } else {
      Sonido.fallo();
      l.streak = 0; l.rachaFuror = 0; l.poderDisponible = false;
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
    detener();
    Motor.setFase('RESULTADOS');
    UI.render();
  }

  function detener() {
    enJuego = false;
    clearInterval(handleTotal);
    if (area) { area.classList.add('hidden'); area.innerHTML = ''; }
  }

  return { iniciar: iniciar, detener: detener, estaActivo: function () { return enJuego; } };
})();
