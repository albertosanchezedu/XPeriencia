/* ===================================================================
   UI EQUIPOS — pantallas MODO y EQUIPOS
   =================================================================== */

(function () {

  var refs = UI.refs;

  /* =================== MODO =================== */
  UI.screens.MODO = function () {
    refs.flowScreen.innerHTML =
      '<h2>¿Cómo jugáis hoy?</h2>' +
      '<div class="muted">Elige el formato de la sesión. Todos los modos tienen un final claro.</div>' +
      '<div class="mode-grid">' +
      '<div class="mode-card" data-modo="libre"><div class="m-emoji emoji">🎯</div><div class="m-title">Modo libre</div><div class="m-desc">Elige cuántas rondas jugáis.</div></div>' +
      '<div class="mode-card" data-modo="mejor3"><div class="m-emoji emoji">🥉</div><div class="m-title">Torneo · mejor de 3</div><div class="m-desc">3 rondas y termina sola.</div></div>' +
      '<div class="mode-card" data-modo="mejor5"><div class="m-emoji emoji">🥇</div><div class="m-title">Torneo · mejor de 5</div><div class="m-desc">5 rondas y termina sola.</div></div>' +
      '</div>' +
      '<div id="rondasPickerBox"></div>';

    refs.flowScreen.querySelectorAll('.mode-card').forEach(function (card) {
      card.onclick = function () {
        Sonido.seleccion();
        var modo = card.getAttribute('data-modo');
        refs.flowScreen.querySelectorAll('.mode-card').forEach(function (c) { c.style.borderColor = 'transparent'; });
        card.style.borderColor = 'var(--accent-lima)';
        if (modo !== 'libre') {
          Motor.setModo(modo);
          Sonido.avanzar();
          Motor.setFase('EQUIPOS');
          UI.render();
          return;
        }
        document.getElementById('rondasPickerBox').innerHTML =
          '<div class="muted" style="margin-top:14px">¿Cuántas rondas jugáis?</div>' +
          '<div class="mode-grid" style="margin-top:8px">' +
          [3, 5, 10, 15].map(function (n) { return '<div class="mode-card" data-rondas="' + n + '" style="min-width:100px;padding:16px 20px"><div class="m-title">' + n + '</div></div>'; }).join('') +
          '</div>';
        document.querySelectorAll('#rondasPickerBox .mode-card').forEach(function (rc) {
          rc.onclick = function () {
            Sonido.avanzar();
            Motor.setModo('libre', parseInt(rc.getAttribute('data-rondas'), 10));
            Motor.setFase('EQUIPOS');
            UI.render();
          };
        });
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
    var puedeAnadir = equipos.length < 8;
    var totalParaCalculo = equipos.length + (puedeAnadir ? 1 : 0);
    var efectivos = slotsEfectivos(totalParaCalculo);
    var cols = colsPara(efectivos);

    var celdas = equipos.map(function (eq) {
      return '<div class="team-cell' + (eq.listo ? ' ready' : '') + '">' +
        '<span class="ready-badge">¡Listo!</span>' +
        '<button class="edit-slot" data-id="' + eq.id + '" title="Editar">✎</button>' +
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
    if (addBtn) addBtn.onclick = function () { Sonido.clic(); abrirSelectorIdentidad(null); };
    refs.flowScreen.querySelectorAll('.remove-slot').forEach(function (btn) {
      btn.onclick = function (e) { e.stopPropagation(); Motor.quitarEquipo(btn.getAttribute('data-id')); pintarEquiposFlow(); };
    });
    refs.flowScreen.querySelectorAll('.edit-slot').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var eq = Motor.getEquipos().find(function (x) { return x.id === btn.getAttribute('data-id'); });
        Sonido.clic();
        abrirSelectorIdentidad(eq);
      };
    });
    refs.flowScreen.querySelectorAll('.listo-btn').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-id');
        var eq = Motor.getEquipos().find(function (x) { return x.id === id; });
        var estabaListo = eq.listo;
        Motor.marcarListo(id, !estabaListo);
        if (!estabaListo) Sonido.listo(); else Sonido.clic();
        pintarEquiposFlow();
      };
    });
    document.getElementById('continuarEquiposBtn').onclick = function () {
      var res = Motor.confirmarInicio();
      if (!res.ok) { document.getElementById('equiposError').innerHTML = '<div class="error-box">⚠️ ' + res.error + '</div>'; return; }
      Sonido.avanzar();
      Motor.setFase('CONTENIDO_GATE');
      UI.render();
    };
    document.getElementById('continuarEquiposBtn').disabled = !Motor.todosListos();
  }

  /* ---- Overlay: elegir identidad rápida (predefinida) + portavoz ----
     equipoExistente = null -> añadir nuevo equipo
     equipoExistente = {...} -> editar identidad/portavoz de uno ya creado */
  var presetElegido = null;

  function abrirSelectorIdentidad(equipoExistente) {
    var editando = !!equipoExistente;
    document.getElementById('identityTitle').textContent = editando ? 'Editar equipo' : 'Elige la identidad del equipo';
    // presetsDisponibles ya incluye la identidad actual del equipo que se edita
    // (se excluye de "usados" para poder mantenerla seleccionada), así que no
    // hay que añadirla aparte: eso era lo que causaba el símbolo duplicado.
    var opciones = Motor.presetsDisponibles(editando ? equipoExistente.id : undefined);
    presetElegido = editando ? { nombre: equipoExistente.nombre, emoji: equipoExistente.emoji } : opciones[0];

    function pintarGrid() {
      UI.refs.identityGrid.innerHTML = opciones.map(function (p) {
        var sel = presetElegido && presetElegido.nombre === p.nombre;
        return '<div class="identity-opt' + (sel ? ' selected' : '') + '" data-nombre="' + p.nombre + '"><div class="emoji">' + p.emoji + '</div><div class="name">' + p.nombre + '</div></div>';
      }).join('');
      UI.refs.identityGrid.querySelectorAll('.identity-opt').forEach(function (opt) {
        opt.onclick = function () {
          var nombre = opt.getAttribute('data-nombre');
          presetElegido = opciones.find(function (p) { return p.nombre === nombre; });
          Sonido.seleccion();
          pintarGrid();
        };
      });
    }
    pintarGrid();

    // el formulario de portavoz se ve siempre completo, sin pasos ocultos
    var portavozInput = document.getElementById('portavozInput');
    portavozInput.value = editando ? (equipoExistente.portavoz || '') : '';

    document.getElementById('portavozSaveBtn').onclick = function () {
      if (!presetElegido) return;
      if (editando) {
        Motor.editarEquipo(equipoExistente.id, { preset: presetElegido, portavoz: portavozInput.value });
      } else {
        var res = Motor.crearEquipoDesdePreset(presetElegido);
        if (res.ok) {
          var nuevo = Motor.getEquipos()[Motor.getEquipos().length - 1];
          if (portavozInput.value.trim()) Motor.editarEquipo(nuevo.id, { portavoz: portavozInput.value });
        }
      }
      Sonido.avanzar();
      UI.refs.identityOverlay.classList.remove('show');
      pintarEquiposFlow();
    };

    UI.refs.identityOverlay.classList.add('show');
  }
  document.getElementById('identityCancel').onclick = function () { UI.refs.identityOverlay.classList.remove('show'); };

})();
