/* ============================================================
   CRV IMOB — ADMIN-SHELL.JS
   Sidebar · Header · Sessão · Modais globais
   ============================================================ */

(() => {
  'use strict';

  const currentPage = document.body.dataset.page || 'dashboard';
  const shell = document.getElementById('adminShell');

  const navigation = [
    {
      id: 'dashboard',
      href: 'dashboard.html',
      icon: 'fa-table-cells-large',
      label: 'Dashboard'
    },
    {
      id: 'imoveis',
      href: 'imoveis.html',
      icon: 'fa-building',
      label: 'Imóveis'
    },
    {
      id: 'configuracoes',
      href: 'configuracoes.html',
      icon: 'fa-sliders',
      label: 'Configurações'
    }
  ];

  function getInitials(value) {
    return String(value || 'Usuário')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  function getFirstName(value) {
    return String(value || 'usuário').trim().split(/\s+/)[0];
  }

  function createShell(profile) {
    const companyInitials = getInitials(profile.companyName);
    const userInitials = getInitials(profile.fullName);

    shell.innerHTML = `
      <aside class="admin-sidebar" id="adminSidebar">
        <div class="sidebar-header">
          <a class="sidebar-logo" href="https://crvsolucoesti.com" target="_blank" rel="noopener" aria-label="Visitar CRV Soluções em TI">
            <img src="assets/img/logo1.png" alt="CRV Soluções em TI">
          </a>

          <button class="sidebar-collapse" id="sidebarCollapse" type="button" aria-label="Recolher menu">
            <i class="fa-solid fa-angles-left"></i>
          </button>
        </div>

        <div class="sidebar-company">
          <span class="company-avatar">${companyInitials}</span>
          <div>
            <strong data-company-name>${profile.companyName}</strong>
            <small data-company-type>${profile.businessType}</small>
          </div>
        </div>

        <nav class="sidebar-nav" aria-label="Navegação administrativa">
          <span class="sidebar-nav-title">Gestão</span>

          ${navigation.map((item) => `
            <a href="${item.href}" class="${currentPage === item.id ? 'active' : ''}">
              <i class="fa-solid ${item.icon}"></i>
              <span>${item.label}</span>
            </a>
          `).join('')}
        </nav>

        <div class="sidebar-bottom">
          <button class="sidebar-logout" type="button" data-open-logout>
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Sair</span>
          </button>

          <a class="sidebar-credit" href="https://crvsolucoesti.com" target="_blank" rel="noopener">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            <span>Desenvolvido pela CRV Soluções em TI</span>
          </a>
        </div>
      </aside>

      <header class="admin-header">
        <div class="header-left">
          <button class="icon-button mobile-menu-button" id="mobileMenu" type="button" aria-label="Abrir menu">
            <i class="fa-solid fa-bars"></i>
          </button>

          <label class="header-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input id="globalSearch" type="search" placeholder="Buscar imóvel...">
          </label>
        </div>

        <div class="header-right">
          <button class="weather-button" id="weatherButton" type="button" aria-expanded="false">
            <i class="fa-solid fa-cloud-sun"></i>
            <span>
              <strong id="weatherTemperature">--°C</strong>
              <small id="weatherLocation">Tatuí, SP</small>
            </span>
          </button>

          <div class="header-clock">
            <strong id="headerTime">--:--</strong>
            <small id="headerDate">--</small>
          </div>

          <button class="icon-button" type="button" data-theme-toggle aria-label="Alternar tema">
            <i class="fa-solid fa-moon"></i>
          </button>

          <button class="user-button" id="userButton" type="button" aria-label="Abrir informações da sessão">
            <span class="session-avatar">${userInitials}</span>
            <div>
              <strong>${profile.fullName}</strong>
              <small>${profile.role}</small>
            </div>
          </button>
        </div>
      </header>

      <section class="weather-popover" id="weatherPopover" aria-hidden="true">
        <div class="weather-popover-header">
          <div>
            <strong>Previsão do tempo</strong>
            <small>Tatuí, São Paulo</small>
          </div>
          <i class="fa-solid fa-cloud-sun"></i>
        </div>

        <div class="weather-days" id="weatherDays">
          <div class="empty-state compact">
            <i class="fa-solid fa-spinner fa-spin"></i>
          </div>
        </div>
      </section>

      <section class="global-modal" id="sessionModal" aria-hidden="true">
        <div class="global-modal-backdrop" data-close-global-modal></div>

        <div class="global-modal-card" role="dialog" aria-modal="true" aria-labelledby="sessionModalTitle">
          <button class="icon-button global-modal-close" type="button" data-close-global-modal aria-label="Fechar">
            <i class="fa-solid fa-xmark"></i>
          </button>

          <span class="global-modal-icon">
            <i class="fa-regular fa-user"></i>
          </span>

          <h2 id="sessionModalTitle">Sua sessão</h2>
          <p>Informações do acesso atual ao CRV Imob.</p>

          <div class="modal-session">
            <span class="session-avatar">${userInitials}</span>
            <div>
              <strong>${profile.fullName}</strong>
              <small>${profile.email}</small>
            </div>
          </div>

          <div class="modal-menu">
            <a href="configuracoes.html">
              <i class="fa-solid fa-sliders"></i>
              Configurações
            </a>

            <button class="danger" type="button" data-open-logout>
              <i class="fa-solid fa-arrow-right-from-bracket"></i>
              Encerrar sessão
            </button>
          </div>
        </div>
      </section>

      <section class="global-modal" id="logoutModal" aria-hidden="true">
        <div class="global-modal-backdrop" data-close-global-modal></div>

        <div class="global-modal-card" role="dialog" aria-modal="true" aria-labelledby="logoutModalTitle">
          <button class="icon-button global-modal-close" type="button" data-close-global-modal aria-label="Fechar">
            <i class="fa-solid fa-xmark"></i>
          </button>

          <span class="global-modal-icon">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </span>

          <h2 id="logoutModalTitle">Encerrar sessão?</h2>
          <p>Você precisará informar seu e-mail e senha novamente para acessar o painel.</p>

          <div class="global-modal-actions">
            <button class="button button-secondary" type="button" data-close-global-modal>
              Cancelar
            </button>

            <button class="button button-primary" id="confirmLogout" type="button">
              <span>Sair</span>
              <i class="fa-solid fa-arrow-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </section>

      <div class="toast" id="globalToast" role="status"></div>
    `;
  }

  function updateClock() {
    const now = new Date();
    const time = document.getElementById('headerTime');
    const date = document.getElementById('headerDate');

    if (time) {
      time.textContent = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    if (date) {
      date.textContent = now.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short'
      }).replace('.', '');
    }
  }

  function openModal(modal) {
    if (!modal) {
      return;
    }

    document.querySelectorAll('.global-modal.is-open').forEach((item) => {
      item.classList.remove('is-open');
      item.setAttribute('aria-hidden', 'true');
    });

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModals() {
    document.querySelectorAll('.global-modal.is-open').forEach((modal) => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    });

    document.body.classList.remove('modal-open');
  }

  function bindShellEvents() {
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const mobileMenu = document.getElementById('mobileMenu');
    const sessionModal = document.getElementById('sessionModal');
    const logoutModal = document.getElementById('logoutModal');
    const globalSearch = document.getElementById('globalSearch');

    if (localStorage.getItem('crv-imob-sidebar') === 'collapsed' && window.innerWidth > 980) {
      document.body.classList.add('sidebar-collapsed');
    }

    sidebarCollapse?.addEventListener('click', () => {
      if (window.innerWidth <= 980) {
        document.body.classList.remove('sidebar-mobile-open');
        return;
      }

      document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem(
        'crv-imob-sidebar',
        document.body.classList.contains('sidebar-collapsed') ? 'collapsed' : 'expanded'
      );
    });

    mobileMenu?.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-mobile-open');
    });

    document.getElementById('userButton')?.addEventListener('click', () => {
      openModal(sessionModal);
    });

    document.querySelectorAll('[data-open-logout]').forEach((button) => {
      button.addEventListener('click', () => openModal(logoutModal));
    });

    document.querySelectorAll('[data-close-global-modal]').forEach((button) => {
      button.addEventListener('click', closeModals);
    });

    document.getElementById('confirmLogout')?.addEventListener('click', async () => {
      await window.CRV_AUTH.signOut();
    });

    globalSearch?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }

      const query = globalSearch.value.trim();

      if (query) {
        window.location.href = `imoveis.html?search=${encodeURIComponent(query)}`;
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeModals();
        document.body.classList.remove('sidebar-mobile-open');
      }
    });
  }

  async function initShell() {
    if (!shell || !window.CRV_AUTH) {
      return null;
    }

    const context = await window.CRV_AUTH.requireSession();

    if (!context) {
      return null;
    }

    createShell(context.profile);
    window.CRV_THEME?.apply(window.CRV_THEME.current(), false);
    bindShellEvents();
    updateClock();
    window.setInterval(updateClock, 30000);

    document.querySelectorAll('[data-user-first-name]').forEach((element) => {
      element.textContent =
        context.profile.companyName ||
        getFirstName(context.profile.fullName);
    });

    window.dispatchEvent(new CustomEvent('crv:shell-ready', {
      detail: context
    }));

    return context;
  }

  window.CRV_SHELL_READY = initShell();
})();
