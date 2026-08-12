// ============================================================
// PASE Y MIRE
// Navegación lateral por pantallas
// ============================================================

class NavigationManager {
  constructor() {
    this.container = null;
    this.screens = [];
    this.indicator = null;
    this.currentIndex = 0;
    this.isAnimating = false;
    this.isInitialized = false;

    this.init();
  }

  // ==========================================================
  // INICIALIZACIÓN
  // ==========================================================

  init() {
    if (this.isInitialized) {
      return;
    }

    this.container =
      document.querySelector('.screens-container');

    if (!this.container) {
      console.warn(
        'NavigationManager: no existe .screens-container'
      );
      return;
    }

    this.screens = Array.from(
      this.container.querySelectorAll('.screen')
    );

    if (this.screens.length === 0) {
      console.warn(
        'NavigationManager: no existen pantallas .screen'
      );
      return;
    }

    this.isInitialized = true;

    this.configureContainer();
    this.configureScreens();
    this.createIndicator();
    this.setupNavigation();
    this.setupSwipe();
    this.setupKeyboard();
    this.setupHashRouting();
    this.setupResize();

    this.goToHashOrFirst(false);
  }

  // ==========================================================
  // CONTENEDOR
  // ==========================================================

  configureContainer() {
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'row';
    this.container.style.flexWrap = 'nowrap';
    this.container.style.width = '100%';
    this.container.style.height = '100vh';
    this.container.style.overflowX = 'hidden';
    this.container.style.overflowY = 'hidden';
    this.container.style.scrollBehavior = 'auto';
    this.container.style.touchAction = 'pan-y';
  }

  // ==========================================================
  // PANTALLAS
  // ==========================================================

  configureScreens() {
    this.screens.forEach(screen => {
      screen.style.flex = '0 0 100%';
      screen.style.width = '100%';
      screen.style.minWidth = '100%';
      screen.style.height = '100vh';
      screen.style.overflowY = 'auto';
      screen.style.overflowX = 'hidden';
      screen.style.boxSizing = 'border-box';
      screen.style.scrollSnapAlign = 'start';
    });

    this.container.style.scrollSnapType =
      'x mandatory';
  }

  // ==========================================================
  // INDICADOR
  // ==========================================================

  createIndicator() {
    this.indicator =
      document.querySelector(
        '.navigation-indicator'
      );

    if (!this.indicator) {
      this.indicator =
        document.createElement('div');

      this.indicator.className =
        'navigation-indicator';

      this.indicator.setAttribute(
        'aria-label',
        'Navegación de pantallas'
      );

      document.body.appendChild(
        this.indicator
      );
    }

    this.indicator.innerHTML = '';

    this.screens.forEach(
      (screen, index) => {
        const button =
          document.createElement('button');

        button.type = 'button';

        button.className =
          'navigation-dot';

        button.dataset.index =
          String(index);

        button.setAttribute(
          'aria-label',
          `Ir a ${this.getScreenTitle(screen, index)}`
        );

        button.addEventListener(
          'click',
          () => {
            this.goTo(index);
          }
        );

        this.indicator.appendChild(
          button
        );
      }
    );

    this.updateIndicator();
  }

  getScreenTitle(screen, index) {
    return (
      screen.dataset.title ||
      screen.id ||
      `Pantalla ${index + 1}`
    );
  }

  updateIndicator() {
    if (!this.indicator) {
      return;
    }

    const dots =
      this.indicator.querySelectorAll(
        '.navigation-dot'
      );

    dots.forEach((dot, index) => {
      const active =
        index === this.currentIndex;

      dot.classList.toggle(
        'active',
        active
      );

      dot.setAttribute(
        'aria-current',
        active
          ? 'page'
          : 'false'
      );
    });
  }

  // ==========================================================
  // NAVEGACIÓN
  // ==========================================================

  setupNavigation() {
    document.addEventListener(
      'click',
      event => {
        const target =
          event.target.closest(
            '[data-screen-index]'
          );

        if (!target) {
          return;
        }

        const index =
          Number(
            target.dataset.screenIndex
          );

        if (
          Number.isInteger(index) &&
          index >= 0 &&
          index < this.screens.length
        ) {
          event.preventDefault();
          this.goTo(index);
        }
      }
    );

    this.container.addEventListener(
      'scroll',
      () => {
        if (this.isAnimating) {
          return;
        }

        this.detectCurrentScreen();
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

      this.updateIndicator();
      this.updateHash();
    }
  }

  goTo(index, smooth = true) {
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

    this.currentIndex = index;

    this.updateIndicator();
    this.updateHash();

    const left =
      this.screens[index].offsetLeft;

    this.isAnimating = true;

    this.container.scrollTo({
      left,
      behavior:
        smooth
          ? 'smooth'
          : 'auto'
    });

    window.setTimeout(
      () => {
        this.isAnimating = false;
        this.detectCurrentScreen();
      },
      smooth ? 450 : 0
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
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    this.container.addEventListener(
      'touchstart',
      event => {
        if (!event.touches.length) {
          return;
        }

        const touch =
          event.touches[0];

        startX = touch.clientX;
        startY = touch.clientY;
        startTime =
          Date.now();
      },
      {
        passive: true
      }
    );

    this.container.addEventListener(
      'touchend',
      event => {
        if (!event.changedTouches.length) {
          return;
        }

        const touch =
          event.changedTouches[0];

        const deltaX =
          touch.clientX - startX;

        const deltaY =
          touch.clientY - startY;

        const duration =
          Date.now() - startTime;

        const horizontal =
          Math.abs(deltaX) >
          Math.abs(deltaY);

        const validDistance =
          Math.abs(deltaX) >= 50;

        const validDuration =
          duration <= 800;

        if (
          !horizontal ||
          !validDistance ||
          !validDuration
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
        const tag =
          event.target?.tagName;

        const typing =
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          event.target?.isContentEditable;

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

  setupHashRouting() {
    window.addEventListener(
      'hashchange',
      () => {
        this.goToHash(true);
      }
    );
  }

  goToHashOrFirst(smooth) {
    const handled =
      this.goToHash(smooth);

    if (!handled) {
      this.goTo(
        0,
        smooth
      );
    }
  }

  goToHash(smooth = true) {
    const hash =
      window.location.hash
        .replace('#', '')
        .trim();

    if (!hash) {
      return false;
    }

    const index =
      this.screens.findIndex(
        screen =>
          screen.id === hash ||
          screen.dataset.screen === hash
      );

    if (index === -1) {
      return false;
    }

    this.goTo(
      index,
      smooth
    );

    return true;
  }

  updateHash() {
    const screen =
      this.screens[
        this.currentIndex
      ];

    if (!screen) {
      return;
    }

    const value =
      screen.id ||
      screen.dataset.screen;

    if (!value) {
      return;
    }

    const newHash =
      `#${value}`;

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
        window.clearTimeout(
          timeout
        );

        timeout =
          window.setTimeout(
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
// INICIO
// ============================================================

document.addEventListener(
  'DOMContentLoaded',
  () => {
    window.navigationManager =
      new NavigationManager();
  }
);
