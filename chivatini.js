/* ===================================================================
   CHIVATINI — maestro de ceremonias y director narrativo
   Todo juego debe usar Chivatini.decir(...) en lugar de crear
   sus propios mensajes/tutoriales.
   =================================================================== */

var Chivatini = (function () {

  var el, iconEl, textEl, timeoutHandle;
  var COLA = [];
  var mostrando = false;

  function init() {
    el = document.getElementById('chivatini');
    iconEl = el.querySelector('.cv-icon');
    textEl = el.querySelector('.cv-text');
  }

  // tipo → icono por defecto
  var ICONOS = {
    inicio: '👋', tutorial: '📘', ejemplo: '💡', turno: '▶️',
    tiempo: '⏰', acierto: '✅', error: '❌', especial: '✨',
    recuperacion: '🔧', cambio_turno: '🔁', victoria: '🏆', resultados: '📊'
  };

  function decir(mensaje, tipo, opts) {
    opts = opts || {};
    COLA.push({ mensaje: mensaje, tipo: tipo || 'inicio', duracion: opts.duracion || 4200 });
    if (!mostrando) procesarCola();
  }

  function procesarCola() {
    if (!COLA.length) { mostrando = false; return; }
    mostrando = true;
    var item = COLA.shift();
    iconEl.textContent = ICONOS[item.tipo] || '🤖';
    textEl.innerHTML = item.mensaje;
    el.classList.add('show');
    clearTimeout(timeoutHandle);
    timeoutHandle = setTimeout(function () {
      el.classList.remove('show');
      setTimeout(procesarCola, 350);
    }, item.duracion);
  }

  /* ---------- Mensajes contextuales de alto nivel ---------- */

  function nombreEquipo(eq) { return eq.emoji + ' <b>' + eq.nombre.toUpperCase() + '</b>'; }

  function bienvenida() {
    decir('¡Bienvenidos! Vamos a poner a prueba lo que sabéis. Recordad: gana quien piensa, no quien pulsa rápido.', 'inicio');
  }

  function anunciarTurno(equipo) {
    decir('Ahora juega ' + nombreEquipo(equipo) + '. ¡A por ello!', 'turno');
  }

  function avisoTiempo(segundosRestantes) {
    if (segundosRestantes === 10) decir('⏰ ¡Quedan 10 segundos!', 'tiempo', { duracion: 2200 });
  }

  function tiempoAgotado() {
    decir('Se acabó el tiempo. El docente decide cómo continuar.', 'tiempo');
  }

  function acierto(equipo, concepto) {
    var extra = concepto ? ' Habéis dominado <b>' + concepto + '</b>.' : '';
    decir('¡Correcto, ' + nombreEquipo(equipo) + '!' + extra, 'acierto');
  }

  function error(equipo, concepto) {
    var extra = concepto ? ' Repasad <b>' + concepto + '</b> con calma.' : '';
    decir('No era eso, ' + nombreEquipo(equipo) + '.' + extra, 'error');
  }

  function cambioTurno(siguiente) {
    decir('Siguiente turno: ' + nombreEquipo(siguiente), 'cambio_turno');
  }

  function recuperacion() {
    decir('🔧 Zona de recuperación: es vuestra oportunidad de demostrar que dominas este concepto, no un castigo.', 'recuperacion');
  }

  function victoria(equipo) {
    decir('🏆 ¡' + nombreEquipo(equipo) + ' se lleva la victoria! Buen trabajo de todo el grupo.', 'victoria', { duracion: 5500 });
  }

  function felicitar(equipo, motivo) {
    decir('👏 ' + nombreEquipo(equipo) + ', ' + motivo, 'especial');
  }

  return {
    init: init, decir: decir,
    bienvenida: bienvenida, anunciarTurno: anunciarTurno,
    avisoTiempo: avisoTiempo, tiempoAgotado: tiempoAgotado,
    acierto: acierto, error: error, cambioTurno: cambioTurno,
    recuperacion: recuperacion, victoria: victoria, felicitar: felicitar
  };
})();
