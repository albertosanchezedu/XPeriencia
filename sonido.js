/* ===================================================================
   SONIDOS — tonos generados con Web Audio, sin archivos externos.
   =================================================================== */

var Sonido = (function () {
  var ctx = null;
  function getCtx() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { ctx = null; }
    }
    return ctx;
  }

  function tono(freq, duracion, tipo, volInicial, retardo) {
    var c = getCtx();
    if (!c) return;
    retardo = retardo || 0;
    var t0 = c.currentTime + retardo;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = tipo || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(volInicial || 0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duracion);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(t0); osc.stop(t0 + duracion + 0.02);
  }

  function clic() { tono(520, 0.08, 'triangle', 0.08); }
  function avanzar() { tono(400, 0.1, 'sine', 0.1); tono(600, 0.12, 'sine', 0.08, 0.06); }
  function acierto() { tono(660, 0.12, 'sine', 0.12); tono(880, 0.16, 'sine', 0.12, 0.09); tono(1100, 0.2, 'sine', 0.1, 0.18); }
  function fallo() { tono(180, 0.3, 'sawtooth', 0.1); tono(120, 0.35, 'sawtooth', 0.09, 0.08); }
  function tiempoAgotado() { tono(300, 0.15, 'square', 0.09); tono(150, 0.4, 'square', 0.1, 0.12); }
  function victoria() { [660, 880, 1100, 1320].forEach(function (f, i) { tono(f, 0.22, 'sine', 0.1, i * 0.12); }); }

  return { clic: clic, avanzar: avanzar, acierto: acierto, fallo: fallo, tiempoAgotado: tiempoAgotado, victoria: victoria };
})();
