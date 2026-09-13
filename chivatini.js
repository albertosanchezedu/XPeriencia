/* ===================================================================
   CHIVATINI — maestro de ceremonias (v5)
   Sin colas: un mensaje nuevo siempre sustituye de inmediato al
   anterior. Esto evita la acumulación y los retrasos que se producían
   cuando dos pantallas lanzaban un mensaje casi a la vez.
   =================================================================== */

var Chivatini = (function () {

  var overlay, modalPortrait, modalTxt, modalArrow, modalBubble;
  var banner, bannerPortrait, bannerTxt;
  var typingHandleModal = null, hideHandleModal = null, escribiendoModal = false, ultimoModal = '';
  var typingHandleBanner = null, hideHandleBanner = null;
  var accionAlCerrarModal = null;

  var TIPOS_MODAL = { inicio: 1, victoria: 1, recuperacion: 1, resultados: 1, confirmacion: 1 };

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
    recuperacion: '🔧', cambio_turno: '🔁', victoria: '🏆', resultados: '📊', confirmacion: '👽'
  };

  function decir(mensaje, tipo, opts) {
    opts = opts || {};
    tipo = tipo || 'inicio';
    if (TIPOS_MODAL[tipo]) mostrarModal(mensaje, tipo, opts.duracion || 3200, opts.onCerrar || null);
    else mostrarBanner(mensaje, tipo, opts.duracion || 2200);
  }

  /* ---------------- MODAL (bloqueante, oscurece el resto) ---------------- */
  function mostrarModal(mensaje, tipo, duracion, onCerrar) {
    // si ya había un modal abierto y no dio tiempo a leerlo, lo sustituimos
    // sin ejecutar su acción pendiente (evita acumulación y confirmaciones fantasma)
    clearTimeout(hideHandleModal);
    clearTimeout(typingHandleModal);
    accionAlCerrarModal = onCerrar;
    overlay.classList.add('show');
    modalPortrait.textContent = ICONOS[tipo] || '👽';
    escribirEn(modalTxt, mensaje, function () {
      modalArrow.classList.add('show');
      hideHandleModal = setTimeout(function () { cerrarModal(); }, duracion + 1200);
    }, modalPortrait);
  }
  function cerrarModal() {
    clearTimeout(hideHandleModal);
    overlay.classList.remove('show');
    modalArrow.classList.remove('show');
    var accion = accionAlCerrarModal;
    accionAlCerrarModal = null;
    if (accion) accion();
  }
  function adelantarOCerrarModal() {
    if (escribiendoModal) {
      clearTimeout(typingHandleModal);
      modalTxt.innerHTML = ultimoModal;
      finalizarEscritura(modalPortrait, function () { modalArrow.classList.add('show'); });
    } else {
      cerrarModal();
    }
  }
  // Fuerza el cierre inmediato (para botones de confirmación externos, p.ej. "Vamos")
  function completarYCerrar() {
    clearTimeout(typingHandleModal);
    if (escribiendoModal) { modalTxt.innerHTML = ultimoModal; escribiendoModal = false; modalPortrait.classList.remove('talking'); }
    cerrarModal();
  }

  /* ---------------- AVISO rápido (no bloqueante, se sustituye solo) ---------------- */
  function mostrarBanner(mensaje, tipo, duracion) {
    clearTimeout(typingHandleBanner);
    clearTimeout(hideHandleBanner);
    bannerPortrait.textContent = ICONOS[tipo] || '🤖';
    bannerTxt.innerHTML = '';
    banner.classList.add('show');
    var i = 0;
    (function paso() {
      if (i < mensaje.length) { bannerTxt.innerHTML += mensaje.charAt(i); i++; typingHandleBanner = setTimeout(paso, 12); }
      else { hideHandleBanner = setTimeout(function () { banner.classList.remove('show'); }, duracion); }
    })();
  }

  /* ---------------- Efecto de escritura (modal) ---------------- */
  function escribirEn(el, msg, onDone, portraitEl) {
    el.innerHTML = '';
    ultimoModal = msg;
    if (portraitEl) portraitEl.classList.add('talking');
    escribiendoModal = true;
    var i = 0;
    function paso() {
      if (i < msg.length) { el.innerHTML += msg.charAt(i); i++; typingHandleModal = setTimeout(paso, 18); }
      else finalizarEscritura(portraitEl, onDone);
    }
    paso();
  }
  function finalizarEscritura(portraitEl, onDone) {
    escribiendoModal = false;
    if (portraitEl) portraitEl.classList.remove('talking');
    if (onDone) onDone();
  }

  /* ---------- Mensajes contextuales de alto nivel ---------- */
  function nombreEquipo(eq) { return eq.emoji + ' ' + eq.nombre.toUpperCase(); }

  function bienvenida() { decir('¡Vamos allá! Aquí gana quien piensa, no quien pulsa más rápido.', 'inicio'); }
  function anunciarTurno(equipo) { decir('Turno de ' + nombreEquipo(equipo) + '. ¡A por ello!', 'turno', { duracion: 2400 }); }
  function avisoTiempo(segundosRestantes) { if (segundosRestantes === 10) decir('Quedan 10 segundos', 'tiempo', { duracion: 1600 }); }
  function tiempoAgotado() { decir('Se acabó el tiempo', 'tiempo', { duracion: 2000 }); }
  function acierto(equipo, concepto) { decir('¡Correcto, ' + nombreEquipo(equipo) + '!' + (concepto ? ' Domináis ' + concepto + '.' : ''), 'acierto', { duracion: 2000 }); }
  function error(equipo, concepto) { decir('No era eso, ' + nombreEquipo(equipo) + '.' + (concepto ? ' Repasad ' + concepto + '.' : ''), 'error', { duracion: 2000 }); }
  function cambioTurno(siguiente) { decir('Siguiente turno: ' + nombreEquipo(siguiente), 'cambio_turno', { duracion: 1800 }); }
  function recuperacion() { decir('Zona de recuperación: es vuestra oportunidad, no un castigo.', 'recuperacion'); }
  function victoria(equipo) { decir(nombreEquipo(equipo) + ' se lleva la victoria. Buen trabajo de todo el grupo.', 'victoria', { duracion: 3400 }); }
  function felicitar(equipo, motivo) { decir(nombreEquipo(equipo) + ', ' + motivo, 'especial', { duracion: 2000 }); }
  function confirmar(mensaje, onCerrar) { decir(mensaje, 'confirmacion', { duracion: 1800, onCerrar: onCerrar }); }

  return {
    init: init, decir: decir, completarYCerrar: completarYCerrar,
    bienvenida: bienvenida, anunciarTurno: anunciarTurno,
    avisoTiempo: avisoTiempo, tiempoAgotado: tiempoAgotado,
    acierto: acierto, error: error, cambioTurno: cambioTurno,
    recuperacion: recuperacion, victoria: victoria, felicitar: felicitar, confirmar: confirmar
  };
})();
