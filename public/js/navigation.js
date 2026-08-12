// ============================================================
// PASE Y MIRE
// Navegación lateral única
// ============================================================

class NavigationManager {

  constructor() {
    this.container = null;
    this.screens = [];
    this.currentIndex = 0;
    this.isAnimating = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;

    this.init();
  }

  // ==========================================================
  // INIT
  // ==========================================================

  init() {
    if (
      document.readyState === 'loading'
    ) {
      document.addEventListener(
        'DOMContentLoaded',
        () => this.setup()
      );

      return;
    }

    this.setup();
  }

  setup() {

    this.container =
      document.querySelector(
        '.screens-container'
      );

    if (!this.container) {
      console.warn(
        'NavigationManager: .screens-container no encontrado'
      );

      return;
    }

    this.screens = Array.from(
      this.container.querySelectorAll(
        '.screen'
      )
    );

    if (!this.screens.length) {
      console.warn(
        'NavigationManager: no hay .screen'
      );

      return;
    }

    this.configureContainer();
    this.configureScreens();
    this.createIndicators();

    this.setupClicks();
    this.setupScroll();
    this.setupSwipe();
    this.setupKeyboard();
    this.setupHash();
    this.setupResize();

    this.goToInitialScreen();

    window.navigationManager =
      this;
  }

  // ==========================================================
  // CONFIGURACIÓN
  // ==========================================================

  configureContainer() {

    this.container.style.display =
      'flex';

    this.container.style.flexDirection =
      'row';

    this.container.style.flexWrap =
      'nowrap';

    this.container.style.overflowX =
      'auto';

    this.container.style.overflowY =
      'hidden';

    this.container.style.scrollSnapType =
      'x mandatory';

    this.container.style.scrollBehavior =
      'smooth';

    this.container.style.width =
      '100%';

    this.container.style.height =
      '100%';
  }

  configureScreens() {

    this.screens.forEach(
      screen => {

        screen.style.flex =
          '0 0 100%';

        screen.style.width =
          '100%';

        screen.style.minWidth =
          '100%';

        screen.style.height =
          '100%';

        screen.style.boxSizing =
          'border-box';

        screen.style.scrollSnapAlign =
          'start';

        screen.style.overflowY =
          'auto';

        screen.style.overflowX =
          'hidden';
      }
    );
  }

  // ==========================================================
  // INDICADORES
  // ==========================================================

  createIndicators() {

    let indicators =
      document.querySelector(
        '.navigation-dots'
      );

    if (!indicators) {

      indicators =
        document.createElement(
          'div'
        );

      indicators.className =
        'navigation-dots';

      document.body.appendChild(
        indicators
      );
    }

    indicators.innerHTML = '';

    this.screens.forEach(
      (screen, index) => {

        const button =
          document.createElement(
            'button'
          );

        button.type =
          'button';

        button.className =
          'navigation-dot';

        button.dataset.index =
          String(index);

        button.title =
          screen.dataset.title ||
          screen.id ||
          `Pantalla ${index + 1}`;

        button.setAttribute(
          'aria-label',
          `Ir a ${
            screen.dataset.title ||
            screen.id ||
            `pantalla ${index + 1}`
          }`
        );

        button.addEventListener(
          'click',
          () => {
            this.goTo(index);
          }
        );

        indicators.appendChild(
          button
        );
      }
    );

    this.indicators =
      Array.from(
        indicators.querySelectorAll(
          '.navigation-dot'
        )
      );

    this.updateIndicators();
  }

  updateIndicators() {

    if (!this.indicators) {
      return;
    }

    this.indicators.forEach(
      (button, index) => {

        const active =
          index ===
          this.currentIndex;

        button.classList.toggle(
          'active',
          active
        );

        if (active) {
          button.setAttribute(
            'aria-current',
            'page'
          );
        } else {
          button.removeAttribute(
            'aria-current'
          );
        }
      }
    );
  }

  // ==========================================================
  // CLICK EN ENLACES INTERNOS
  // ==========================================================

  setupClicks() {

    document.addEventListener(
      'click',
      event => {

        const target =
          event.target.closest(
            '[data-screen]'
          );

        if (!target) {
          return;
        }

        const screenName =
          target.dataset.screen;

        const index =
          this.screens.findIndex(
            screen =>
              screen.id ===
                screenName ||
              screen.dataset.screen ===
                screenName
          );

        if (index === -1) {
          return;
        }

        event.preventDefault();

        this.goTo(index);
      }
    );
  }

  // ==========================================================
  // SCROLL
  // ==========================================================

  setupScroll() {

    let timeout = null;

    this.container.addEventListener(
      'scroll',
      () => {

        clearTimeout(timeout);

        timeout =
          setTimeout(
            () => {

              if (
                this.isAnimating
              ) {
                return;
              }

              this.detectCurrentScreen();
            },
            80
          );
      },
      {
        passive: true
      }
    );
  }

  detectCurrentScreen() {

    const width =
      this.container.clientWidth;

    if (!width) {
      return;
    }

    const index =
      Math.round(
        this.container.scrollLeft /
        width
      );

    const safeIndex =
      Math.max(
        0,
        Math.min(
          index,
          this.screens.length - 1
        )
      );

    if (
      safeIndex !==
      this.currentIndex
    ) {

      this.currentIndex =
        safeIndex;

      this.updateIndicators();
      this.updateHash();
    }
  }

  // ==========================================================
  // IR A PANTALLA
  // ==========================================================

  goTo(
    index,
    smooth = true
  ) {

    if (
      !this.container ||
      !this.screens.length
    ) {
      return;
    }

    if (
      index < 0 ||
      index >= this.screens.length
    ) {
      return;
    }

    this.currentIndex =
      index;

    this.updateIndicators();
    this.updateHash();

    const screen =
      this.screens[index];

    this.isAnimating =
      true;

    this.container.scrollTo({
      left:
        screen.offsetLeft,
      behavior:
        smooth
          ? 'smooth'
          : 'auto'
    });

    window.setTimeout(
      () => {
        this.isAnimating =
          false;
      },
      smooth ? 500 : 0
    );
  }

  next() {

    this.goTo(
      Math.min(
        this.currentIndex + 1,
        this.screens.length - 1
      )
    );
  }

  previous() {

    this.goTo(
      Math.max(
        this.currentIndex - 1,
        0
      )
    );
  }

  // ==========================================================
  // SWIPE
  // ==========================================================

  setupSwipe() {

    this.container.addEventListener(
      'touchstart',
      event => {

        if (
          !event.touches.length
        ) {
          return;
        }

        const touch =
          event.touches[0];

        this.touchStartX =
          touch.clientX;

        this.touchStartY =
          touch.clientY;

        this.touchStartTime =
          Date.now();
      },
      {
        passive: true
      }
    );

    this.container.addEventListener(
      'touchend',
      event => {

        if (
          !event.changedTouches.length
        ) {
          return;
        }

        const touch =
          event.changedTouches[0];

        const deltaX =
          touch.clientX -
          this.touchStartX;

        const deltaY =
          touch.clientY -
          this.touchStartY;

        const duration =
          Date.now() -
          this.touchStartTime;

        const horizontal =
          Math.abs(deltaX) >
          Math.abs(deltaY);

        const distance =
          Math.abs(deltaX) >= 50;

        const fastEnough =
          duration <= 900;

        if (
          !horizontal ||
          !distance ||
          !fastEnough
        ) {
          return;
        }

        if (deltaX < 0) {
          this.next();
        } else {
          this.previous();
        }
      },
      {
        passive: true
      }
    );
  }

  // ==========================================================
  // TECLADO
  // ==========================================================

  setupKeyboard() {

    document.addEventListener(
      'keydown',
      event => {

        const element =
          event.target;

        const typing =
          element &&
          (
            element.tagName ===
              'INPUT' ||
            element.tagName ===
              'TEXTAREA' ||
            element.tagName ===
              'SELECT' ||
            element.isContentEditable
          );

        if (typing) {
          return;
        }

        if (
          event.key ===
          'ArrowRight'
        ) {
          event.preventDefault();
          this.next();
        }

        if (
          event.key ===
          'ArrowLeft'
        ) {
          event.preventDefault();
          this.previous();
        }
      }
    );
  }

  // ==========================================================
  // HASH
  // ==========================================================

  setupHash() {

    window.addEventListener(
      'hashchange',
      () => {
        this.goToHash();
      }
    );
  }

  goToInitialScreen() {

    const hash =
      window.location.hash
        .replace(
          '#',
          ''
        )
        .trim();

    if (!hash) {
      this.goTo(
        0,
        false
      );

      return;
    }

    const index =
      this.screens.findIndex(
        screen =>
          screen.id === hash ||
          screen.dataset.screen === hash
      );

    if (index === -1) {

      this.goTo(
        0,
        false
      );

      return;
    }

    this.goTo(
      index,
      false
    );
  }

  goToHash() {

    const hash =
      window.location.hash
        .replace(
          '#',
          ''
        )
        .trim();

    if (!hash) {
      return;
    }

    const index =
      this.screens.findIndex(
        screen =>
          screen.id === hash ||
          screen.dataset.screen === hash
      );

    if (index !== -1) {
      this.goTo(index);
    }
  }

  updateHash() {

    const screen =
      this.screens[
        this.currentIndex
      ];

    if (!screen) {
      return;
    }

    const hash =
      screen.id ||
      screen.dataset.screen;

    if (!hash) {
      return;
    }

    const newHash =
      `#${hash}`;

    if (
      window.location.hash !==
      newHash
    ) {
      history.replaceState(
        null,
        '',
        newHash
      );
    }
  }

  // ==========================================================
  // RESIZE
  // ==========================================================

  setupResize() {

    let timeout = null;

    window.addEventListener(
      'resize',
      () => {

        clearTimeout(timeout);

        timeout =
          setTimeout(
            () => {

              this.goTo(
                this.currentIndex,
                false
              );

            },
            150
          );
      }
    );
  }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

window.NavigationManager =
  NavigationManager;

new NavigationManager();
