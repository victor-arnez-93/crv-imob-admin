/* ============================================================
   CRV IMOB — IMOVEIS.JS
   Listagem · Filtros · Cadastro · Edição via Supabase
   ============================================================ */

(() => {
  'use strict';

  const client = window.CRV_SUPABASE;
  const grid = document.getElementById('propertyGrid');
  const modal = document.getElementById('propertyModal');
  const form = document.getElementById('propertyForm');
  const searchInput = document.getElementById('propertySearch');
  const statusFilter = document.getElementById('statusFilter');

  let context = null;
  let properties = [];

  const statusLabels = {
    published: 'Publicado',
    draft: 'Rascunho',
    sold: 'Vendido'
  };

  function showToast(message, error = false) {
    const toast = document.getElementById('toast');

    if (!toast) {
      return;
    }

    toast.textContent = message;
    toast.classList.toggle('is-error', error);
    toast.classList.add('is-visible');

    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2700);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function parseCurrency(value) {
    return Number(
      String(value || '')
        .replace(/[^\d,.-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
    ) || 0;
  }

  function propertyIcon(type) {
    const value = String(type || '').toLowerCase();

    if (value.includes('apartamento')) {
      return 'fa-building';
    }

    if (value.includes('terreno')) {
      return 'fa-mountain-sun';
    }

    return 'fa-house';
  }

  function renderProperties() {
    const term = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;

    const filtered = properties.filter((property) => {
      const searchable = [
        property.title,
        property.reference_code,
        property.location,
        property.property_type
      ].join(' ').toLowerCase();

      const matchesSearch = !term || searchable.includes(term);
      const matchesStatus = selectedStatus === 'all' || property.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });

    document.getElementById('propertyCount').textContent = filtered.length;

    if (!filtered.length) {
      grid.innerHTML = `
        <article class="property-card" style="grid-column: 1 / -1;">
          <div class="empty-state">
            <i class="fa-regular fa-building"></i>
            <span>Nenhum imóvel encontrado.</span>
          </div>
        </article>
      `;
      return;
    }

    grid.innerHTML = filtered.map((property, index) => `
      <article class="property-card" data-id="${property.id}">
        <div class="card-media ${index % 3 === 1 ? 'alt' : index % 3 === 2 ? 'terrain' : ''}">
          <i class="fa-solid ${propertyIcon(property.property_type)}"></i>

          ${property.is_featured ? `
            <span class="featured">
              <i class="fa-solid fa-star"></i>
              Destaque
            </span>
          ` : ''}

          <span class="status ${property.status}">
            ${statusLabels[property.status] || property.status}
          </span>
        </div>

        <div class="card-body">
          <span class="card-code">
            ${property.reference_code || 'SEM REF.'} · ${property.property_type || 'Imóvel'}
          </span>

          <h2>${property.title}</h2>

          <span class="card-location">
            <i class="fa-solid fa-location-dot"></i>
            ${property.location || 'Localização não informada'}
          </span>

          <div class="card-features">
            ${property.bedrooms ? `<span><i class="fa-solid fa-bed"></i>${property.bedrooms}</span>` : ''}
            ${property.bathrooms ? `<span><i class="fa-solid fa-bath"></i>${property.bathrooms}</span>` : ''}
            ${property.parking_spaces ? `<span><i class="fa-solid fa-car"></i>${property.parking_spaces}</span>` : ''}
            <span><i class="fa-solid fa-ruler-combined"></i>${property.area_m2 || 0} m²</span>
          </div>

          <div class="card-bottom">
            <div class="card-price">
              <small>Valor</small>
              <strong>${formatCurrency(property.price)}</strong>
            </div>

            <div class="card-actions">
              <button class="icon-button edit-property" type="button" aria-label="Editar imóvel">
                <i class="fa-solid fa-pen"></i>
              </button>
            </div>
          </div>
        </div>
      </article>
    `).join('');
  }

  function openModal(property = null) {
    form.reset();
    form.dataset.editId = property?.id || '';

    document.getElementById('modalTitle').textContent = property
      ? 'Editar imóvel'
      : 'Novo imóvel';

    if (property) {
      form.elements.title.value = property.title || '';
      form.elements.reference.value = property.reference_code || '';
      form.elements.type.value = property.property_type || '';
      form.elements.price.value = formatCurrency(property.price);
      form.elements.status.value = property.status || 'draft';
      form.elements.location.value = property.location || '';
      form.elements.bedrooms.value = property.bedrooms || 0;
      form.elements.bathrooms.value = property.bathrooms || 0;
      form.elements.parking.value = property.parking_spaces || 0;
      form.elements.area.value = property.area_m2 || 0;
      form.elements.featured.checked = Boolean(property.is_featured);
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  async function loadProperties() {
    if (!client || !context?.profile.organizationId) {
      properties = [];
      renderProperties();
      return;
    }

    const { data, error } = await client
      .from('properties')
      .select('*')
      .eq('organization_id', context.profile.organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Falha ao carregar imóveis:', error.message);
      showToast('Não foi possível carregar os imóveis.', true);
      properties = [];
      renderProperties();
      return;
    }

    properties = data || [];
    renderProperties();

    const editId = new URLSearchParams(window.location.search).get('edit');
    const editProperty = properties.find((item) => item.id === editId);

    if (editProperty) {
      openModal(editProperty);
    }
  }

  async function saveProperty(event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!client || !context?.profile.organizationId) {
      showToast('Supabase ou empresa atual ainda não configurados.', true);
      return;
    }

    const formData = new FormData(form);
    const editId = form.dataset.editId;

    const payload = {
      organization_id: context.profile.organizationId,
      title: formData.get('title').trim(),
      reference_code: formData.get('reference').trim(),
      property_type: formData.get('type'),
      location: formData.get('location').trim(),
      price: parseCurrency(formData.get('price')),
      status: formData.get('status'),
      is_featured: formData.get('featured') === 'on',
      bedrooms: Number(formData.get('bedrooms') || 0),
      bathrooms: Number(formData.get('bathrooms') || 0),
      parking_spaces: Number(formData.get('parking') || 0),
      area_m2: Number(formData.get('area') || 0)
    };

    const query = editId
      ? client.from('properties').update(payload).eq('id', editId).eq('organization_id', context.profile.organizationId)
      : client.from('properties').insert(payload);

    const { error } = await query;

    if (error) {
      console.error('Falha ao salvar imóvel:', error.message);
      showToast('Não foi possível salvar o imóvel.', true);
      return;
    }

    closeModal();
    showToast(editId ? 'Imóvel atualizado com sucesso.' : 'Imóvel cadastrado com sucesso.');
    await loadProperties();
  }

  document.getElementById('newProperty')?.addEventListener('click', () => openModal());

  document.querySelectorAll('[data-close-modal]').forEach((element) => {
    element.addEventListener('click', closeModal);
  });

  searchInput.addEventListener('input', renderProperties);
  statusFilter.addEventListener('change', renderProperties);
  form.addEventListener('submit', saveProperty);

  grid.addEventListener('click', (event) => {
    const editButton = event.target.closest('.edit-property');
    const card = event.target.closest('.property-card');

    if (!editButton || !card) {
      return;
    }

    const property = properties.find((item) => item.id === card.dataset.id);

    if (property) {
      openModal(property);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  window.CRV_SHELL_READY?.then(async (shellContext) => {
    if (!shellContext) {
      return;
    }

    context = shellContext;

    const params = new URLSearchParams(window.location.search);
    searchInput.value = params.get('search') || '';

    if (params.get('filter') === 'featured') {
      searchInput.value = '';
    }

    await loadProperties();

    if (params.get('action') === 'new') {
      openModal();
    }
  });
})();

