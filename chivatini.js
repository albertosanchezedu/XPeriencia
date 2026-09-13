/* ===================================================================
   CHIVATINI — maestro de ceremonias (v6)
   Ya NO interviene en la pantalla inicial, ni en cambios de turno,
   ni en avisos de tiempo (esas cosas las resuelve ya la propia
   interfaz: la pantalla de turno y el propio temporizador).
   Chivatini solo reacciona a lo que pasa DENTRO del juego: acierto,
   error, victoria, zona de recuperación.
   =================================================================== */

var Chivatini = (function () {

  var overlay, modalPortrait, modalTxt, modalArrow, modalBubble;
  var banner, bannerPortrait, bannerTxt;
  var typingHandleModal = null, hideHandleModal = null, escribiendoModal = false, ultimoModal = '';
  var typingHandleBanner = null, hideHandleBanner = null;
  var accionAlCerrarModal = null;

  var TIPOS_MODAL = { victoria: 1, recuperacion: 1 };

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

  var ICONOS = { acierto: '✅', error: '❌', especial: '✨', recuperacion: '🔧', victoria: '🏆' };

  function decir(mensaje, tipo, opts) {
    opts = opts || {};
    tipo = tipo || 'especial';
    if (TIPOS_MODAL[tipo]) mostrarModal(mensaje, tipo, opts.duracion || 3200, opts.onCerrar || null);
    else mostrarBanner(mensaje, tipo, opts.duracion || 2000);
  }

  /* ---------------- MODAL (bloqueante, para victoria/recuperación) ---------------- */
  function mostrarModal(mensaje, tipo, duracion, onCerrar) {
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
    var accion = accionAlCerrarModal; accionAlCerrarModal = null;
    if (accion) accion();
  }
  function adelantarOCerrarModal() {
    if (escribiendoModal) { clearTimeout(typingHandleModal); modalTxt.innerHTML = ultimoModal; finalizarEscritura(modalPortrait, function () { modalArrow.classList.add('show'); }); }
    else cerrarModal();
  }
  function completarYCerrar() {
    clearTimeout(typingHandleModal);
    if (escribiendoModal) { modalTxt.innerHTML = ultimoModal; escribiendoModal = false; modalPortrait.classList.remove('talking'); }
    cerrarModal();
  }

  /* ---------------- AVISO rápido (reacciones de juego, esquina inferior) ---------------- */
  function mostrarBanner(mensaje, tipo, duracion) {
    clearTimeout(typingHandleBanner); clearTimeout(hideHandleBanner);
    bannerPortrait.textContent = ICONOS[tipo] || '👽';
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
    el.innerHTML = ''; ultimoModal = msg;
    if (portraitEl) portraitEl.classList.add('talking');
    escribiendoModal = true;
    var i = 0;
    function paso() { if (i < msg.length) { el.innerHTML += msg.charAt(i); i++; typingHandleModal = setTimeout(paso, 18); } else finalizarEscritura(portraitEl, onDone); }
    paso();
  }
  function finalizarEscritura(portraitEl, onDone) { escribiendoModal = false; if (portraitEl) portraitEl.classList.remove('talking'); if (onDone) onDone(); }

  /* ---------- Mensajes contextuales ---------- */
  function nombreEquipo(eq) { return eq.emoji + ' ' + eq.nombre.toUpperCase(); }
  function acierto(equipo, concepto) { decir('¡Correcto, ' + nombreEquipo(equipo) + '!' + (concepto ? ' Domináis ' + concepto + '.' : ''), 'acierto', { duracion: 1800 }); }
  function error(equipo, concepto) { decir('No era eso, ' + nombreEquipo(equipo) + '.' + (concepto ? ' Repasad ' + concepto + '.' : ''), 'error', { duracion: 1800 }); }
  function recuperacion() { decir('Zona de recuperación: es vuestra oportunidad, no un castigo.', 'recuperacion'); }
  function victoria(equipo) { decir(nombreEquipo(equipo) + ' se lleva la victoria. Buen trabajo de todo el grupo.', 'victoria', { duracion: 3000 }); }
  function felicitar(equipo, motivo) { decir(nombreEquipo(equipo) + ', ' + motivo, 'especial', { duracion: 1800 }); }

  return {
    init: init, decir: decir, completarYCerrar: completarYCerrar,
    acierto: acierto, error: error, recuperacion: recuperacion, victoria: victoria, felicitar: felicitar
  };
})();
