/* ============================================================
   CRV IMOB — LANDING.JS
   Header · Navegação · Animações sutis
   ============================================================ */

(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initHeader() {
    const header = document.getElementById('landingHeader');

    if (!header) {
      return;
    }

    const updateHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 18);
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  function initSmoothLinks() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const target = document.querySelector(link.getAttribute('href'));

        if (!target) {
          return;
        }

        event.preventDefault();
        target.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'start'
        });
      });
    });
  }

  function initAnimations() {
    if (reducedMotion || !window.gsap || !window.ScrollTrigger) {
      return;
    }

    window.gsap.registerPlugin(window.ScrollTrigger);

    window.gsap.from('.hero-animate', {
      opacity: 0,
      y: 24,
      duration: 0.85,
      stagger: 0.1,
      ease: 'power3.out'
    });

    window.gsap.to('.preview-window', {
      y: -12,
      duration: 3.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    window.gsap.utils.toArray('.reveal-item').forEach((element) => {
      window.gsap.from(element, {
        opacity: 0,
        y: 28,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 88%',
          once: true
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initSmoothLinks();
    initAnimations();
  });
})();

