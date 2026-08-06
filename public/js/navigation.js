// Navegación lateral con scroll suave - Sistema completo
class NavigationManager {
  constructor() {
    this.screens = [];
    this.currentIndex = 0;
    this.isAnimating = false;
    this.isInitialized = false;
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.setupScreens();
    this.setupNavigation();
    this.setupSwipe();
    this.setupKeyboard();
    this.setupHashRouting();
    this.setupResize();
    this.setupIndicator();
  }

  /**
   * Configura las pantallas para navegación lateral
   */
  setupScreens() {
    this.screens = document.querySelectorAll('.screen');
    if (this.screens.length === 0) {
      console.warn('No se encontraron pantallas (.screen)');
      return;
    }

    const container = document.querySelector('.screens-container');
    if (!container) {
      console.warn('No se encontró .screens-container');
      return;
    }

    // Configurar contenedor
    container.style.display = 'flex';
    container.style.flexDirection = 'row';
    container.style.flexWrap = 'nowrap';
    container.style.height = '100vh';
    container.style.overflow = 'hidden
