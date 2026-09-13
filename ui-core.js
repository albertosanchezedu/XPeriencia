/* ===================================================================
   UI CORE — referencias compartidas, portada, transiciones y menú.
   Los demás archivos (ui-equipos.js, ui-juego.js) registran sus
   pantallas en UI.screens y sus acciones del menú en UI.actions.
   =================================================================== */

var UI = (function () {

  var refs = {
    splashScreen: document.getElementById('splashScreen'),
    flowScreen: document.getElementById('flowScreen'),
    gameArea: document.getElementById('gameArea'),
    stage: document.getElementById('stage'),
    stageContent: document.getElementById('stageContent'),
    teamsPanel: document.getElementById('teamsPanel'),
    turnScreen: document.getElementById('turnScreen'),
    timeUpBanner: document.getElementById('timeUpBanner'),
    timerWrap: document.getElementById('timerWrap'),
    timerWarnText: document.getElementById('timerWarnText'),
    identityOverlay: document.getElementById('identityOverlay'),
    identityGrid: document.getElementById('identityGrid'),
    contentFileInput: document.getElementById('contentFile'),
    playIntro: document.getElementById('playIntro')
  };

  var screens = {};   // fase -> función de render, la rellenan otros archivos
  var actions = {};   // acciones contextuales del menú único, las rellenan otros archivos

  /* =================== PORTADA: secuencia de arranque =================== */
  var EMOJIS_FONDO = [
    '📦','🚚','🛒','🏬','📈','🏷️','🗃️','💼','🧾','📊',       // comercio y marketing
    '💻','🖥️','⚙️','🔌','🔧','🚗','🧪','🩺','💉','🍽️',        // informática, electricidad, automoción, sanidad, hostelería
    '💇','✂️','🧵','🎨','🌾','🖊️','🔬','🏗️','📐','🎭'         // imagen personal, textil, arte, agraria, administración, edificación...
  ];
  function pintarEmojisFondo() {
    var cont = document.getElementById('splashEmojis');
    var html = '';
    var total = 34;
    for (var i = 0; i < total; i++) {
      var e = EMOJIS_FONDO[i % EMOJIS_FONDO.length];
      var left = Math.random() * 100;
      var delay = Math.random() * 16;
      var dur = 12 + Math.random() * 12;
      var size = 26 + Math.random() * 26;
      html += '<span class="float-emoji" style="left:' + left + '%;font-size:' + size + 'px;animation-duration:' + dur + 's;animation-delay:-' + delay + 's;">' + e + '</span>';
    }
    cont.innerHTML = html;
  }
  pintarEmojisFondo();

  function reproducirIntro(callback) {
    var seq = document.getElementById('introSeq');
    var pasos = [
      '<span class="logo-chip">FP</span><span>:</span>',
      '<span class="logo-chip">XP</span><span>:</span>',
      '<span class="logo-chip">XP</span>',
      'XPeriencia'
    ];
    var i = 0;
    seq.innerHTML = pasos[0];
    seq.className = 'intro-fade-in';
    function siguientePaso() {
      i++;
      if (i >= pasos.length) {
        seq.classList.add('intro-fade-out');
        setTimeout(function () {
          seq.classList.add('hidden');
          document.getElementById('splashTitle').classList.remove('hidden');
          document.getElementById('splashSub').classList.remove('hidden');
          document.getElementById('splashStartBtn').classList.remove('hidden');
          if (Motor.haySesionGuardada()) document.getElementById('splashContinueBtn').classList.remove('hidden');
          if (callback) callback();
        }, 350);
        return;
      }
      seq.classList.add('intro-fade-out');
      setTimeout(function () {
        seq.innerHTML = pasos[i];
        seq.className = 'intro-fade-in';
        setTimeout(siguientePaso, 420);
      }, 260);
    }
    setTimeout(siguientePaso, 420);
  }

  var introYaVista = false;
  function mostrarSplash() {
    refs.splashScreen.style.display = 'flex';
    refs.flowScreen.classList.add('hidden');
    refs.gameArea.classList.add('hidden');
    if (!introYaVista) {
      introYaVista = true;
      document.getElementById('splashTitle').classList.add('hidden');
      document.getElementById('splashSub').classList.add('hidden');
      document.getElementById('splashStartBtn').classList.add('hidden');
      document.getElementById('splashContinueBtn').classList.add('hidden');
      reproducirIntro();
    } else {
      document.getElementById('introSeq').classList.add('hidden');
      document.getElementById('splashTitle').classList.remove('hidden');
      document.getElementById('splashSub').classList.remove('hidden');
      document.getElementById('splashStartBtn').classList.remove('hidden');
      document.getElementById('splashContinueBtn').classList.toggle('hidden', !Motor.haySesionGuardada());
    }
  }

  document.getElementById('splashStartBtn').onclick = function () {
    Motor.reiniciarTodo();
    refs.splashScreen.style.display = 'none';
    Motor.setFase('MODO');
    render();
  };
  document.getElementById('splashContinueBtn').onclick = function () {
    Motor.restaurarSesion();
    refs.splashScreen.style.display = 'none';
    render();
  };

  /* =================== TRANSICIÓN "A JUGAR" =================== */
  function mostrarTransicionJuego(callback) {
    refs.playIntro.classList.add('show');
    setTimeout(function () {
      refs.playIntro.classList.remove('show');
      if (callback) callback();
    }, 900);
  }

  /* =================== RENDER PRINCIPAL (según fase) =================== */
  function render() {
    var fase = Motor.getFase();
    if (fase === 'SPLASH') { mostrarSplash(); return; }
    if (fase === 'JUGANDO') {
      refs.flowScreen.classList.add('hidden');
      refs.gameArea.classList.remove('hidden');
      if (screens.JUGANDO) screens.JUGANDO();
      renderHelpPanel();
      return;
    }
    refs.gameArea.classList.add('hidden');
    refs.flowScreen.classList.remove('hidden');
    refs.flowScreen.classList.remove('enter');
    if (screens[fase]) screens[fase]();
    // fuerza reflow para que la transición de entrada se aprecie siempre
    void refs.flowScreen.offsetWidth;
    requestAnimationFrame(function () { refs.flowScreen.classList.add('enter'); });
    renderHelpPanel();
  }

  /* =================== MENÚ ÚNICO ("?") =================== */
  var helpBtn = document.getElementById('helpBtn');
  var helpPanel = document.getElementById('helpPanel');
  helpBtn.onclick = function (e) { e.stopPropagation(); renderHelpPanel(); helpPanel.classList.toggle('open'); };
  document.addEventListener('click', function (e) {
    if (helpPanel.classList.contains('open') && !helpPanel.contains(e.target) && e.target !== helpBtn) helpPanel.classList.remove('open');
  });

  function renderHelpPanel() {
    var fase = Motor.getFase();
    var botones = [];
    if (fase === 'JUGANDO' || fase === 'JUEGOS') botones.push({ label: '📚 Cargar / cambiar contenido', fn: actions.cargarContenido });
    if (fase === 'JUGANDO') botones.push({ label: '🏁 Finalizar y ver resultados', fn: actions.finalizar });
    if (fase !== 'SPLASH') botones.push({ label: '🏠 Salir al menú principal', fn: confirmarMenuPrincipal });

    document.getElementById('hpActions').innerHTML = botones.map(function (b, i) {
      return '<button class="hp-btn" data-i="' + i + '">' + b.label + '</button>';
    }).join('');
    document.querySelectorAll('#hpActions .hp-btn').forEach(function (btn, i) {
      btn.onclick = function () { helpPanel.classList.remove('open'); if (botones[i].fn) botones[i].fn(); };
    });
  }

  function confirmarMenuPrincipal() {
    if (confirm('¿Salir al menú principal? El progreso se guarda solo y podrás continuarlo luego.')) {
      Motor.persistir();
      Motor.setFase('SPLASH');
      mostrarSplash();
    }
  }

  /* =================== ARRANQUE =================== */
  Chivatini.init();
  // Restauramos el estado guardado en memoria (para saber si hay partida
  // pendiente) pero SIN persistir ningún cambio de fase todavía: la
  // portada se muestra siempre al cargar, y solo "Continuar" o "Empezar"
  // deciden qué pasa con la partida guardada.
  Motor.restaurarSesion();
  mostrarSplash();

  return {
    refs: refs, screens: screens, actions: actions,
    render: render, mostrarTransicionJuego: mostrarTransicionJuego, renderHelpPanel: renderHelpPanel
  };
})();
