/* ============================================================
   CRV IMOB — CONFIGURACOES.JS
   Preferências reais da organização no Supabase
   ============================================================ */

(() => {
  'use strict';

  const client = window.CRV_SUPABASE;
  const form = document.getElementById('settingsForm');
  const tabs = document.querySelectorAll('[data-tab]');
  const panels = document.querySelectorAll('[data-panel]');

  let context = null;

  function showToast(message, error = false) {
    const toast = document.getElementById('toast');

    toast.textContent = message;
    toast.classList.toggle('is-error', error);
    toast.classList.add('is-visible');

    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2700);
  }

  function setFormData(organization) {
    if (!organization) {
      return;
    }

    form.elements.businessName.value = organization.name || '';
    form.elements.businessType.value = organization.business_type || 'Corretor autônomo';
    form.elements.creci.value = organization.creci || '';
    form.elements.description.value = organization.description || '';
    form.elements.whatsapp.value = organization.whatsapp || '';
    form.elements.phone.value = organization.phone || '';
    form.elements.email.value = organization.email || '';
    form.elements.address.value = organization.address || '';
    form.elements.siteUrl.value = organization.site_url || '';
    form.elements.featuredLimit.value = String(organization.featured_limit || 3);
    form.elements.defaultStatus.value = organization.default_status === 'published'
      ? 'Publicado'
      : 'Rascunho';
    form.elements.showPrices.checked = organization.show_prices !== false;
  }

  async function loadSettings() {
    if (!client || !context?.profile.organizationId) {
      return;
    }

    const { data, error } = await client
      .from('organizations')
      .select('*')
      .eq('id', context.profile.organizationId)
      .maybeSingle();

    if (error) {
      console.error('Falha ao carregar configurações:', error.message);
      showToast('Não foi possível carregar as configurações.', true);
      return;
    }

    setFormData(data);
  }

  async function saveSettings(event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!client || !context?.profile.organizationId) {
      showToast('Supabase ou empresa atual ainda não configurados.', true);
      return;
    }

    const payload = {
      name: form.elements.businessName.value.trim(),
      business_type: form.elements.businessType.value,
      creci: form.elements.creci.value.trim(),
      description: form.elements.description.value.trim(),
      whatsapp: form.elements.whatsapp.value.trim(),
      phone: form.elements.phone.value.trim(),
      email: form.elements.email.value.trim(),
      address: form.elements.address.value.trim(),
      site_url: form.elements.siteUrl.value.trim(),
      featured_limit: Number(form.elements.featuredLimit.value),
      default_status: form.elements.defaultStatus.value === 'Publicado' ? 'published' : 'draft',
      show_prices: form.elements.showPrices.checked
    };

    const { error } = await client
      .from('organizations')
      .update(payload)
      .eq('id', context.profile.organizationId);

    if (error) {
      console.error('Falha ao salvar configurações:', error.message);
      showToast('Não foi possível salvar as configurações.', true);
      return;
    }

    document.getElementById('settingsFeedback').textContent = 'Alterações salvas.';
    showToast('Configurações atualizadas com sucesso.');
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((item) => {
        item.classList.toggle('active', item === tab);
      });

      panels.forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.panel === tab.dataset.tab);
      });
    });
  });

  form.addEventListener('submit', saveSettings);

  window.CRV_SHELL_READY?.then(async (shellContext) => {
    if (!shellContext) {
      return;
    }

    context = shellContext;
    await loadSettings();
  });
})();
