// Animaciones y micro-interacciones
class AnimationManager {
  constructor() {
    this.init();
  }

  init() {
    this.setupEntranceAnimations();
    this.setupHoverAnimations();
    this.setupScrollAnimations();
    this.setupLoadingAnimations();
  }

  setupEntranceAnimations() {
    // Animar elementos al cargar
    document.querySelectorAll('.animate-on-load').forEach((el, index) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      setTimeout(() => {
        el.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 100 + (index * 80));
    });

    // Animar en secuencia
    document.querySelectorAll('.animate-stagger').forEach((container) => {
      const children = container.children;
      Array.from(children).forEach((child, index) => {
        child.style.opacity = '0';
        child.style.transform = 'translateY(20px)';
        setTimeout(() => {
          child.style.transition = 'all 0.4s ease';
          child.style.opacity = '1';
          child.style.transform = 'translateY(0)';
        }, 100 + (index * 50));
      });
    });
  }

  setupHoverAnimations() {
    // Botones con efecto de escala
    document.querySelectorAll('.btn-animated').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
        btn.style.transition = 'transform 0.2s ease';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
      });
      btn.addEventListener('mousedown', () => {
        btn.style.transform = 'scale(0.95)';
      });
      btn.addEventListener('mouseup', () => {
        btn.style.transform = 'scale(1.05)';
      });
    });

    // Tarjetas con elevación
    document.querySelectorAll('.card-hover').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-8px)';
        card.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)';
        card.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
      });
    });
  }

  setupScrollAnimations() {
    // Intersection Observer para animar al hacer scroll
    const options = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          if (el.dataset.animation) {
            this.playAnimation(el, el.dataset.animation);
          } else {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          }
          observer.unobserve(el);
        }
      });
    }, options);

    // Elementos con clase .animate-on-scroll
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(40px)';
      el.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      observer.observe(el);
    });
  }

  playAnimation(el, animation) {
    const animations = {
      'fade-up': () => {
        el.style.transform = 'translateY(0)';
        el.style.opacity = '1';
      },
      'fade-in': () => {
        el.style.opacity = '1';
      },
      'scale-up': () => {
        el.style.transform = 'scale(1)';
        el.style.opacity = '1';
      },
      'slide-right': () => {
        el.style.transform = 'translateX(0)';
        el.style.opacity = '1';
      },
      'slide-left': () => {
        el.style.transform = 'translateX(0)';
        el.style.opacity = '1';
      }
    };

    // Configurar estado inicial
    const initialStyles = {
      'fade-up': 'translateY(40px)',
      'fade-in': '',
      'scale-up': 'scale(0.8)',
      'slide-right': 'translateX(-40px)',
      'slide-left': 'translateX(40px)'
    };

    el.style.transform = initialStyles[animation] || 'translateY(40px)';
    el.style.opacity = '0';
    el.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    // Ejecutar después de un pequeño delay
    setTimeout(() => {
      if (animations[animation]) {
        animations[animation]();
      } else {
        el.style.transform = 'translateY(0)';
        el.style.opacity = '1';
      }
    }, 100);
  }

  setupLoadingAnimations() {
    // Spinner de carga
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) {
      this.animateSpinner(spinner);
    }

    // Skeleton loading
    document.querySelectorAll('.skeleton').forEach(el => {
      el.style.background = 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)';
      el.style.backgroundSize = '200% 100%';
      el.style.animation = 'shimmer 1.5s infinite';
    });
  }

  animateSpinner(spinner) {
    let rotation = 0;
    setInterval(() => {
      rotation += 360;
      spinner.style.transition = 'transform 0.8s ease';
      spinner.style.transform = `rotate(${rotation}deg)`;
    }, 800);
  }

  // Crear efecto de partículas (background)
  createParticles(container, count = 30) {
    const colors = ['#FFB5C2', '#B5D8EB', '#B5E6C3', '#D4C5F9', '#F9E6B3'];
    
    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 8 + 4}px;
        height: ${Math.random() * 8 + 4}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        opacity: ${Math.random() * 0.5 + 0.2};
        pointer-events: none;
        animation: float ${Math.random() * 20 + 10}s ease-in-out infinite;
        animation-delay: ${Math.random() * 5}s;
      `;
      container.appendChild(particle);
    }
  }

  // Efecto de confeti (para celebraciones)
  createConfetti(container) {
    const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FF9FF3'];
    const count = 100;

    for (let i = 0; i < count; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 4;
      const left = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = Math.random() * 2 + 1;

      confetti.style.cssText = `
        position: fixed;
        width: ${size}px;
        height: ${size * 0.4}px;
        background: ${color};
        left: ${left}%;
        top: -10px;
        transform: rotate(${Math.random() * 360}deg);
        animation: confettiFall ${duration}s ease-in ${delay}s forwards;
        pointer-events: none;
        z-index: 9999;
      `;
      container.appendChild(confetti);
    }

    // Limpiar después de la animación
    setTimeout(() => {
      container.querySelectorAll('.confetti').forEach(el => el.remove());
    }, 4000);
  }
}

// Inyectar keyframes CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @keyframes float {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    25% { transform: translate(10px, -20px) rotate(5deg); }
    50% { transform: translate(-5px, 10px) rotate(-3deg); }
    75% { transform: translate(15px, -5px) rotate(2deg); }
  }

  @keyframes confettiFall {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
`;
document.head.appendChild(styleSheet);

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  window.animations = new AnimationManager();
});
