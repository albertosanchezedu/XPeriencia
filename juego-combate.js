/* ===================================================================
   EL COMBATE — módulo independiente (v5)
   =================================================================== */

var Combate = (function () {

  var DURACION_TOTAL = 180;
  var RONDAS_PARA_ROTAR = 2;
  var RACHA_PARA_FUROR = 3;
  var PUNTOS_ACIERTO = 10;
  var PUNTOS_FALLO = -10;
  var PASO_CUERDA = 0.07; // avance normal por acierto (rango -1..1)

  var area;
  var lados = {};
  var enJuego = false;
  var handleTotal = null, restanteTotal = DURACION_TOTAL, pausado = false;
  var usadasPorEquipo = {};
  var posicionCuerda = 0; // -1 = gana rojo, +1 = gana azul

  var EMOJIS_FONDO = ['📦', '🚚', '🛒', '🏬', '📈', '🏷️', '💻', '⚙️', '🔧', '🚗', '🩺', '🍽️', '✂️', '🎨', '🌾', '🖊️', '🔬', '📐'];
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

  /* =================== SORTEO: mismo estilo que "quién empieza" =================== */
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
    var asignado = {};
    grupoRojo.forEach(function (eq) { asignado[eq.id] = 'rojo'; });
    grupoAzul.forEach(function (eq) { asignado[eq.id] = 'azul'; });

    UI.refs.flowScreen.classList.add('hidden');
    UI.refs.gameArea.classList.add('hidden');
    area.classList.remove('hidden');
    area.innerHTML =
      '<div id="combateSorteo"><div class="titulo">⚔️ El combate</div>' +
      '<div class="muted" style="color:rgba(255,255,255,.7);max-width:540px;margin:-14px 0 22px">Cada equipo de su bando responde <strong>2 preguntas</strong> y luego le toca al siguiente compañero. Es un tira y afloja: cada acierto arrastra al rival hacia vuestro lado. ¡Arrastradlo hasta el final y ganáis al instante!</div>' +
      '<div class="combate-bandos-preview">' +
      '<div class="combate-bando-col rojo"><div class="bando-nombre">🔴 BANDO ROJO</div><div id="colRojo"></div></div>' +
      '<div id="sorteoCentro" class="sorteo-centro"><div id="sorteoCard"><div id="sorteoCardInner"><span class="emoji">🔴</span><span class="name">ROJO</span></div></div></div>' +
      '<div class="combate-bando-col azul"><div class="bando-nombre">🔵 BANDO AZUL</div><div id="colAzul"></div></div>' +
      '</div><div id="combateSorteoAccion"></div></div>';

    var colRojo = document.getElementById('colRojo'), colAzul = document.getElementById('colAzul');
    var inner = document.getElementById('sorteoCardInner');
    var card = document.getElementById('sorteoCard');
    var orden = equipos.slice();

    function sortearUno(idx) {
      if (idx >= orden.length) {
        setTimeout(function () {
          Sonido.avanzar();
          document.getElementById('combateSorteoAccion').innerHTML = '<button class="big-cta combate-vamos-btn" id="combateVamosBtn">▶ ¡Empezar combate!</button>';
          document.getElementById('combateVamosBtn').onclick = function () {
            Sonido.transicion();
            var flash = UI.refs.playIntro;
            var cont = document.getElementById('playIntroContent');
            cont.innerHTML = '<div class="txt">¡A JUGAR!</div><div style="font-size:19px;font-weight:900;color:var(--accent-cyan);margin-top:14px;max-width:600px">Lleva la bola del equipo contrario al centro para ganar</div>';
            flash.classList.add('show');
            setTimeout(function () { flash.classList.remove('show'); empezarArena(grupoRojo, grupoAzul); }, 900);
          };
        }, 250);
        return;
      }
      var eq = orden[idx];
      var destino = asignado[eq.id];
      var vueltas = 9 + Math.floor(Math.random() * 3);
      var intervalo = 35;
      card.className = '';

      function tick(n) {
        inner.classList.add('fading');
        setTimeout(function () {
          var esRojo = n % 2 === 0;
          inner.querySelector('.emoji').textContent = eq.emoji;
          inner.querySelector('.name').textContent = eq.nombre + ' → ' + (esRojo ? '🔴 ROJO' : '🔵 AZUL');
          inner.classList.remove('fading');
          Sonido.clic();
          if (n < vueltas) { intervalo *= 1.16; setTimeout(function () { tick(n + 1); }, intervalo); }
          else {
            inner.querySelector('.name').textContent = eq.nombre + ' → ' + (destino === 'rojo' ? '🔴 ROJO' : '🔵 AZUL');
            card.classList.add('final');
            Sonido.avanzar();
            setTimeout(function () {
              var chip = document.createElement('div');
              chip.className = 'combate-chip';
              chip.innerHTML = '<span class="emoji">' + eq.emoji + '</span>' + eq.nombre;
              (destino === 'rojo' ? colRojo : colAzul).appendChild(chip);
              requestAnimationFrame(function () { chip.classList.add('show'); });
              card.classList.remove('final');
              setTimeout(function () { sortearUno(idx + 1); }, 300);
            }, 500);
          }
        }, 90);
      }
      setTimeout(function () { tick(0); }, 300);
    }
    sortearUno(0);
  }

  function crearEstadoLado(equipos) {
    return { equipos: equipos, activoIdx: 0, streak: 0, rachaFuror: 0, preguntaActual: null, bloqueadoHasta: 0, inventario: [] };
  }

  function empezarArena(grupoRojo, grupoAzul) {
    lados.rojo = crearEstadoLado(grupoRojo);
    lados.azul = crearEstadoLado(grupoAzul);
    enJuego = true;
    Motor.setFase('JUGANDO');
    posicionCuerda = 0;
    restanteTotal = DURACION_TOTAL;
    pausado = false;

    area.innerHTML = pintarFondoCombate() +
      '<div style="text-align:center;margin-bottom:6px;position:relative;z-index:1"><span class="timer-pill" id="combateTotalTimer"><span class="t-icon">⏱️</span><span class="t-num">3:00</span></span></div>' +
      '<div class="cuerda-track" id="cuerdaTrack">' +
      '<div class="cuerda-centro"></div>' +
      '<div class="cuerda-pista-izq" id="pistaRojo"></div><div class="cuerda-pista-der" id="pistaAzul"></div>' +
      '<div class="cuerda-barra" id="cuerdaBarra"><span class="cuerda-bola rojo">🔴</span><div class="cuerda-linea"></div><span class="cuerda-bola azul">🔵</span></div>' +
      '</div>' +
      '<div id="combateArena">' +
      '<div class="combate-lado rojo" id="lado-rojo"></div>' +
      '<div class="combate-divisor"></div>' +
      '<div class="combate-lado azul" id="lado-azul"></div>' +
      '</div>';

    pintarCuerda();

    clearInterval(handleTotal);
    handleTotal = setInterval(function () {
      restanteTotal--;
      pintarTotalCombate();
      if (restanteTotal <= 0) finalizarPorTiempo();
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
        handleTotal = setInterval(function () { restanteTotal--; pintarTotalCombate(); if (restanteTotal <= 0) finalizarPorTiempo(); }, 1000);
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

  /* ---------------- CUERDA: dos bolas + línea, todo el bloque se mueve ---------------- */
  var AMPLITUD_PX = 120;
  function pintarCuerda() {
    var barra = document.getElementById('cuerdaBarra');
    if (!barra) return;
    barra.style.transform = 'translate(calc(-50% + ' + (posicionCuerda * AMPLITUD_PX) + 'px), -50%)';
    var pistaRojo = document.getElementById('pistaRojo'), pistaAzul = document.getElementById('pistaAzul');
    if (pistaRojo) pistaRojo.textContent = 'A ' + Math.max(1, Math.ceil((posicionCuerda + 1) / PASO_CUERDA)) + ' aciertos de ganar';
    if (pistaAzul) pistaAzul.textContent = 'A ' + Math.max(1, Math.ceil((1 - posicionCuerda) / PASO_CUERDA)) + ' aciertos de ganar';
  }

  function moverCuerda(lado, furor) {
    var paso = PASO_CUERDA * (furor ? 2 : 1);
    posicionCuerda += (lado === 'rojo' ? -paso : paso);
    if (posicionCuerda < -1) posicionCuerda = -1;
    if (posicionCuerda > 1) posicionCuerda = 1;
    pintarCuerda();
    if (posicionCuerda <= -1) { finalizarPorCuerda('rojo'); return true; }
    if (posicionCuerda >= 1) { finalizarPorCuerda('azul'); return true; }
    return false;
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

  var NOMBRE_BONUS = {
    bloqueo: '🔒 Bloqueo 5s', apagon: '⚫ Apagón 4s', glitch: '📺 Glitch', locos: '🎲 Botones locos',
    robar: '🧲 Robar un bonus', castigo: '💥 -15 puntos rival'
  };

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

    var inventarioHtml = l.inventario.map(function (tipo, i) {
      return '<button class="combate-bonus-icono" data-i="' + i + '" title="' + NOMBRE_BONUS[tipo] + '">' + NOMBRE_BONUS[tipo].split(' ')[0] + '</button>';
    }).join('');

    cont.innerHTML =
      '<div class="combate-responde">▶ Responde ahora: ' + equipoResponde.emoji + ' ' + equipoResponde.nombre + '</div>' +
      '<div class="combate-header">' +
      '<div class="combate-miembros">' + membrete + '</div>' +
      '<div class="combate-puntos" id="puntos-' + lado + '">' + puntosVisibles + '</div>' +
      '</div>' +
      '<div class="combate-inventario" id="inv-' + lado + '">' + inventarioHtml + '</div>' +
      '<div class="combate-cuerpo">' +
      furorBadge +
      '<h3>' + (l.preguntaActual ? l.preguntaActual.question : 'Sin más preguntas disponibles') + '</h3>' +
      '<div class="combate-opciones-grid">' + botonesHtml + '</div>' +
      '</div>' +
      '<div class="combate-bloqueo-overlay" id="bloqueo-' + lado + '"></div>';

    cont.querySelectorAll('.combate-opcion').forEach(function (btn) {
      btn.onclick = function () { evaluarLado(lado, parseInt(btn.getAttribute('data-i'), 10), btn); };
    });
    cont.querySelectorAll('.combate-bonus-icono').forEach(function (btn) {
      btn.onclick = function () {
        var idx = parseInt(btn.getAttribute('data-i'), 10);
        var tipo = l.inventario[idx];
        if (!tipo) return;
        l.inventario.splice(idx, 1);
        Sonido.avanzar();
        aplicarEfectoSobre(lado, rivalDe(lado), tipo);
        renderLado(lado);
      };
    });
  }

  function rivalDe(lado) { return lado === 'rojo' ? 'azul' : 'rojo'; }

  // Al acertar, en vez de aplicarse solo, el bonus se GUARDA para que el
  // propio equipo decida cuándo usarlo contra el rival.
  function ganarBonusAleatorio(lado) {
    var tipos = Object.keys(NOMBRE_BONUS);
    var tipo = tipos[Math.floor(Math.random() * tipos.length)];
    lados[lado].inventario.push(tipo);
    var cont = document.getElementById('lado-' + lado);
    if (cont) {
      var banner = document.createElement('div');
      banner.className = 'combate-sorpresa-banner';
      banner.textContent = '🎁 ¡Bonus: ' + NOMBRE_BONUS[tipo] + '!';
      cont.appendChild(banner);
      setTimeout(function () { banner.remove(); }, 1000);
    }
  }

  function aplicarEfectoSobre(propio, rival, tipo) {
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
    } else if (tipo === 'robar') {
      if (rl.inventario.length) {
        var robado = rl.inventario.splice(Math.floor(Math.random() * rl.inventario.length), 1)[0];
        lados[propio].inventario.push(robado);
        renderLado(propio);
      }
    } else if (tipo === 'castigo') {
      sumarPuntosBando(rival, -15);
    }
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
    if (Date.now() < l.bloqueadoHasta) return;
    var activo = equipoActivo(lado);
    var p = l.preguntaActual;
    var acierto = p && indiceElegido === p.correct_index;

    if (p) Motor.registrarResultado(activo.id, p.concept_id, acierto, p.type);
    if (btnEl) btnEl.classList.add(acierto ? 'correcta' : 'incorrecta');

    if (acierto) {
      Sonido.acierto();
      l.streak++;
      l.rachaFuror++;
      var enFuror = l.rachaFuror >= RACHA_PARA_FUROR;
      sumarPuntosBando(lado, enFuror ? PUNTOS_ACIERTO * 2 : PUNTOS_ACIERTO);
      if (l.streak >= RONDAS_PARA_ROTAR) { l.streak = 0; l.activoIdx++; }
      if (Math.random() < 0.28) ganarBonusAleatorio(lado);
      if (moverCuerda(lado, enFuror)) return; // alguien ganó por cuerda: partida terminada
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

  function finalizarPorCuerda(ganador) {
    if (!enJuego) return;
    enJuego = false;
    clearInterval(handleTotal);
    Sonido.victoria();
    var banner = document.createElement('div');
    banner.className = 'combate-ganador-banner';
    banner.textContent = (ganador === 'rojo' ? '🔴 BANDO ROJO' : '🔵 BANDO AZUL') + ' ¡ARRASTRA AL RIVAL Y GANA!';
    document.body.appendChild(banner);
    setTimeout(function () {
      banner.remove();
      detener();
      Motor.setFase('RESULTADOS');
      UI.render();
    }, 2200);
  }

  function finalizarPorTiempo() {
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
