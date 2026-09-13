/* ===================================================================
   UI EQUIPOS — pantallas MODO y EQUIPOS
   =================================================================== */

(function () {

  var refs = UI.refs;

  /* =================== MODO =================== */
  UI.screens.MODO = function () {
    refs.flowScreen.innerHTML =
      '<h2>¿Cómo jugáis hoy?</h2>' +
      '<div class="muted">Elige el formato de la sesión</div>' +
      '<div class="mode-grid">' +
      '<div class="mode-card" data-modo="libre"><div class="m-emoji emoji">🎯</div><div class="m-title">Modo libre</div><div class="m-desc">Jugáis lo que queráis y finalizáis cuando decidáis.</div></div>' +
      '<div class="mode-card" data-modo="mejor3"><div class="m-emoji emoji">🥉</div><div class="m-title">Torneo · mejor de 3</div><div class="m-desc">3 rondas y gana quien sume más puntos.</div></div>' +
      '<div class="mode-card" data-modo="mejor5"><div class="m-emoji emoji">🥇</div><div class="m-title">Torneo · mejor de 5</div><div class="m-desc">5 rondas y gana quien sume más puntos.</div></div>' +
      '</div>';
    refs.flowScreen.querySelectorAll('.mode-card').forEach(function (card) {
      card.onclick = function () {
        Motor.setModo(card.getAttribute('data-modo'));
        Motor.setFase('EQUIPOS');
        UI.render();
      };
    });
  };

  /* =================== EQUIPOS (rejilla adaptativa) =================== */
  function colsPara(effectiveSlots) {
    if (effectiveSlots <= 1) return 1;
    if (effectiveSlots <= 2) return 2;
    if (effectiveSlots <= 4) return 2;
    if (effectiveSlots <= 6) return 3;
    return 4;
  }
  function slotsEfectivos(n) {
    if (n <= 1) return 1;
    if (n <= 2) return 2;
    if (n <= 4) return 4;
    if (n <= 6) return 6;
    return 8;
  }

  UI.screens.EQUIPOS = function () {
    if (Motor.getEquipos().length === 0) {
      var presets = Motor.presetsDisponibles();
      Motor.crearEquipoDesdePreset(presets[0]);
      Motor.crearEquipoDesdePreset(Motor.presetsDisponibles()[0]);
    }
    pintarEquiposFlow();
  };

  function pintarEquiposFlow() {
    var equipos = Motor.getEquipos();
    // el hueco de "añadir" cuenta como una celda más a la hora de calcular
    // cuántos huecos totales conviene mostrar, para que el botón de añadir
    // nunca desaparezca al llegar a un número "redondo" de equipos (2,4,6)
    var puedeAnadir = equipos.length < 8;
    var totalParaCalculo = equipos.length + (puedeAnadir ? 1 : 0);
    var efectivos = slotsEfectivos(totalParaCalculo);
    var cols = colsPara(efectivos);

    var celdas = equipos.map(function (eq) {
      return '<div class="team-cell' + (eq.listo ? ' ready' : '') + '">' +
        '<span class="ready-badge">¡Listo!</span>' +
        (equipos.length > 2 ? '<button class="remove-slot" data-id="' + eq.id + '">✕</button>' : '') +
        '<div class="emoji">' + eq.emoji + '</div>' +
        '<div class="name">' + eq.nombre + '</div>' +
        (eq.portavoz ? '<div class="portavoz">🎤 ' + eq.portavoz + '</div>' : '') +
        '<button class="listo-btn" data-id="' + eq.id + '">' + (eq.listo ? '✓ Listo' : 'Marcar listo') + '</button>' +
        '</div>';
    });
    if (puedeAnadir) celdas.push('<div class="team-cell add-slot" id="addSlotBtn"><div style="font-size:26px">＋</div>Añadir equipo</div>');
    var huecosRestantes = efectivos - celdas.length;
    for (var i = 0; i < huecosRestantes; i++) celdas.push('<div class="team-cell filler"></div>');

    refs.flowScreen.innerHTML =
      '<h2>¿Qué equipos entran hoy en juego?</h2>' +
      '<div class="muted">Añade entre 2 y 8 equipos y marcad "Listo" cuando estéis todos preparados.</div>' +
      '<div class="team-grid-wrap"><div class="team-grid cols-' + cols + '" id="teamGrid">' + celdas.join('') + '</div>' +
      '<div id="equiposError"></div>' +
      '<button class="big-cta" id="continuarEquiposBtn" disabled>▶ Continuar</button></div>' +
      '<div class="flow-footer"><button class="flow-back" id="backModoBtn">◀ Volver</button></div>';

    document.getElementById('backModoBtn').onclick = function () { Motor.setFase('MODO'); UI.render(); };
    var addBtn = document.getElementById('addSlotBtn');
    if (addBtn) addBtn.onclick = abrirSelectorIdentidad;
    refs.flowScreen.querySelectorAll('.remove-slot').forEach(function (btn) {
      btn.onclick = function (e) { e.stopPropagation(); Motor.quitarEquipo(btn.getAttribute('data-id')); pintarEquiposFlow(); };
    });
    refs.flowScreen.querySelectorAll('.listo-btn').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        var eq = Motor.getEquipos().find(function (x) { return x.id === id; });
        Motor.marcarListo(id, !eq.listo);
        pintarEquiposFlow();
      };
    });
    document.getElementById('continuarEquiposBtn').onclick = function () {
      var res = Motor.confirmarInicio();
      if (!res.ok) { document.getElementById('equiposError').innerHTML = '<div class="error-box">⚠️ ' + res.error + '</div>'; return; }
      Motor.setFase('CONTENIDO_GATE');
      UI.render();
    };
    document.getElementById('continuarEquiposBtn').disabled = !Motor.todosListos();
  }

  /* ---- Overlay: elegir preset o crear identidad propia ---- */
  var emojiCicloIdx = 0;
  function abrirSelectorIdentidad() {
    var presets = Motor.presetsDisponibles();
    UI.refs.identityGrid.innerHTML = presets.map(function (p) {
      return '<div class="identity-opt" data-nombre="' + p.nombre + '"><div class="emoji">' + p.emoji + '</div><div class="name">' + p.nombre + '</div></div>';
    }).join('');
    UI.refs.identityGrid.querySelectorAll('.identity-opt').forEach(function (opt) {
      opt.onclick = function () {
        var nombre = opt.getAttribute('data-nombre');
        var preset = presets.find(function (p) { return p.nombre === nombre; });
        Motor.crearEquipoDesdePreset(preset);
        UI.refs.identityOverlay.classList.remove('show');
        pintarEquiposFlow();
      };
    });

    var emojiBtn = document.getElementById('emojiCycleBtn');
    var libres = Motor.EMOJI_PALETTE.filter(function (e) { return Motor.emojisUsados().indexOf(e) === -1; });
    emojiCicloIdx = 0;
    emojiBtn.textContent = libres[0] || '❓';
    emojiBtn.onclick = function () { emojiCicloIdx = (emojiCicloIdx + 1) % libres.length; emojiBtn.textContent = libres[emojiCicloIdx]; };

    document.getElementById('customNombre').value = '';
    document.getElementById('customPortavoz').value = '';
    document.getElementById('customError').innerHTML = '';
    document.getElementById('customAddBtn').onclick = function () {
      var res = Motor.crearEquipoPersonalizado(document.getElementById('customNombre').value, emojiBtn.textContent, document.getElementById('customPortavoz').value);
      if (!res.ok) { document.getElementById('customError').innerHTML = '<div class="error-box">⚠️ ' + res.error + '</div>'; return; }
      UI.refs.identityOverlay.classList.remove('show');
      pintarEquiposFlow();
    };

    UI.refs.identityOverlay.classList.add('show');
  }
  document.getElementById('identityCancel').onclick = function () { UI.refs.identityOverlay.classList.remove('show'); };

})();
