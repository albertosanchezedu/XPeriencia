/* ===================================================================
   UI CORE — referencias compartidas, portada, transiciones y menú.
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
    identityOverlay: document.getElementById('identityOverlay'),
    identityGrid: document.getElementById('identityGrid'),
    contentFileInput: document.getElementById('contentFile'),
    playIntro: document.getElementById('playIntro'),
    titleChip: document.getElementById('titleChip')
  };

  var screens = {};
  var actions = {};

  /* =================== PORTADA: emojis de fondo por toda la pantalla =================== */
  var EMOJIS_FONDO = [
    '📦','🚚','🛒','🏬','📈','🏷️','🗃️','💼','🧾','📊',
    '💻','🖥️','⚙️','🔌','🔧','🚗','🧪','🩺','💉','🍽️',
    '💇','✂️','🧵','🎨','🌾','🖊️','🔬','🏗️','📐','🎭'
  ];
  function pintarEmojisFondo() {
    var cont = document.getElementById('splashEmojis');
    var html = '';
    var total = 30;
    for (var i = 0; i < total; i++) {
      var e = EMOJIS_FONDO[i % EMOJIS_FONDO.length];
      var left = Math.random() * 96;
      var delay = Math.random() * 16;
      var dur = 11 + Math.random() * 10;
      var size = 34 + Math.random() * 40;
      html += '<span class="float-emoji" style="left:' + left + '%;bottom:-80px;font-size:' + size + 'px;animation-duration:' + dur + 's;animation-delay:-' + delay + 's;">' + e + '</span>';
    }
    cont.innerHTML = html;
  }
  pintarEmojisFondo();

  /* ---- Fondo dinámico sutil para el resto de pantallas (menos denso, más lento) ---- */
  function pintarBgEmojisApp() {
    var cont = document.getElementById('appBgEmojis');
    var html = '';
    var total = 10;
    for (var i = 0; i < total; i++) {
      var e = EMOJIS_FONDO[(i * 3) % EMOJIS_FONDO.length];
      var left = Math.random() * 96;
      var delay = Math.random() * 22;
      var dur = 22 + Math.random() * 14;
      var size = 30 + Math.random() * 30;
      html += '<span class="bg-float-emoji" style="left:' + left + '%;bottom:-80px;font-size:' + size + 'px;animation-duration:' + dur + 's;animation-delay:-' + delay + 's;">' + e + '</span>';
    }
    cont.innerHTML = html;
  }
  pintarBgEmojisApp();

  /* =================== Secuencia de intro: XP y "eriencia" terminan juntos =================== */
  function reproducirIntro(callback) {
    var chip = document.getElementById('introChip');
    var colon = document.getElementById('introColon');
    var rest = document.getElementById('introRest');
    chip.textContent = 'FP';
    chip.classList.remove('pulse', 'junto', 'agita', 'explota');
    chip.style.display = ''; chip.style.opacity = ''; chip.style.transition = ''; chip.style.transform = '';
    document.getElementById('introSeq').classList.remove('impacto', 'junto');
    colon.classList.remove('gone');
    colon.style.display = ''; colon.style.opacity = ''; colon.style.transition = '';
    rest.classList.remove('reveal');
    rest.style.width = ''; rest.style.transition = '';
    rest.textContent = '';
    document.querySelectorAll('.intro-flash,.intro-particle').forEach(function (el) { el.remove(); });

    setTimeout(function () {
      colon.classList.add('gone');
      chip.classList.add('agita');
      setTimeout(function () { chip.textContent = 'XP'; }, 200);
    }, 900);

    setTimeout(function () {
      // explosión: el fondo se opaca un instante, salen partículas y el
      // chip "XP" estalla; de ahí sale ya la palabra completa
      var flash = document.createElement('div');
      flash.className = 'intro-flash';
      document.body.appendChild(flash);
      requestAnimationFrame(function () { flash.classList.add('show'); });

      var r = chip.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      for (var i = 0; i < 14; i++) {
        var p = document.createElement('div');
        p.className = 'intro-particle';
        var ang = (Math.PI * 2 * i) / 14;
        var dist = 60 + Math.random() * 50;
        p.style.left = cx + 'px'; p.style.top = cy + 'px';
        p.style.setProperty('--px', Math.cos(ang) * dist + 'px');
        p.style.setProperty('--py', Math.sin(ang) * dist + 'px');
        p.style.background = i % 2 ? '#7FE0FF' : '#CFFF04';
        document.body.appendChild(p);
        setTimeout(function (el) { return function () { el.remove(); }; }(p), 550);
      }
      chip.classList.add('explota');

      setTimeout(function () {
        flash.classList.remove('show');
        setTimeout(function () { flash.remove(); }, 200);
        chip.style.display = 'none';
        colon.style.display = 'none';
        rest.style.transition = 'none';
        rest.style.width = 'auto';
        rest.textContent = 'XPeriencia';
        document.getElementById('introSeq').classList.add('impacto');
      }, 380);
    }, 1650);

    setTimeout(function () { document.getElementById('splashSub').classList.add('show'); }, 2350);
    setTimeout(function () {
      document.getElementById('splashStartBtn').classList.add('show');
      if (Motor.haySesionGuardada()) document.getElementById('splashContinueBtn').classList.add('show');
      if (callback) callback();
    }, 2700);
  }

  function mostrarSplash() {
    refs.splashScreen.style.display = 'flex';
    refs.flowScreen.classList.add('hidden');
    refs.gameArea.classList.add('hidden');
    // la animación de apertura se repite siempre que se vuelve a la portada
    document.getElementById('splashSub').classList.remove('show');
    document.getElementById('splashStartBtn').classList.remove('show');
    document.getElementById('splashContinueBtn').classList.remove('show');
    reproducirIntro();
  }

  document.getElementById('splashStartBtn').onclick = function () {
    Sonido.avanzar();
    Motor.reiniciarTodo();
    refs.splashScreen.style.display = 'none';
    Motor.setFase('MODO');
    render();
  };
  document.getElementById('splashContinueBtn').onclick = function () {
    Sonido.clic();
    Motor.restaurarSesion();
    refs.splashScreen.style.display = 'none';
    render();
  };

  /* =================== TRANSICIÓN "A JUGAR" =================== */
  function mostrarTransicionJuego(callback) {
    Sonido.avanzar();
    refs.playIntro.classList.add('show');
    setTimeout(function () {
      refs.playIntro.classList.remove('show');
      if (callback) callback();
    }, 900);
  }

  /* =================== RENDER PRINCIPAL =================== */
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
    void refs.flowScreen.offsetWidth;
    requestAnimationFrame(function () { refs.flowScreen.classList.add('enter'); });
    renderHelpPanel();
  }

  /* =================== MENÚ ÚNICO ("?") =================== */
  var helpBtn = document.getElementById('helpBtn');
  var helpPanel = document.getElementById('helpPanel');
  helpBtn.onclick = function (e) { e.stopPropagation(); Sonido.clic(); renderHelpPanel(); helpPanel.classList.toggle('open'); };
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
    document.querySelector('.hp-divider').classList.toggle('with-actions', botones.length > 0);
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
  Motor.restaurarSesion();
  mostrarSplash();

  return {
    refs: refs, screens: screens, actions: actions,
    render: render, mostrarTransicionJuego: mostrarTransicionJuego, renderHelpPanel: renderHelpPanel
  };
})();
