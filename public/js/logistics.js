// Gestión de servicios logísticos
import { apiRequest, showToast } from './utils.js';

const logistics = {
  currentRequest: null,

  init() {
    this.loadProviders();
    this.loadMyRequests();
    this.setupEventListeners();
    this.setupServiceForm();
  },

  async loadProviders() {
    try {
      const data = await apiRequest('/api/logistics/providers');
      this.renderProviders(data.providers);
    } catch (error) {
      showToast('Error al cargar proveedores', 'error');
    }
  },

  renderProviders(providers) {
    const container = document.getElementById('providers-list');
    if (!container) return;

    if (providers.length === 0) {
      container.innerHTML = '<p class="no-providers">No hay proveedores disponibles</p>';
      return;
    }

    container.innerHTML = providers.map(p => `
      <div class="provider-card">
        <h4>${p.name}</h4>
        <p>${p.description || ''}</p>
        <div class="provider-services">
          ${p.services?.map(s => `<span class="service-tag">${s}</span>`).join('') || ''}
        </div>
        <div class="provider-rating">
          ⭐ ${p.rating || 0} (${p.reviews || 0} reseñas)
        </div>
        <button class="btn-select-provider" data-action="selectProvider" data-id="${p._id}">
          Seleccionar
        </button>
      </div>
    `).join('');
  },

  async loadMyRequests() {
    try {
      const data = await apiRequest('/api/logistics/my-requests');
      this.renderRequests(data.requests);
    } catch (error) {
      showToast('Error al cargar solicitudes', 'error');
    }
  },

  renderRequests(requests) {
    const container = document.getElementById('my-requests');
    if (!container) return;

    if (requests.length === 0) {
      container.innerHTML = '<p class="no-requests">No tienes solicitudes activas</p>';
      return;
    }

    container.innerHTML = requests.map(r => `
      <div class="request-card">
        <div class="request-header">
          <span class="request-type">${r.type}</span>
          <span class="request-status ${r.status}">${r.status}</span>
        </div>
        <div class="request-details">
          <p>${r.details?.origin?.address} → ${r.details?.destination?.address}</p>
          <p>${new Date(r.details?.date).toLocaleDateString()}</p>
        </div>
        ${r.price ? `<div class="request-price">$${r.price.toLocaleString()}</div>` : ''}
      </div>
    `).join('');
  },

  setupServiceForm() {
    const form = document.getElementById('service-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const data = {
        type: formData.get('type'),
        details: {
          origin: {
            address: formData.get('origin_address'),
            city: formData.get('origin_city'),
            province: formData.get('origin_province')
          },
          destination: {
            address: formData.get('dest_address'),
            city: formData.get('dest_city'),
            province: formData.get('dest_province')
          },
          date: formData.get('date'),
          time: formData.get('time'),
          passengers: formData.get('passengers') || 0,
          cargo: {
            weight: formData.get('weight') || 0,
            dimensions: formData.get('dimensions'),
            description: formData.get('cargo_description')
          }
        }
      };

      try {
        const result = await apiRequest('/api/logistics/request', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        showToast('Solicitud creada exitosamente', 'success');
        this.loadMyRequests();
        form.reset();
      } catch (error) {
        showToast('Error al crear solicitud', 'error');
      }
    });
  },

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      const selectBtn = e.target.closest('[data-action="selectProvider"]');
      if (selectBtn) {
        this.selectProvider(selectBtn.dataset.id);
      }
    });
  },

  async selectProvider(providerId) {
    try {
      await apiRequest('/api/logistics/select-provider', {
        method: 'POST',
        body: JSON.stringify({ providerId })
      });
      showToast('Proveedor seleccionado', 'success');
    } catch (error) {
      showToast('Error al seleccionar proveedor', 'error');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => logistics.init());
