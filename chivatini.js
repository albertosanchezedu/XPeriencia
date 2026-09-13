/* ===================================================================
   CHIVATINI — maestro de ceremonias (v3)
   - MODAL (oscurece la pantalla): momentos importantes que requieren
     atención de todo el grupo (bienvenida, victoria, recuperación...).
   - AVISO (pastilla arriba, no bloquea): comentarios rápidos durante
     el juego (tiempo, acierto, error).
   =================================================================== */

var Chivatini = (function () {

  var overlay, modalPortrait, modalTxt, modalArrow, modalBubble;
  var banner, bannerPortrait, bannerTxt;
  var cola = [];
  var procesando = false;
  var typingHandle = null;
  var hideHandle = null;
  var escribiendo = false;
  var ultimoMensajeModal = '';

  // tipos que se muestran como modal bloqueante (oscurecen el resto)
  var TIPOS_MODAL = { inicio: 1, victoria: 1, recuperacion: 1, resultados: 1 };

  function init() {
    overlay = document.getElementById('chivaOverlay');
    modalPortrait = document.getElementById('chivaPortrait');
    modalTxt = document.getElementById('chivaTxt');
    modalArrow = document.getElementById('chivaArrow');
    modalBubble = document.getElementById('chivaBubble');
    modalBubble.onclick = function () { adelantarOCerrarModal(); };

    banner = document.getElementById('chivaBanner');
    bannerPortrait = banner.querySelector('.b-portrait');
    bannerTxt = banner.querySelector('.b-txt');
  }

  var ICONOS = {
    inicio: '👽', tutorial: '📘', ejemplo: '💡', turno: '▶️',
    tiempo: '⏰', acierto: '✅', error: '❌', especial: '✨',
    recuperacion: '🔧', cambio_turno: '🔁', victoria: '🏆', resultados: '📊'
  };

  function decir(mensaje, tipo, opts) {
    opts = opts || {};
    tipo = tipo || 'inicio';
    var modo = TIPOS_MODAL[tipo] ? 'modal' : 'banner';
    cola.push({ mensaje: mensaje, tipo: tipo, modo: modo, duracion: opts.duracion || 3200 });
    if (!procesando) procesarCola();
  }

  function procesarCola() {
    if (!cola.length) { procesando = false; return; }
    procesando = true;
    var item = cola.shift();
    if (item.modo === 'modal') mostrarModal(item);
    else mostrarBanner(item);
  }

  /* ---------------- MODAL (bloqueante) ---------------- */
  function mostrarModal(item) {
    overlay.classList.add('show');
    modalPortrait.textContent = ICONOS[item.tipo] || '👽';
    escribirEn(modalTxt, item.mensaje, function () {
      modalArrow.classList.add('show');
      hideHandle = setTimeout(function () { cerrarModal(); }, item.duracion + 1200);
    }, modalPortrait);
  }
  function cerrarModal() {
    clearTimeout(hideHandle);
    overlay.classList.remove('show');
    modalArrow.classList.remove('show');
    setTimeout(procesarCola, 200);
  }
  function adelantarOCerrarModal() {
    if (escribiendo) {
      clearTimeout(typingHandle);
      modalTxt.innerHTML = ultimoMensajeModal;
      finalizarEscritura(modalPortrait, function () { modalArrow.classList.add('show'); });
    } else {
      cerrarModal();
    }
  }

  /* ---------------- AVISO (no bloqueante) ---------------- */
  function mostrarBanner(item) {
    bannerPortrait.textContent = ICONOS[item.tipo] || '🤖';
    bannerTxt.textContent = item.mensaje;
    banner.classList.add('show');
    hideHandle = setTimeout(function () {
      banner.classList.remove('show');
      setTimeout(procesarCola, 250);
    }, item.duracion);
  }

  /* ---------------- Efecto de escritura ---------------- */
  function escribirEn(el, msg, onDone, portraitEl) {
    clearTimeout(typingHandle);
    el.innerHTML = '';
    ultimoMensajeModal = msg;
    if (portraitEl) portraitEl.classList.add('talking');
    escribiendo = true;
    var i = 0;
    function paso() {
      if (i < msg.length) {
        el.innerHTML += msg.charAt(i);
        i++;
        typingHandle = setTimeout(paso, 18);
      } else {
        finalizarEscritura(portraitEl, onDone);
      }
    }
    paso();
  }
  function finalizarEscritura(portraitEl, onDone) {
    escribiendo = false;
    if (portraitEl) portraitEl.classList.remove('talking');
    if (onDone) onDone();
  }

  /* ---------- Mensajes contextuales de alto nivel ---------- */
  function nombreEquipo(eq) { return eq.emoji + ' ' + eq.nombre.toUpperCase(); }

  function bienvenida() {
    decir('¡Vamos allá! Aquí gana quien piensa, no quien pulsa más rápido.', 'inicio', { duracion: 3200 });
  }
  function anunciarTurno(equipo) {
    decir('Turno de ' + nombreEquipo(equipo) + '. ¡A por ello!', 'turno', { duracion: 2600 });
  }
  function avisoTiempo(segundosRestantes) {
    if (segundosRestantes === 10) decir('Quedan 10 segundos', 'tiempo', { duracion: 1800 });
  }
  function tiempoAgotado() {
    decir('Se acabó el tiempo', 'tiempo', { duracion: 2200 });
  }
  function acierto(equipo, concepto) {
    var extra = concepto ? ' Domináis ' + concepto + '.' : '';
    decir('¡Correcto, ' + nombreEquipo(equipo) + '!' + extra, 'acierto', { duracion: 2200 });
  }
  function error(equipo, concepto) {
    var extra = concepto ? ' Repasad ' + concepto + '.' : '';
    decir('No era eso, ' + nombreEquipo(equipo) + '.' + extra, 'error', { duracion: 2200 });
  }
  function cambioTurno(siguiente) {
    decir('Siguiente turno: ' + nombreEquipo(siguiente), 'cambio_turno', { duracion: 2000 });
  }
  function recuperacion() {
    decir('Zona de recuperación: es vuestra oportunidad, no un castigo.', 'recuperacion', { duracion: 3200 });
  }
  function victoria(equipo) {
    decir(nombreEquipo(equipo) + ' se lleva la victoria. Buen trabajo de todo el grupo.', 'victoria', { duracion: 3600 });
  }
  function felicitar(equipo, motivo) {
    decir(nombreEquipo(equipo) + ', ' + motivo, 'especial', { duracion: 2200 });
  }

  return {
    init: init, decir: decir,
    bienvenida: bienvenida, anunciarTurno: anunciarTurno,
    avisoTiempo: avisoTiempo, tiempoAgotado: tiempoAgotado,
    acierto: acierto, error: error, cambioTurno: cambioTurno,
    recuperacion: recuperacion, victoria: victoria, felicitar: felicitar
  };
})();
