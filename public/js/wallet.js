// Manejo de billetera virtual, pagos y transferencias
import { apiRequest, showToast, formatCurrency } from './utils.js';

const wallet = {
  balance: 0,
  transactions: [],
  virtualCard: null,

  init() {
    this.loadWallet();
    this.setupEventListeners();
  },

  async loadWallet() {
    try {
      const data = await apiRequest('/api/wallet');
      this.balance = data.wallet.balance;
      this.virtualCard = data.wallet.virtualCard;
      this.transactions = data.wallet.transactions || [];
      this.renderWallet();
      this.loadTransactions();
    } catch (error) {
      showToast('Error al cargar billetera', 'error');
    }
  },

  renderWallet() {
    const container = document.getElementById('wallet-container');
    if (!container) return;

    container.innerHTML = `
      <div class="wallet-balance">
        <div class="balance-card">
          <h3>Saldo disponible</h3>
          <div class="balance-amount">${formatCurrency(this.balance)}</div>
          <div class="balance-actions">
            <button class="btn-deposit" data-action="deposit">💰 Depositar</button>
            <button class="btn-transfer" data-action="transfer">💸 Transferir</button>
          </div>
        </div>
      </div>

      <div class="virtual-card">
        <h3>Tarjeta Virtual</h3>
        <div class="card-preview">
          <div class="card-number">${this.virtualCard?.cardNumber || 'XXXX-XXXX-XXXX-XXXX'}</div>
          <div class="card-details">
            <span>${this.virtualCard?.cardHolder || 'TU NOMBRE'}</span>
            <span>${this.virtualCard?.expiryDate || 'MM/AA'}</span>
          </div>
        </div>
        <button class="btn-show-cvv" data-action="showCvv">Mostrar CVV</button>
      </div>

      <div class="wallet-transactions">
        <h3>Historial de transacciones</h3>
        <div id="transactions-list"></div>
      </div>
    `;

    this.setupCardEvents();
  },

  async loadTransactions() {
    const list = document.getElementById('transactions-list');
    if (!list) return;

    try {
      const data = await apiRequest('/api/wallet/transactions');
      this.transactions = data.transactions;

      if (this.transactions.length === 0) {
        list.innerHTML = '<p class="no-transactions">No hay transacciones aún</p>';
        return;
      }

      list.innerHTML = this.transactions.map(t => `
        <div class="transaction-item ${t.type === 'payment' ? 'outgoing' : 'incoming'}">
          <div class="transaction-info">
            <span class="transaction-type">${this.getTransactionLabel(t)}</span>
            <span class="transaction-date">${new Date(t.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="transaction-amount ${t.from === this.currentUserId() ? 'negative' : 'positive'}">
            ${t.from === this.currentUserId() ? '-' : '+'}$${t.amount.toLocaleString()}
          </div>
        </div>
      `).join('');
    } catch (error) {
      showToast('Error al cargar transacciones', 'error');
    }
  },

  getTransactionLabel(t) {
    const labels = {
      'payment': 'Pago',
      'deposit': 'Depósito',
      'withdrawal': 'Retiro',
      'service': 'Servicio',
      'refund': 'Reembolso'
    };
    return labels[t.type] || t.type;
  },

  setupEventListeners() {
    document.addEventListener('click', async (e) => {
      const depositBtn = e.target.closest('[data-action="deposit"]');
      if (depositBtn) {
        await this.deposit();
      }

      const transferBtn = e.target.closest('[data-action="transfer"]');
      if (transferBtn) {
        this.showTransferModal();
      }

      const showCvvBtn = e.target.closest('[data-action="showCvv"]');
      if (showCvvBtn) {
        this.showCVV();
      }
    });
  },

  setupCardEvents() {
    // Configurar eventos específicos de la tarjeta
  },

  async deposit() {
    const amount = prompt('¿Cuánto deseas depositar?', '1000');
    if (!amount || isNaN(amount) || amount <= 0) {
      showToast('Monto inválido', 'warning');
      return;
    }

    try {
      const data = await apiRequest('/api/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount) })
      });

      // Redirigir a Mercado Pago
      if (data.initPoint) {
        window.open(data.initPoint, '_blank');
      } else {
        showToast('Error al procesar depósito', 'error');
      }
    } catch (error) {
      showToast('Error al procesar depósito', 'error');
    }
  },

  showTransferModal() {
    const modal = document.createElement('div');
    modal.className = 'modal transfer-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Transferir dinero</h3>
        <input type="text" id="transfer-user" placeholder="Email o ID del usuario">
        <input type="number" id="transfer-amount" placeholder="Monto" min="1">
        <input type="text" id="transfer-description" placeholder="Descripción (opcional)">
        <div class="modal-actions">
          <button class="btn-cancel" data-action="cancel">Cancelar</button>
          <button class="btn-confirm" data-action="confirmTransfer">Transferir</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('[data-action="confirmTransfer"]').addEventListener('click', async () => {
      const toUserId = document.getElementById('transfer-user').value;
      const amount = document.getElementById('transfer-amount').value;
      const description = document.getElementById('transfer-description').value;

      if (!toUserId || !amount) {
        showToast('Completa todos los campos', 'warning');
        return;
      }

      try {
        await apiRequest('/api/wallet/transfer', {
          method: 'POST',
          body: JSON.stringify({
            toUserId,
            amount: Number(amount),
            description
          })
        });
        showToast('Transferencia exitosa', 'success');
        modal.remove();
        this.loadWallet();
      } catch (error) {
        showToast(error.message || 'Error al transferir', 'error');
      }
    });
  },

  showCVV() {
    const cvv = this.virtualCard?.cvv || '***';
    alert(`Tu CVV es: ${cvv}\n\nNo compartas este código con nadie.`);
  },

  currentUserId() {
    return JSON.parse(localStorage.getItem('user') || '{}').id;
  }
};

document.addEventListener('DOMContentLoaded', () => wallet.init());
