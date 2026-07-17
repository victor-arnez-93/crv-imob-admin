/* ============================================================
   CRV IMOB — IMOVEIS.JS
   CRUD · Storage · Filtros · Modais · Integração pública
   ============================================================ */

(() => {
  'use strict';

  const STORAGE_BUCKET = 'property-images';
  const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const client = window.CRV_SUPABASE;

  const state = {
    auth: null,
    organizationId: '',
    properties: [],
    imagesByProperty: new Map(),
    selectedCover: null,
    selectedGallery: [],
    deletedImages: [],
    pendingDeleteId: null,
    toastTimer: null
  };

  const elements = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheElements();
    bindEvents();
    initCurrencyInputs();

    if (!client || !window.CRV_AUTH) {
      renderCatalogError('A conexão com o Supabase não está configurada.');
      return;
    }

    state.auth = await window.CRV_AUTH.requireSession();

    if (!state.auth) {
      return;
    }

    state.organizationId = state.auth.profile?.organizationId || '';

    if (!state.organizationId) {
      renderCatalogError('O usuário atual ainda não está vinculado a uma organização.');
      return;
    }

    await loadProperties();
  }

  function cacheElements() {
    elements.grid = document.getElementById('propertyGrid');
    elements.count = document.getElementById('propertyCount');
    elements.search = document.getElementById('propertySearch');
    elements.statusFilter = document.getElementById('statusFilter');
    elements.clearFilters = document.getElementById('clearFilters');
    elements.newProperty = document.getElementById('newProperty');
    elements.propertyModal = document.getElementById('propertyModal');
    elements.propertyForm = document.getElementById('propertyForm');
    elements.modalTitle = document.getElementById('modalTitle');
    elements.saveProperty = document.getElementById('saveProperty');
    elements.coverInput = document.getElementById('coverImage');
    elements.galleryInput = document.getElementById('galleryImages');
    elements.coverPreviewBlock = document.getElementById('coverPreviewBlock');
    elements.coverPreview = document.getElementById('coverPreview');
    elements.galleryPreviewBlock = document.getElementById('galleryPreviewBlock');
    elements.galleryPreview = document.getElementById('galleryPreview');
    elements.existingImagesBlock = document.getElementById('existingImagesBlock');
    elements.existingImages = document.getElementById('existingImages');
    elements.deleteModal = document.getElementById('deleteModal');
    elements.confirmDelete = document.getElementById('confirmDelete');
    elements.toast = document.getElementById('toast');
  }

  function bindEvents() {
    elements.newProperty?.addEventListener('click', () => openPropertyModal());
    elements.propertyForm?.addEventListener('submit', saveProperty);
    elements.search?.addEventListener('input', renderProperties);
    elements.statusFilter?.addEventListener('change', renderProperties);
    elements.clearFilters?.addEventListener('click', clearFilters);
    elements.coverInput?.addEventListener('change', selectCoverImage);
    elements.galleryInput?.addEventListener('change', selectGalleryImages);
    elements.grid?.addEventListener('click', handleGridAction);
    elements.existingImages?.addEventListener('click', markExistingImageForDeletion);
    elements.confirmDelete?.addEventListener('click', deleteProperty);

    document.querySelectorAll('[data-close-property-modal]').forEach((button) => {
      button.addEventListener('click', closePropertyModal);
    });

    document.querySelectorAll('[data-close-delete-modal]').forEach((button) => {
      button.addEventListener('click', closeDeleteModal);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;

      if (elements.deleteModal?.classList.contains('is-open')) {
        closeDeleteModal();
        return;
      }

      if (elements.propertyModal?.classList.contains('is-open')) {
        closePropertyModal();
      }
    });
  }

  async function loadProperties() {
    renderLoading();

    try {
      const { data: properties, error: propertiesError } = await client
        .from('properties')
        .select('*')
        .eq('organization_id', state.organizationId)
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;

      const propertyIds = (properties || []).map((property) => property.id);
      let images = [];

      if (propertyIds.length) {
        const { data: imageRows, error: imagesError } = await client
          .from('property_images')
          .select('id, organization_id, property_id, storage_path, alt_text, sort_order, is_cover')
          .in('property_id', propertyIds)
          .order('sort_order', { ascending: true });

        if (imagesError) throw imagesError;
        images = imageRows || [];
      }

      state.properties = properties || [];
      state.imagesByProperty = groupImages(images);
      renderProperties();
    } catch (error) {
      console.error('[CRV Imob] Falha ao carregar imóveis:', error);
      renderCatalogError(friendlyError(error));
    }
  }

  function groupImages(images) {
    const grouped = new Map();

    images.forEach((image) => {
      const current = grouped.get(image.property_id) || [];
      current.push({
        ...image,
        publicUrl: publicImageUrl(image.storage_path)
      });
      grouped.set(image.property_id, current);
    });

    return grouped;
  }

  function renderProperties() {
    if (!elements.grid) return;

    const searchTerm = normalizeText(elements.search?.value || '');
    const selectedStatus = elements.statusFilter?.value || 'all';

    const filtered = state.properties.filter((property) => {
      const searchable = normalizeText([
        property.title,
        property.reference_code,
        property.location,
        property.property_type
      ].filter(Boolean).join(' '));

      const matchesSearch = !searchTerm || searchable.includes(searchTerm);
      const matchesStatus = selectedStatus === 'all' || property.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });

    if (elements.count) {
      elements.count.textContent = String(filtered.length);
    }

    if (!filtered.length) {
      elements.grid.innerHTML = `
        <div class="catalog-empty">
          <i class="fa-regular fa-building"></i>
          <strong>${state.properties.length ? 'Nenhum imóvel encontrado' : 'Seu catálogo está vazio'}</strong>
          <p>${state.properties.length ? 'Ajuste a busca ou limpe os filtros para visualizar outros imóveis.' : 'Cadastre o primeiro imóvel para começar a publicar suas oportunidades.'}</p>
        </div>
      `;
      return;
    }

    elements.grid.innerHTML = filtered.map(createPropertyCard).join('');
  }

  function createPropertyCard(property) {
    const images = state.imagesByProperty.get(property.id) || [];
    const cover = getCoverImage(property, images);
    const imageMarkup = cover
      ? `<img src="${escapeAttribute(cover)}" alt="${escapeAttribute(property.title)}" loading="lazy">`
      : `
        <div class="card-media-placeholder">
          <i class="fa-regular fa-image"></i>
          <span>Sem imagem de capa</span>
        </div>
      `;

    return `
      <article class="property-card" data-property-id="${escapeAttribute(property.id)}">
        <div class="card-media">
          ${imageMarkup}
          ${property.is_featured ? '<span class="featured"><i class="fa-solid fa-star"></i> Destaque</span>' : ''}
          <span class="status ${escapeAttribute(property.status)}">${escapeHtml(statusLabel(property.status))}</span>
        </div>

        <div class="card-body">
          <span class="card-code">${escapeHtml(property.reference_code)}</span>
          <h2 title="${escapeAttribute(property.title)}">${escapeHtml(property.title)}</h2>
          <div class="card-location">
            <i class="fa-solid fa-location-dot"></i>
            <span>${escapeHtml(property.location || 'Localização não informada')}</span>
          </div>

          <div class="card-features">
            <span><i class="fa-solid fa-bed"></i>${formatNumber(property.bedrooms)}</span>
            <span><i class="fa-solid fa-bath"></i>${formatNumber(property.bathrooms)}</span>
            <span><i class="fa-solid fa-car"></i>${formatNumber(property.parking_spaces)}</span>
            <span><i class="fa-solid fa-ruler-combined"></i>${formatNumber(property.area_m2)} m²</span>
          </div>

          <div class="card-bottom">
            <div class="card-price">
              <small>Valor</small>
              <strong>${formatCurrency(property.price)}</strong>
            </div>

            <div class="card-actions">
              <button class="card-action" type="button" data-action="edit" data-property-id="${escapeAttribute(property.id)}" aria-label="Editar ${escapeAttribute(property.title)}">
                <i class="fa-solid fa-pen"></i>
              </button>

              <button class="card-action delete" type="button" data-action="delete" data-property-id="${escapeAttribute(property.id)}" aria-label="Excluir ${escapeAttribute(property.title)}">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function handleGridAction(event) {
    const button = event.target.closest('[data-action][data-property-id]');
    if (!button) return;

    const propertyId = button.dataset.propertyId;

    if (button.dataset.action === 'edit') {
      openPropertyModal(propertyId);
    }

    if (button.dataset.action === 'delete') {
      openDeleteModal(propertyId);
    }
  }

  function openPropertyModal(propertyId = '') {
    resetPropertyForm();

    const property = state.properties.find((item) => item.id === propertyId);

    if (property) {
      elements.modalTitle.textContent = 'Editar imóvel';
      populatePropertyForm(property);
      renderExistingImages(property.id);
    } else {
      elements.modalTitle.textContent = 'Novo imóvel';
    }

    openModal(elements.propertyModal);
    window.setTimeout(() => elements.propertyForm?.elements.title?.focus(), 120);
  }

  function closePropertyModal() {
    closeModal(elements.propertyModal);
    resetPropertyForm();
  }

  function resetPropertyForm() {
    elements.propertyForm?.reset();

    if (elements.propertyForm) {
      elements.propertyForm.elements.property_id.value = '';
      elements.propertyForm.elements.status.value = 'draft';
      elements.propertyForm.elements.purpose.value = 'Venda';
    }

    state.selectedCover = null;
    state.selectedGallery = [];
    state.deletedImages = [];

    elements.coverPreview?.replaceChildren();
    elements.galleryPreview?.replaceChildren();
    elements.existingImages?.replaceChildren();

    toggleHidden(elements.coverPreviewBlock, true);
    toggleHidden(elements.galleryPreviewBlock, true);
    toggleHidden(elements.existingImagesBlock, true);
    setButtonLoading(elements.saveProperty, false, 'Salvar imóvel', 'fa-floppy-disk');
  }

  function populatePropertyForm(property) {
    const form = elements.propertyForm.elements;

    form.property_id.value = property.id;
    form.title.value = property.title || '';
    form.reference_code.value = property.reference_code || '';
    form.property_type.value = property.property_type || '';
    form.purpose.value = property.purpose || 'Venda';
    form.status.value = property.status || 'draft';
    form.location.value = property.location || '';
    form.description.value = property.description || '';
    form.price.value = formatCurrencyInputValue(property.price);
    form.condominium_fee.value = formatCurrencyInputValue(property.condominium_fee);
    form.property_tax.value = formatCurrencyInputValue(property.property_tax);
    form.bedrooms.value = Number(property.bedrooms || 0);
    form.suites.value = Number(property.suites || 0);
    form.bathrooms.value = Number(property.bathrooms || 0);
    form.parking_spaces.value = Number(property.parking_spaces || 0);
    form.area_m2.value = Number(property.area_m2 || 0);
    form.land_area_m2.value = Number(property.land_area_m2 || 0);
    form.features.value = Array.isArray(property.features) ? property.features.join(', ') : '';
    form.is_featured.checked = Boolean(property.is_featured);
  }

  async function saveProperty(event) {
    event.preventDefault();

    if (!elements.propertyForm.checkValidity()) {
      elements.propertyForm.reportValidity();
      return;
    }

    const form = elements.propertyForm.elements;
    const propertyId = form.property_id.value;
    const existing = state.properties.find((property) => property.id === propertyId) || null;
    const isNew = !existing;

    setButtonLoading(elements.saveProperty, true, 'Salvando...', 'fa-circle-notch fa-spin');

    try {
      const payload = buildPropertyPayload(form, existing);
      let savedProperty;

      if (isNew) {
        const { data, error } = await client
          .from('properties')
          .insert({
            ...payload,
            organization_id: state.organizationId,
            created_by: state.auth.user.id,
            updated_by: state.auth.user.id
          })
          .select('*')
          .single();

        if (error) throw error;
        savedProperty = data;
      } else {
        const { data, error } = await client
          .from('properties')
          .update({
            ...payload,
            updated_by: state.auth.user.id
          })
          .eq('id', propertyId)
          .eq('organization_id', state.organizationId)
          .select('*')
          .single();

        if (error) throw error;
        savedProperty = data;
      }

      await removeMarkedImages(savedProperty);
      await uploadSelectedImages(savedProperty);

      showToast(isNew ? 'Imóvel cadastrado com sucesso.' : 'Imóvel atualizado com sucesso.', 'success');
      closePropertyModal();
      await loadProperties();
    } catch (error) {
      console.error('[CRV Imob] Falha ao salvar imóvel:', error);
      showToast(friendlyError(error), 'error');
      setButtonLoading(elements.saveProperty, false, 'Salvar imóvel', 'fa-floppy-disk');
    }
  }

  function buildPropertyPayload(form, existing) {
    const status = form.status.value;
    const reference = form.reference_code.value.trim();

    return {
      title: form.title.value.trim(),
      slug: createSlug(`${form.title.value}-${reference}`),
      reference_code: reference,
      property_type: form.property_type.value,
      purpose: form.purpose.value,
      location: form.location.value.trim() || null,
      description: form.description.value.trim() || null,
      price: parseCurrency(form.price.value),
      condominium_fee: nullableCurrency(form.condominium_fee.value),
      property_tax: nullableCurrency(form.property_tax.value),
      status,
      is_featured: form.is_featured.checked,
      bedrooms: safeInteger(form.bedrooms.value),
      bathrooms: safeInteger(form.bathrooms.value),
      suites: safeInteger(form.suites.value),
      parking_spaces: safeInteger(form.parking_spaces.value),
      area_m2: safeNumber(form.area_m2.value),
      land_area_m2: nullableNumber(form.land_area_m2.value),
      features: parseFeatures(form.features.value),
      published_at: status === 'published'
        ? existing?.published_at || new Date().toISOString()
        : null
    };
  }

  async function uploadSelectedImages(property) {
    let coverPath = property.cover_image_path || null;
    const existingImages = state.imagesByProperty.get(property.id) || [];
    let nextOrder = existingImages.length + 1;

    if (state.selectedCover) {
      const { error: coverResetError } = await client
        .from('property_images')
        .update({ is_cover: false })
        .eq('property_id', property.id)
        .eq('organization_id', state.organizationId);

      if (coverResetError) throw coverResetError;

      const uploadedCover = await uploadImageFile(state.selectedCover, property, 0, true);
      coverPath = uploadedCover.storage_path;
    } else if (state.deletedImages.some((image) => image.storage_path === property.cover_image_path)) {
      coverPath = null;
    }

    for (const file of state.selectedGallery) {
      await uploadImageFile(file, property, nextOrder, false);
      nextOrder += 1;
    }

    if (coverPath !== property.cover_image_path) {
      const { error } = await client
        .from('properties')
        .update({
          cover_image_path: coverPath,
          updated_by: state.auth.user.id
        })
        .eq('id', property.id)
        .eq('organization_id', state.organizationId);

      if (error) throw error;
    }
  }

  async function uploadImageFile(file, property, sortOrder, isCover) {
    validateImage(file);

    const storagePath = createStoragePath(file, property.id);
    const { error: uploadError } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data, error: rowError } = await client
      .from('property_images')
      .insert({
        organization_id: state.organizationId,
        property_id: property.id,
        storage_path: storagePath,
        alt_text: `${property.title} — foto do imóvel`,
        sort_order: sortOrder,
        is_cover: isCover,
        created_by: state.auth.user.id
      })
      .select('id, organization_id, property_id, storage_path, alt_text, sort_order, is_cover')
      .single();

    if (rowError) {
      await client.storage.from(STORAGE_BUCKET).remove([storagePath]);
      throw rowError;
    }

    return data;
  }

  async function removeMarkedImages(property) {
    if (!state.deletedImages.length) return;

    const imageIds = state.deletedImages.map((image) => image.id);
    const storagePaths = state.deletedImages.map((image) => image.storage_path);

    const { error: rowsError } = await client
      .from('property_images')
      .delete()
      .in('id', imageIds)
      .eq('organization_id', state.organizationId);

    if (rowsError) throw rowsError;

    if (storagePaths.length) {
      const { error: storageError } = await client.storage
        .from(STORAGE_BUCKET)
        .remove(storagePaths);

      if (storageError) {
        console.warn('[CRV Imob] Imagens removidas do catálogo, mas permaneceram no Storage:', storageError);
      }
    }

    if (
      property.cover_image_path
      && state.deletedImages.some((image) => image.storage_path === property.cover_image_path)
      && !state.selectedCover
    ) {
      const { error } = await client
        .from('properties')
        .update({ cover_image_path: null, updated_by: state.auth.user.id })
        .eq('id', property.id)
        .eq('organization_id', state.organizationId);

      if (error) throw error;
      property.cover_image_path = null;
    }
  }

  function selectCoverImage(event) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      state.selectedCover = null;
      elements.coverPreview.replaceChildren();
      toggleHidden(elements.coverPreviewBlock, true);
      return;
    }

    try {
      validateImage(file);
      state.selectedCover = file;
      renderNewImagePreviews([file], elements.coverPreview, true);
      toggleHidden(elements.coverPreviewBlock, false);
    } catch (error) {
      event.target.value = '';
      state.selectedCover = null;
      showToast(error.message, 'error');
    }
  }

  function selectGalleryImages(event) {
    const files = [...(event.target.files || [])];

    try {
      files.forEach(validateImage);
      state.selectedGallery = files.slice(0, 15);
      renderNewImagePreviews(state.selectedGallery, elements.galleryPreview, false);
      toggleHidden(elements.galleryPreviewBlock, !state.selectedGallery.length);

      if (files.length > 15) {
        showToast('Foram consideradas as primeiras 15 imagens da galeria.', 'info');
      }
    } catch (error) {
      event.target.value = '';
      state.selectedGallery = [];
      elements.galleryPreview.replaceChildren();
      toggleHidden(elements.galleryPreviewBlock, true);
      showToast(error.message, 'error');
    }
  }

  function renderNewImagePreviews(files, container, isCover) {
    container.replaceChildren();

    files.forEach((file) => {
      const item = document.createElement('div');
      const image = document.createElement('img');
      const objectUrl = URL.createObjectURL(file);

      item.className = 'image-preview-item';
      image.src = objectUrl;
      image.alt = file.name;
      image.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });

      item.appendChild(image);

      if (isCover) {
        const tag = document.createElement('span');
        tag.className = 'cover-tag';
        tag.textContent = 'Nova capa';
        item.appendChild(tag);
      }

      container.appendChild(item);
    });
  }

  function renderExistingImages(propertyId) {
    const images = state.imagesByProperty.get(propertyId) || [];
    elements.existingImages.replaceChildren();
    toggleHidden(elements.existingImagesBlock, !images.length);

    images.forEach((image) => {
      const item = document.createElement('div');
      item.className = 'image-preview-item';
      item.dataset.imageId = image.id;

      item.innerHTML = `
        <img src="${escapeAttribute(image.publicUrl)}" alt="${escapeAttribute(image.alt_text || 'Foto do imóvel')}">
        <button type="button" data-remove-existing-image="${escapeAttribute(image.id)}" aria-label="Remover imagem">
          <i class="fa-solid fa-xmark"></i>
        </button>
        ${image.is_cover ? '<span class="cover-tag">Capa atual</span>' : ''}
      `;

      elements.existingImages.appendChild(item);
    });
  }

  function markExistingImageForDeletion(event) {
    const button = event.target.closest('[data-remove-existing-image]');
    if (!button) return;

    const imageId = button.dataset.removeExistingImage;
    const propertyId = elements.propertyForm.elements.property_id.value;
    const images = state.imagesByProperty.get(propertyId) || [];
    const image = images.find((item) => item.id === imageId);

    if (!image || state.deletedImages.some((item) => item.id === image.id)) return;

    state.deletedImages.push(image);
    button.closest('.image-preview-item')?.remove();

    if (!elements.existingImages.children.length) {
      toggleHidden(elements.existingImagesBlock, true);
    }
  }

  function openDeleteModal(propertyId) {
    state.pendingDeleteId = propertyId;
    openModal(elements.deleteModal);
  }

  function closeDeleteModal() {
    state.pendingDeleteId = null;
    closeModal(elements.deleteModal);
    setButtonLoading(elements.confirmDelete, false, 'Excluir imóvel', 'fa-trash');
  }

  async function deleteProperty() {
    const propertyId = state.pendingDeleteId;
    if (!propertyId) return;

    setButtonLoading(elements.confirmDelete, true, 'Excluindo...', 'fa-circle-notch fa-spin');

    try {
      const images = state.imagesByProperty.get(propertyId) || [];
      const storagePaths = images.map((image) => image.storage_path).filter(Boolean);

      const { error } = await client
        .from('properties')
        .delete()
        .eq('id', propertyId)
        .eq('organization_id', state.organizationId);

      if (error) throw error;

      if (storagePaths.length) {
        const { error: storageError } = await client.storage
          .from(STORAGE_BUCKET)
          .remove(storagePaths);

        if (storageError) {
          console.warn('[CRV Imob] Registro excluído, mas alguns arquivos permaneceram no Storage:', storageError);
        }
      }

      closeDeleteModal();
      showToast('Imóvel excluído com sucesso.', 'success');
      await loadProperties();
    } catch (error) {
      console.error('[CRV Imob] Falha ao excluir imóvel:', error);
      showToast(friendlyError(error), 'error');
      setButtonLoading(elements.confirmDelete, false, 'Excluir imóvel', 'fa-trash');
    }
  }

  function openModal(modal) {
    if (!modal) return;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');

    if (!document.querySelector('.modal.is-open')) {
      document.body.style.overflow = '';
    }
  }

  function clearFilters() {
    if (elements.search) elements.search.value = '';
    if (elements.statusFilter) elements.statusFilter.value = 'all';
    renderProperties();
  }

  function renderLoading() {
    if (!elements.grid) return;

    elements.grid.innerHTML = `
      <div class="catalog-loading">
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        <span>Carregando imóveis...</span>
      </div>
    `;
  }

  function renderCatalogError(message) {
    if (elements.count) elements.count.textContent = '0';
    if (!elements.grid) return;

    elements.grid.innerHTML = `
      <div class="catalog-empty">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <strong>Não foi possível carregar o catálogo</strong>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function initCurrencyInputs() {
    ['price', 'condominium_fee', 'property_tax'].forEach((name) => {
      const input = elements.propertyForm?.elements[name];
      input?.addEventListener('input', maskCurrencyInput);
    });
  }

  function maskCurrencyInput(event) {
    const digits = event.target.value.replace(/\D/g, '');

    if (!digits) {
      event.target.value = '';
      return;
    }

    event.target.value = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(digits) / 100);
  }

  function validateImage(file) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(`O arquivo “${file.name}” não está em JPG, PNG ou WEBP.`);
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`O arquivo “${file.name}” ultrapassa o limite de 8 MB.`);
    }
  }

  function createStoragePath(file, propertyId) {
    const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const uniqueId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `${state.organizationId}/${propertyId}/${uniqueId}.${extension}`;
  }

  function getCoverImage(property, images) {
    if (property.cover_image_path) {
      return publicImageUrl(property.cover_image_path);
    }

    const image = images.find((item) => item.is_cover) || images[0];
    return image?.publicUrl || '';
  }

  function publicImageUrl(storagePath) {
    if (!storagePath) return '';

    const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    return data?.publicUrl || '';
  }

  function parseFeatures(value) {
    return String(value || '')
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item, index, list) => list.indexOf(item) === index);
  }

  function createSlug(value) {
    return normalizeText(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 180);
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function parseCurrency(value) {
    const normalized = String(value || '')
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    return Math.max(0, Number(normalized) || 0);
  }

  function nullableCurrency(value) {
    return String(value || '').trim() ? parseCurrency(value) : null;
  }

  function safeInteger(value) {
    return Math.max(0, Number.parseInt(value, 10) || 0);
  }

  function safeNumber(value) {
    return Math.max(0, Number(value) || 0);
  }

  function nullableNumber(value) {
    return String(value || '').trim() ? safeNumber(value) : null;
  }

  function formatCurrency(value) {
    const amount = Number(value || 0);

    if (amount <= 0) return 'Consulte-nos';

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(amount);
  }

  function formatCurrencyInputValue(value) {
    if (value === null || value === undefined || value === '') return '';

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value || 0));
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function statusLabel(status) {
    return {
      published: 'Publicado',
      draft: 'Rascunho',
      sold: 'Vendido'
    }[status] || status;
  }

  function setButtonLoading(button, isLoading, label, iconClass) {
    if (!button) return;

    button.classList.toggle('is-loading', isLoading);
    button.disabled = isLoading;
    button.innerHTML = `<span>${escapeHtml(label)}</span><i class="fa-solid ${escapeAttribute(iconClass)}"></i>`;
  }

  function showToast(message, type = 'info') {
    if (!elements.toast) return;

    elements.toast.textContent = message;
    elements.toast.dataset.type = type;
    elements.toast.classList.add('is-visible');

    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove('is-visible');
    }, 3400);
  }

  function friendlyError(error) {
    const message = String(error?.message || error || 'Não foi possível concluir a operação.');

    if (error?.code === '23505' && message.includes('reference')) {
      return 'Já existe um imóvel com essa referência.';
    }

    if (error?.code === '23505' && message.includes('slug')) {
      return 'Já existe um imóvel com esse título e referência.';
    }

    if (message.toLowerCase().includes('row-level security')) {
      return 'Sua sessão não possui permissão para alterar esse imóvel.';
    }

    if (message.toLowerCase().includes('failed to fetch')) {
      return 'Não foi possível conectar ao Supabase agora.';
    }

    return message;
  }

  function toggleHidden(element, hidden) {
    if (element) element.hidden = hidden;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
