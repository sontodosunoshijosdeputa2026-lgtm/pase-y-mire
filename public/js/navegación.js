// Navegación lateral con scroll suave
class NavigationManager {
  constructor() {
    this.screens = [];
    this.currentIndex = 0;
    this.isAnimating = false;
    this.init();
  }

  init() {
    this.setupScreens();
    this.setupNavigation();
    this.setupSwipe();
    this.setupKeyboard();
    this.setupHashRouting();
  }

  setupScreens() {
    this.screens = document.querySelectorAll('.screen');
    if (this.screens.length === 0) return;

    // Configurar contenedor
    const container = document.querySelector('.screens-container');
    if (container) {
      container.style.display = 'flex';
      container.style.flexDirection = 'row';
      container.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      
      this.screens.forEach((screen, index) => {
        screen.style.flex = '0 0 100%';
        screen.style.width = '100%';
        screen.style.overflowY = 'auto';
        screen.style.padding = '20px';
        screen.style.boxSizing = 'border-box';
      });
    }

    // Mostrar pantalla inicial
    this.goTo(0, false);
  }

  setupNavigation() {
    // Botones de navegación
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = btn.dataset.nav;
        const index = this.getScreenIndex(target);
        if (index !== -1) {
          this.goTo(index);
          this.updateActiveNav(btn);
        }
      });
    });

    // Botones de navegación lateral (flechas)
    document.querySelector('[data-nav="prev"]')?.addEventListener('click', () => {
      this.goTo(this.currentIndex - 1);
    });

    document.querySelector('[data-nav="next"]')?.addEventListener('click', () => {
      this.goTo(this.currentIndex + 1);
    });
  }

  setupSwipe() {
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    const container = document.querySelector('.screens-container');
    if (!container) return;

    container.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwiping = false;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      const diffX = touchStartX - e.touches[0].clientX;
      const diffY = touchStartY - e.touches[0].clientY;
      
      if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
        isSwiping = true;
        e.preventDefault();
      }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
      if (!isSwiping) return;
      
      const diffX = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diffX) > 50) {
        this.goTo(this.currentIndex + (diffX > 0 ? 1 : -1));
      }
    }, { passive: true });
  }

  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.goTo(this.currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.goTo(this.currentIndex + 1);
      }
    });
  }

  setupHashRouting() {
    // Navegar por hash en la URL
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1);
      const index = this.getScreenIndex(hash);
      if (index !== -1) {
        this.goTo(index);
      }
    });

    // Si hay hash al cargar
    if (window.location.hash) {
      const hash = window.location.hash.slice(1);
      const index = this.getScreenIndex(hash);
      if (index !== -1) {
        setTimeout(() => this.goTo(index, false), 100);
      }
    }
  }

  goTo(index, animate = true) {
    if (this.isAnimating) return;
    if (index < 0 || index >= this.screens.length) return;

    this.currentIndex = index;
    this.isAnimating = true;

    const container = document.querySelector('.screens-container');
    if (container) {
      container.style.transform = `translateX(-${index * 100}%)`;
    }

    // Actualizar hash
    const screenId = this.screens[index]?.id || '';
    if (screenId && history.pushState) {
      history.pushState(null, '', `#${screenId}`);
    }

    // Actualizar navegación activa
    const navButtons = document.querySelectorAll('[data-nav]');
    navButtons.forEach(btn => {
      const target = btn.dataset.nav;
      const btnIndex = this.getScreenIndex(target);
      btn.classList.toggle('active', btnIndex === index);
    });

    // Disparar evento
    const event = new CustomEvent('screenchange', {
      detail: { index, screenId: screenId || '' }
    });
    document.dispatchEvent(event);

    setTimeout(() => {
      this.isAnimating = false;
    }, animate ? 500 : 0);
  }

  getScreenIndex(target) {
    // Por nombre
    if (typeof target === 'string') {
      const screen = document.getElementById(target);
      if (screen) return Array.from(this.screens).indexOf(screen);
    }
    // Por índice
    if (typeof target === 'number') {
      return target >= 0 && target < this.screens.length ? target : -1;
    }
    return -1;
  }

  updateActiveNav(activeBtn) {
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.classList.toggle('active', btn === activeBtn);
    });
  }

  // Métodos públicos
  next() {
    this.goTo(this.currentIndex + 1);
  }

  prev() {
    this.goTo(this.currentIndex - 1);
  }

  goToScreen(screenId) {
    const index = this.getScreenIndex(screenId);
    if (index !== -1) this.goTo(index);
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  window.navigation = new NavigationManager();
});
