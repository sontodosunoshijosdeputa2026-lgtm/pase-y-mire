(function () {

  function createShell() {
    if (document.getElementById('pymShell')) return;

    const user = window.PyMAuth?.getCurrentUser();

    const shell = document.createElement('div');

    shell.id = 'pymShell';

    shell.innerHTML = `
      <header class="pym-header">
        <div class="pym-brand">
          <div class="pym-logo">PyM</div>

          <div>
            <strong>Pase y Mire</strong>
            <small>El espacio más libre</small>
          </div>
        </div>

        <button class="pym-header-button"
                onclick="location.href='/notifications.html'">
          <i class="fas fa-bell"></i>
        </button>
      </header>

      <nav class="pym-bottom-nav">

        <a href="/marketplace.html"
           data-route="marketplace">
          <i class="fas fa-store"></i>
          <span>Mercado</span>
        </a>

        <a href="/reels.html"
           data-route="reels">
          <i class="fas fa-play-circle"></i>
          <span>Reels</span>
        </a>

        <a href="/chat.html"
           data-route="chat">
          <i class="fas fa-comments"></i>
          <span>Chat</span>
        </a>

        <a href="/wallet.html"
           data-route="wallet">
          <i class="fas fa-wallet"></i>
          <span>Billetera</span>
        </a>

        <a href="/profile.html"
           data-route="profile">
          <i class="fas fa-user"></i>
          <span>Perfil</span>
        </a>

      </nav>
    `;

    document.body.prepend(shell);

    const current =
      location.pathname
        .split('/')
        .pop()
        .replace('.html', '') || 'marketplace';

    document
      .querySelectorAll('.pym-bottom-nav a')
      .forEach(link => {
        if (link.dataset.route === current) {
          link.classList.add('active');
        }
      });

    if (user) {
      document.body.dataset.userId = user.id;
    }
  }

  function injectStyles() {
    if (document.getElementById('pymShellStyles')) return;

    const style = document.createElement('style');

    style.id = 'pymShellStyles';

    style.textContent = `
      :root {
        --pym-primary: #9a7bc7;
        --pym-primary-light: #dfd2f2;
        --pym-pink: #f2dce7;
        --pym-blue: #d9edf5;
        --pym-bg: #fbf9fc;
        --pym-text: #39343f;
        --pym-muted: #827b88;
      }

      body {
        padding-bottom: 82px !important;
        background: var(--pym-bg);
      }

      .pym-header {
        position: sticky;
        top: 0;
        z-index: 1000;
        height: 68px;
        padding: 10px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(255,255,255,.92);
        backdrop-filter: blur(15px);
        border-bottom: 1px solid #eee8f2;
      }

      .pym-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .pym-logo {
        width: 44px;
        height: 44px;
        border-radius: 13px;
        display: grid;
        place-items: center;
        background: linear-gradient(
          135deg,
          var(--pym-primary-light),
          var(--pym-pink)
        );
        color: var(--pym-primary);
        font-weight: 900;
      }

      .pym-brand strong {
        display: block;
        color: var(--pym-text);
        font-size: 15px;
      }

      .pym-brand small {
        display: block;
        color: var(--pym-muted);
        font-size: 11px;
      }

      .pym-header-button {
        width: 40px;
        height: 40px;
        border: 0;
        border-radius: 50%;
        background: var(--pym-blue);
        color: var(--pym-primary);
        cursor: pointer;
      }

      .pym-bottom-nav {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2000;
        height: 72px;
        display: flex;
        align-items: center;
        justify-content: space-around;
        background: rgba(255,255,255,.96);
        backdrop-filter: blur(15px);
        border-top: 1px solid #eee8f2;
        box-shadow: 0 -8px 25px rgba(70,50,90,.08);
      }

      .pym-bottom-nav a {
        flex: 1;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        text-decoration: none;
        color: #aaa2b0;
        font-size: 11px;
        font-weight: 700;
      }

      .pym-bottom-nav a i {
        font-size: 19px;
      }

      .pym-bottom-nav a.active {
        color: var(--pym-primary);
      }
    `;

    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    createShell();
  });

  window.PyMShell = {
    createShell
  };

})();
