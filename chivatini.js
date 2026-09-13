/* ===================================================================
   CHIVATINI — maestro de ceremonias (v2, fiel al diseño original)
   Modal fijo en esquina, retrato animado y texto que se revela
   letra a letra, igual que en el proyecto original.
   =================================================================== */

var Chivatini = (function () {

  var modal, portrait, textEl, bubble, arrowEl;
  var cola = [];
  var procesando = false;
  var typingHandle = null;
  var hideHandle = null;

  function init() {
    modal = document.getElementById('chivaModal');
    portrait = document.getElementById('chivaPortrait');
    textEl = document.getElementById('chivaTxt');
    bubble = document.getElementById('chivaBubble');
    arrowEl = document.getElementById('chivaArrow');
    bubble.onclick = function () { adelantarOCerrar(); };
  }

  var ICONOS = {
    inicio: '👋', tutorial: '📘', ejemplo: '💡', turno: '▶️',
    tiempo: '⏰', acierto: '✅', error: '❌', especial: '✨',
    recuperacion: '🔧', cambio_turno: '🔁', victoria: '🏆', resultados: '📊'
  };

  function decir(mensaje, tipo, opts) {
    opts = opts || {};
    cola.push({ mensaje: mensaje, tipo: tipo || 'inicio', duracion: opts.duracion || 3800 });
    if (!procesando) procesarCola();
  }

  function procesarCola() {
    if (!cola.length) { procesando = false; ocultar(); return; }
    procesando = true;
    var item = cola.shift();
    mostrar();
    escribir(item.mensaje, item.duracion);
  }

  function mostrar() {
    modal.classList.add('show');
  }
  function ocultar() {
    modal.classList.remove('show');
  }

  var escribiendo = false;
  function escribir(msg, duracionTrasTerminar) {
    clearTimeout(typingHandle); clearTimeout(hideHandle);
    arrowEl.classList.remove('show');
    textEl.innerHTML = '';
    portrait.classList.add('talking');
    escribiendo = true;
    var i = 0;
    function paso() {
      if (i < msg.length) {
        textEl.innerHTML += msg.charAt(i);
        i++;
        typingHandle = setTimeout(paso, 20);
      } else {
        terminarEscritura(duracionTrasTerminar);
      }
    }
    paso();

    function terminarEscritura(duracion) {
      escribiendo = false;
      portrait.classList.remove('talking');
      arrowEl.classList.add('show');
      hideHandle = setTimeout(function () {
        arrowEl.classList.remove('show');
        procesarCola();
      }, duracion);
    }
  }

  function adelantarOCerrar() {
    if (escribiendo) {
      // completar el texto al instante
      clearTimeout(typingHandle);
    } else {
      clearTimeout(hideHandle);
      procesarCola();
    }
  }

  /* ---------- Mensajes contextuales de alto nivel ---------- */
  function nombreEquipo(eq) { return eq.emoji + ' ' + eq.nombre.toUpperCase(); }

  function bienvenida() {
    decir('¡Vamos allá! Aquí gana quien piensa, no quien pulsa más rápido.', 'inicio');
  }
  function anunciarTurno(equipo) {
    decir('Turno de ' + nombreEquipo(equipo) + '. ¡A por ello!', 'turno');
  }
  function avisoTiempo(segundosRestantes) {
    if (segundosRestantes === 10) decir('¡Quedan 10 segundos!', 'tiempo', { duracion: 2000 });
  }
  function tiempoAgotado() {
    decir('Se acabó el tiempo. El docente decide cómo seguimos.', 'tiempo');
  }
  function acierto(equipo, concepto) {
    var extra = concepto ? ' Domináis ' + concepto + '.' : '';
    decir('¡Correcto, ' + nombreEquipo(equipo) + '!' + extra, 'acierto');
  }
  function error(equipo, concepto) {
    var extra = concepto ? ' Repasad ' + concepto + ' con calma.' : '';
    decir('No era eso, ' + nombreEquipo(equipo) + '.' + extra, 'error');
  }
  function cambioTurno(siguiente) {
    decir('Siguiente turno: ' + nombreEquipo(siguiente), 'cambio_turno');
  }
  function recuperacion() {
    decir('Zona de recuperación: es vuestra oportunidad, no un castigo.', 'recuperacion');
  }
  function victoria(equipo) {
    decir(nombreEquipo(equipo) + ' se lleva la victoria. Buen trabajo de todo el grupo.', 'victoria', { duracion: 5000 });
  }
  function felicitar(equipo, motivo) {
    decir(nombreEquipo(equipo) + ', ' + motivo, 'especial');
  }

  return {
    init: init, decir: decir,
    bienvenida: bienvenida, anunciarTurno: anunciarTurno,
    avisoTiempo: avisoTiempo, tiempoAgotado: tiempoAgotado,
    acierto: acierto, error: error, cambioTurno: cambioTurno,
    recuperacion: recuperacion, victoria: victoria, felicitar: felicitar
  };
})();
