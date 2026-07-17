/* ============================================================
   CRV IMOB — DASHBOARD.JS
   Indicadores e imóveis recentes
   ============================================================ */

(() => {
  'use strict';

  const client = window.CRV_SUPABASE;

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function renderRecentProperties(properties) {
    const container = document.getElementById('recentProperties');

    if (!container) {
      return;
    }

    if (!properties.length) {
      container.innerHTML = `
        <div class="empty-state compact">
          <i class="fa-regular fa-building"></i>
          <span>Nenhum imóvel cadastrado ainda.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = properties.map((property) => `
      <a class="recent-property" href="imoveis.html?edit=${property.id}">
        <span class="recent-property-image">
          <i class="fa-solid fa-house"></i>
        </span>

        <div>
          <h3>${property.title}</h3>
          <small>${property.reference_code || 'Sem referência'} · ${property.property_type || 'Imóvel'}</small>
        </div>

        <strong>${formatCurrency(property.price)}</strong>
        <span class="property-status ${property.status}">${property.status === 'published' ? 'Publicado' : 'Rascunho'}</span>
      </a>
    `).join('');
  }

  async function loadDashboard(context) {
    const organizationId = context.profile.organizationId;

    if (!client || !organizationId) {
      renderRecentProperties([]);
      return;
    }

    const { data, error } = await client
      .from('properties')
      .select('id, title, reference_code, property_type, price, status, is_featured, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Falha ao carregar o dashboard:', error.message);
      renderRecentProperties([]);
      return;
    }

    const properties = data || [];
    const published = properties.filter((item) => item.status === 'published').length;
    const featured = properties.filter((item) => item.is_featured).length;

    document.querySelector('[data-stat-properties]').textContent = properties.length;
    document.querySelector('[data-stat-published]').textContent = published;
    document.querySelector('[data-stat-featured]').textContent = featured;

    renderRecentProperties(properties.slice(0, 4));
  }

  window.CRV_SHELL_READY?.then((context) => {
    if (context) {
      loadDashboard(context);
    }
  });
})();
