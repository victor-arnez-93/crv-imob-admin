/* ============================================================
   CRV IMOB — THEME.JS
   Persistência e alternância do tema
   ============================================================ */

(() => {
  'use strict';

  const STORAGE_KEY = 'crv-imob-theme';
  const root = document.documentElement;

  function getInitialTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY);

    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function updateButtons(theme) {
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const nextLabel = theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';
      const icon = theme === 'dark' ? 'fa-sun' : 'fa-moon';

      button.setAttribute('aria-label', nextLabel);
      button.innerHTML = `<i class="fa-solid ${icon}"></i>`;
    });
  }

  function applyTheme(theme, persist = true) {
    root.dataset.theme = theme;
    updateButtons(theme);

    if (persist) {
      localStorage.setItem(STORAGE_KEY, theme);
    }

    window.dispatchEvent(new CustomEvent('crv:theme-changed', {
      detail: { theme }
    }));
  }

  function toggleTheme() {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
  }

  applyTheme(getInitialTheme(), false);

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-theme-toggle]')) {
      toggleTheme();
    }
  });

  window.CRV_THEME = {
    apply: applyTheme,
    toggle: toggleTheme,
    current: () => root.dataset.theme
  };
})();

