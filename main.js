import './style.css';
import { DataStore } from './store.js';
import { initDarkVeil } from './dark-veil.js';
import { Hyperspeed } from './hyperspeed.js';

// App State
let currentView = 'dashboard';
let searchTerm = '';
let statusFilter = 'Todos';
let hyperspeedInstance = null;

// Initialize Icons
const initIcons = () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
};

// Theme Management
const initTheme = () => {
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);

  // Initialize Hyperspeed for dark theme
  initBackground(theme);

  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateThemeIcon(next);
      initBackground(next);
    };
  }
};

const initBackground = (theme) => {
  const bgContainer = document.getElementById('hyperspeed-bg');
  if (!bgContainer) return;

  if (theme === 'dark') {
    if (!hyperspeedInstance) {
      bgContainer.style.display = 'block';
      hyperspeedInstance = new Hyperspeed({
        container: bgContainer,
        speed: 1.5,
        starCount: 1500,
        starDist: 300,
        starSize: 0.8
      });
    }
  } else {
    if (hyperspeedInstance) {
      hyperspeedInstance.destroy();
      hyperspeedInstance = null;
      bgContainer.style.display = 'none';
    }
  }
}

const updateThemeIcon = (theme) => {
  const icon = document.querySelector('#themeToggle i');
  if (icon) {
    icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    initIcons();
  }
};

// Search Management - Global Search with Dropdown
const initSearch = () => {
  const searchInput = document.getElementById('globalSearch');
  const dropdown = document.getElementById('searchDropdown');
  if (!searchInput || !dropdown) return;

  let debounceTimer;

  searchInput.oninput = (e) => {
    searchTerm = e.target.value.toLowerCase();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (searchTerm.length > 0) {
        showSearchDropdown(searchTerm, dropdown);
      } else {
        dropdown.classList.add('hidden');
      }
      renderView();
    }, 200);
  };

  searchInput.onfocus = () => {
    if (searchTerm.length > 0) {
      showSearchDropdown(searchTerm, dropdown);
    }
  };

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar-wrapper')) {
      dropdown.classList.add('hidden');
    }
  });
};

const showSearchDropdown = async (term, dropdown) => {
  const customers = await DataStore.getCustomers();
  const services = await DataStore.getServices();

  const matchedCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(term) ||
    (c.whatsapp && c.whatsapp.toLowerCase().includes(term)) ||
    (c.service && c.service.toLowerCase().includes(term))
  ).slice(0, 5);

  const matchedServices = services.filter(s =>
    s.name.toLowerCase().includes(term)
  ).slice(0, 5);

  if (matchedCustomers.length === 0 && matchedServices.length === 0) {
    dropdown.innerHTML = '<div class="search-no-results">Nenhum resultado encontrado.</div>';
    dropdown.classList.remove('hidden');
    return;
  }

  let html = '';

  if (matchedCustomers.length > 0) {
    html += '<div class="search-section-title">Clientes</div>';
    matchedCustomers.forEach(c => {
      html += `
        <div class="search-item" data-action="go-customer" data-id="${c.id}">
          <div class="search-item-icon customer"><i data-lucide="user"></i></div>
          <div class="search-item-info">
            <div class="search-item-name">${c.name}</div>
            <div class="search-item-detail">${c.service || '-'} · ${c.status}</div>
          </div>
        </div>
      `;
    });
  }

  if (matchedServices.length > 0) {
    html += '<div class="search-section-title">Serviços</div>';
    matchedServices.forEach(s => {
      html += `
        <div class="search-item" data-action="go-service" data-id="${s.id}">
          <div class="search-item-icon service"><i data-lucide="package"></i></div>
          <div class="search-item-info">
            <div class="search-item-name">${s.name}</div>
            <div class="search-item-detail">Custo: R$ ${(s.cost || 0).toFixed(2)} · Venda: R$ ${(s.suggested || 0).toFixed(2)}</div>
          </div>
        </div>
      `;
    });
  }

  dropdown.innerHTML = html;
  dropdown.classList.remove('hidden');
  initIcons();

  // Attach click handlers to search items
  dropdown.querySelectorAll('.search-item').forEach(item => {
    item.onclick = () => {
      const action = item.dataset.action;
      dropdown.classList.add('hidden');
      if (action === 'go-customer') {
        switchView('customers');
      } else if (action === 'go-service') {
        switchView('services');
      }
    };
  });
};

// Navigation Controller
const initNavigation = () => {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchView(view);
    });
  });
};

const switchView = (view) => {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(i => {
    i.classList.toggle('active', i.getAttribute('data-view') === view);
  });
  renderView();
};

// Render Logic
const renderView = async () => {
  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;

  // Loading State
  if (contentArea.innerHTML === '') {
    contentArea.innerHTML = '<div style="display:flex; justify-content:center; padding: 50px;"><div class="loader">Carregando dados...</div></div>';
  }

  try {
    if (currentView === 'dashboard') {
      await renderDashboard(contentArea);
    } else if (currentView === 'customers') {
      await renderCustomers(contentArea);
    } else if (currentView === 'services') {
      await renderServices(contentArea);
    } else if (currentView === 'market') {
      await renderMarket(contentArea);
    } else if (currentView === 'financial') {
      await renderFinancial(contentArea);
    } else if (currentView === 'settings') {
      await renderSettings(contentArea);
    }
  } catch (error) {
    console.error("Render View Error:", error);
    contentArea.innerHTML = `<div style="padding: 20px; color: var(--red-vibrant);">Erro ao carregar vista: ${error.message}</div>`;
  }

  initIcons();
};

// Dashboard Renderer
const renderDashboard = async (container) => {
  const customers = await DataStore.getCustomers();

  const activeCount = customers.filter(c => c.status === 'Ativo').length;
  const expiredCount = customers.filter(c => c.status === 'Vencido').length;
  const activeCustomers = customers.filter(c => c.status === 'Ativo');

  const revenue = activeCustomers.reduce((sum, c) => sum + (parseFloat(c.sellPrice) || 0), 0);
  const cost = activeCustomers.reduce((sum, c) => sum + (parseFloat(c.costPrice) || 0), 0);
  const profit = revenue - cost;

  const ticketMedio = activeCount > 0 ? revenue / activeCount : 0;

  // Calc service stats
  const serviceCounts = {};
  const serviceProfits = {};
  activeCustomers.forEach(c => {
    serviceCounts[c.service] = (serviceCounts[c.service] || 0) + 1;
    serviceProfits[c.service] = (serviceProfits[c.service] || 0) + (c.sellPrice - c.costPrice);
  });

  let topService = '-';
  let topServiceCount = 0;
  for (const [srv, count] of Object.entries(serviceCounts)) {
    if (count > topServiceCount) { topServiceCount = count; topService = srv; }
  }

  let topProfitService = '-';
  let maxProfit = 0;
  for (const [srv, prof] of Object.entries(serviceProfits)) {
    if (prof > maxProfit) { maxProfit = prof; topProfitService = srv; }
  }

  container.innerHTML = `
    <h1 class="mb-4">Dashboard Geral</h1>
    <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
      <div class="stat-card active">
        <span class="label">Clientes Ativos</span>
        <span class="value">${activeCount}</span>
        <i data-lucide="users" class="icon-bg"></i>
      </div>
      <div class="stat-card">
        <span class="label">Vencidos</span>
        <span class="value" style="color: var(--red-vibrant)">${expiredCount}</span>
        <i data-lucide="alert-circle" class="icon-bg"></i>
      </div>
      <div class="stat-card revenue">
        <span class="label">Faturamento Mensal</span>
        <span class="value">R$ ${revenue.toFixed(2)}</span>
        <i data-lucide="trending-up" class="icon-bg"></i>
      </div>
      <div class="stat-card profit">
        <span class="label">Lucro Líquido</span>
        <span class="value">R$ ${profit.toFixed(2)}</span>
        <i data-lucide="dollar-sign" class="icon-bg"></i>
      </div>
      <div class="stat-card" style="background: var(--blue-petroleum); color: white;">
        <span class="label" style="opacity: 0.8;">Ticket Médio</span>
        <span class="value">R$ ${ticketMedio.toFixed(2)}</span>
        <i data-lucide="receipt" class="icon-bg" style="opacity: 0.1;"></i>
      </div>
      <div class="stat-card" style="background: var(--navy-dark); color: white;">
        <span class="label" style="opacity: 0.8;">Mais Vendido</span>
        <span class="value" style="font-size: 1.2rem; margin-top: 5px;">${topService}</span>
        <i data-lucide="award" class="icon-bg" style="opacity: 0.1;"></i>
      </div>
      <div class="stat-card" style="background: var(--bg-card); border: 1px solid var(--border-color);">
        <span class="label">Mais Lucrativo</span>
        <span class="value" style="font-size: 1.1rem; color: #059669; margin-top: 5px;">${topProfitService}</span>
        <i data-lucide="trending-up" class="icon-bg"></i>
      </div>
    </div>

    <div class="charts-section" style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px; margin-top: 30px;">
      <div class="card" style="background: var(--bg-card); padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border-color);">
        <h3>Faturamento vs Lucro</h3>
        <canvas id="mainChart" height="200"></canvas>
      </div>
      <div class="card" style="background: var(--bg-card); padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border-color);">
        <h3>Próximos Vencimentos</h3>
        <div id="expiring-list" style="margin-top: 15px;">
          ${customers.filter(c => {
    const diff = (new Date(c.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 5 && c.status === 'Ativo';
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map(c => `
            <div style="padding: 10px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; font-size: 0.9rem;">${c.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${c.service}</div>
              </div>
              <span style="color: var(--red-vibrant); font-weight: 700; font-size: 0.85rem;">${new Date(c.dueDate).toLocaleDateString('pt-BR')}</span>
            </div>
          `).join('') || '<p class="text-muted">Nenhum vencimento próximo.</p>'}
        </div>
      </div>
    </div>
  `;

  initChart(revenue, profit);
};

const initChart = (revenue, profit) => {
  const ctx = document.getElementById('mainChart');
  if (!ctx) return;

  // Check if Chart is available
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js not loaded yet.");
    return;
  }

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mês Atual'],
      datasets: [{
        label: 'Faturamento',
        data: [revenue],
        borderColor: '#003B4F',
        backgroundColor: 'rgba(0, 59, 79, 0.1)',
        fill: true,
        tension: 0.4
      }, {
        label: 'Lucro',
        data: [profit],
        borderColor: '#D90429',
        backgroundColor: 'rgba(217, 4, 41, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
};

// --- Customers Module ---
const renderCustomers = async (container) => {
  const allCustomers = await DataStore.getCustomers();
  const filtered = allCustomers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm) || c.service.toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  container.innerHTML = `
    <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 15px;">
      <h1>Gestão de Clientes</h1>
      <div style="display: flex; gap: 15px; align-items: center;">
        <select id="statusFilter" style="padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-main); font-family: inherit; outline: none;">
          <option value="Todos" ${statusFilter === 'Todos' ? 'selected' : ''}>Todos os Status</option>
          <option value="Ativo" ${statusFilter === 'Ativo' ? 'selected' : ''}>Ativos</option>
          <option value="Vencido" ${statusFilter === 'Vencido' ? 'selected' : ''}>Vencidos</option>
          <option value="Cancelado" ${statusFilter === 'Cancelado' ? 'selected' : ''}>Cancelados</option>
        </select>
        <button class="btn btn-primary" id="addCustBtn">
          <i data-lucide="plus"></i> Novo Cliente
        </button>
      </div>
    </div>

    <div class="table-card card" style="background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow); overflow-x: auto; border: 1px solid var(--border-color);">
      <table class="data-table" style="width: 100%; border-collapse: collapse; min-width: 800px;">
        <thead style="background: var(--bg-main); text-align: left;">
          <tr>
            <th style="padding: 15px;">Cliente</th>
            <th style="padding: 15px;">Serviço</th>
            <th style="padding: 15px;">Vencimento</th>
            <th style="padding: 15px;">Status</th>
            <th style="padding: 15px;">Lucro / Margem</th>
            <th style="padding: 15px; text-align: right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(c => {
    const profit = c.sellPrice - c.costPrice;
    const margin = c.sellPrice > 0 ? ((profit / c.sellPrice) * 100).toFixed(1) : 0;
    return `
            <tr>
              <td style="padding: 15px; font-weight: 500;">
                <div>${c.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${c.whatsapp || '-'}</div>
              </td>
              <td style="padding: 15px;">${c.service}</td>
              <td style="padding: 15px; font-weight: 600; color: ${c.status === 'Vencido' ? 'var(--red-vibrant)' : 'inherit'}">${new Date(c.dueDate).toLocaleDateString('pt-BR')}</td>
              <td style="padding: 15px;">
                <span class="badge" style="padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; 
                  background: ${c.status === 'Ativo' ? '#d1fae5' : c.status === 'Vencido' ? '#fee2e2' : '#f1f5f9'};
                  color: ${c.status === 'Ativo' ? '#065f46' : c.status === 'Vencido' ? '#991b1b' : '#475569'};">
                  ${c.status}
                </span>
              </td>
              <td style="padding: 15px;">
                <div style="color: #059669; font-weight: 600;">R$ ${profit.toFixed(2)}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${margin}% Margem</div>
              </td>
              <td style="padding: 15px; text-align: right; display: flex; gap: 6px; justify-content: flex-end;">
                ${c.status !== 'Ativo' ? `<button class="btn-icon" onclick="window.updateCustomerStatus('${c.id}', 'Ativo')" title="Marcar como Renovado/Ativo" style="color: #059669;"><i data-lucide="check-circle"></i></button>` : ''}
                ${c.status !== 'Cancelado' ? `<button class="btn-icon" onclick="window.updateCustomerStatus('${c.id}', 'Cancelado')" title="Marcar como Cancelado"><i data-lucide="x-circle"></i></button>` : ''}
                <button class="btn-icon" onclick="window.generateMessage('${c.id}')" title="Gerar Mensagem" style="color: var(--blue-petroleum)"><i data-lucide="message-square"></i></button>
                <button class="btn-icon" onclick="window.editCustomer('${c.id}')" title="Editar"><i data-lucide="edit"></i></button>
                <button class="btn-icon" onclick="window.deleteCustomer('${c.id}')" title="Excluir" style="color: var(--red-vibrant)"><i data-lucide="trash"></i></button>
              </td>
            </tr>
          `}).join('') || '<tr><td colspan="6" style="padding: 40px; text-align: center; color: var(--text-muted);">Nenhum cliente encontrado.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('addCustBtn').onclick = () => window.showCustomerModal();

  const filterSelect = document.getElementById('statusFilter');
  if (filterSelect) {
    filterSelect.onchange = (e) => {
      statusFilter = e.target.value;
      renderView();
    };
  }

  initIcons();
};

window.updateCustomerStatus = async (id, newStatus) => {
  const customers = await DataStore.getCustomers();
  const customer = customers.find(c => String(c.id) === String(id));
  if (customer) {
    customer.status = newStatus;
    if (newStatus === 'Ativo') {
      // Simplification for renewal
      const currentDue = new Date(customer.dueDate);
      currentDue.setMonth(currentDue.getMonth() + 1);
      customer.dueDate = currentDue.toISOString().split('T')[0];
    }
    await DataStore.saveCustomer(customer);
  }
};

window.showCustomerModal = async (customer = null) => {
  const modal = document.getElementById('modal-container');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const services = await DataStore.getServices();

  title.innerText = customer ? 'Editar Cliente' : 'Novo Cliente';
  body.innerHTML = `
    <form id="customerForm" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <div class="form-group" style="grid-column: span 2;">
        <label>Nome Completo</label>
        <input type="text" name="name" value="${customer?.name || ''}" required>
      </div>
      <div class="form-group">
        <label>WhatsApp</label>
        <input type="text" name="whatsapp" value="${customer?.whatsapp || ''}" placeholder="55..." required>
      </div>
      <div class="form-group">
        <label>Serviço</label>
        <select name="serviceId" id="serviceSelector" required>
          <option value="">Selecione...</option>
          ${services.map(s => `<option value="${s.id}" ${customer?.serviceId == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Custo (Compra)</label>
        <input type="number" step="0.01" name="costPrice" id="costPrice" value="${customer?.costPrice || ''}" required>
      </div>
      <div class="form-group">
        <label>Venda</label>
        <input type="number" step="0.01" name="sellPrice" id="sellPrice" value="${customer?.sellPrice || ''}" required>
      </div>
      
      <!-- Campos de Cálculo Automático -->
      <div class="form-group">
        <label>Lucro Automático (R$)</label>
        <input type="text" id="autoProfit" value="R$ 0.00" readonly style="background: var(--bg-main); font-weight: 600; color: #059669;">
      </div>
      <div class="form-group">
        <label>Margem (%)</label>
        <input type="text" id="autoMargin" value="0%" readonly style="background: var(--bg-main); font-weight: 600; color: #059669;">
      </div>

      <div class="form-group">
        <label>Data Início</label>
        <input type="date" name="startDate" value="${customer?.startDate || new Date().toISOString().split('T')[0]}" required>
      </div>
      <div class="form-group">
        <label>Vencimento</label>
        <input type="date" name="dueDate" value="${customer?.dueDate || ''}" required>
      </div>
      <div class="form-group" style="grid-column: span 2;">
        <label>Status</label>
        <select name="status">
          <option value="Ativo" ${customer?.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
          <option value="Vencido" ${customer?.status === 'Vencido' ? 'selected' : ''}>Vencido</option>
          <option value="Cancelado" ${customer?.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
        </select>
      </div>
      <div class="form-group" style="grid-column: span 2;">
        <label>Observações</label>
        <textarea name="observations" rows="2" placeholder="Informações extras do cliente...">${customer?.observations || ''}</textarea>
      </div>
      
      <div style="grid-column: span 2; display: flex; gap: 10px; margin-top: 20px;">
        <button type="submit" class="btn btn-primary" style="flex: 1;">Salvar Cliente</button>
        <button type="button" class="btn" id="closeModalBtn" style="background: var(--bg-main);">Cancelar</button>
      </div>
    </form>
  `;

  modal.classList.remove('hidden');
  document.getElementById('closeModalBtn').onclick = () => modal.classList.add('hidden');

  const form = document.getElementById('customerForm');
  const serviceSelector = document.getElementById('serviceSelector');
  const costInput = document.getElementById('costPrice');
  const sellInput = document.getElementById('sellPrice');
  const profitOutput = document.getElementById('autoProfit');
  const marginOutput = document.getElementById('autoMargin');

  const updateCalculations = () => {
    const cost = parseFloat(costInput.value) || 0;
    const sell = parseFloat(sellInput.value) || 0;
    const profit = sell - cost;
    const margin = sell > 0 ? ((profit / sell) * 100).toFixed(1) : 0;

    profitOutput.value = `R$ ${profit.toFixed(2)}`;
    marginOutput.value = `${margin}%`;
  };

  // Attach event listeners for real-time updates
  costInput.addEventListener('input', updateCalculations);
  sellInput.addEventListener('input', updateCalculations);

  serviceSelector.onchange = () => {
    const s = services.find(x => x.id == serviceSelector.value);
    if (s) {
      costInput.value = s.cost;
      sellInput.value = s.suggested;
      updateCalculations();
    }
  };

  // Initial calculation if editing
  if (customer) updateCalculations();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const service = services.find(s => s.id == fd.get('serviceId'));

    const newCustomer = {
      id: customer?.id || Date.now(),
      name: fd.get('name'),
      whatsapp: fd.get('whatsapp'),
      serviceId: fd.get('serviceId'),
      service: service?.name || 'Manual',
      costPrice: parseFloat(fd.get('costPrice')),
      sellPrice: parseFloat(fd.get('sellPrice')),
      startDate: fd.get('startDate'),
      dueDate: fd.get('dueDate'),
      status: fd.get('status'),
      observations: fd.get('observations')
    };

    await DataStore.saveCustomer(newCustomer);
    modal.classList.add('hidden');
  };
};

window.editCustomer = async (id) => {
  const customers = await DataStore.getCustomers();
  const customer = customers.find(c => String(c.id) === String(id));
  if (customer) window.showCustomerModal(customer);
};

window.deleteCustomer = async (id) => {
  if (confirm('Tem certeza que deseja excluir este cliente?')) {
    await DataStore.deleteCustomer(id);
  }
};

window.generateMessage = async (id) => {
  const customers = await DataStore.getCustomers();
  const customer = customers.find(c => String(c.id) === String(id));
  const settings = await DataStore.getSettings();
  const isRenewal = customer.status === 'Vencido';

  const templateRenovacao = `Olá, ${customer.name} ! 👋\nSua assinatura de ${customer.service} vence em ${new Date(customer.dueDate).toLocaleDateString('pt-BR')}.\nPara renovar por R$ ${customer.sellPrice.toFixed(2)}, envie o PIX na chave abaixo: \n\nChave PIX: ${settings.pixKey} \n\nAssim que confirmar, já renovo pra você 👍`;

  const templateBoasVindas = `Olá, ${customer.name} ! 👋\nO serviço ${customer.service} já está liberado!\n\nFunciona assim: \n• Acesso individual\n• Pode usar na TV, celular ou computador\n• Suporte durante a assinatura\n\nSeu vencimento ficou para: ${new Date(customer.dueDate).toLocaleDateString('pt-BR')}\n\nQualquer dúvida, estou à disposição!`;

  const templateVenda = `Olá, ${customer.name} ! 👋\nO serviço ${customer.service} está saindo por R$ ${customer.sellPrice.toFixed(2)} mensal.\n\nPagamento via PIX: \nChave: ${settings.pixKey} \n\nApós o pagamento, envio o acesso imediatamente.`;

  const templateAtraso = `Olá, ${customer.name}. Tudo bem?\nPassando para lembrar que sua assinatura de ${customer.service} (R$ ${customer.sellPrice.toFixed(2)}) venceu em ${new Date(customer.dueDate).toLocaleDateString('pt-BR')}.\n\nPara não perder o acesso, realize o PIX na chave abaixo assim que puder:\n\nChave PIX: ${settings.pixKey}\n\nSe já efetuou o pagamento, desconsidere esta mensagem. Obrigado!`;

  let msg = isRenewal ? templateRenovacao : templateBoasVindas;

  const modal = document.getElementById('modal-container');
  document.getElementById('modal-title').innerText = 'Mensagens Prontas';
  document.getElementById('modal-body').innerHTML = `
    <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-size: 0.9rem; color: var(--text-muted);">Tipo de Mensagem</label>
        <select id="msgTypeSelect" style="width: 100%; padding: 10px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-main); font-family: inherit; outline: none;">
            <option value="renovacao" ${isRenewal ? 'selected' : ''}>Aviso de Renovação</option>
            <option value="boasvindas" ${!isRenewal ? 'selected' : ''}>Boas-Vindas (Acesso Liberado)</option>
            <option value="venda">Oferta / Venda</option>
            <option value="atraso">Cobrança de Atraso</option>
        </select>
    </div>
    <textarea id="finalMsgText" rows="10" style="width: 100%; padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-main); color: var(--text-main); font-family: monospace; font-size: 0.9rem; resize: vertical; margin-bottom: 20px;">${msg}</textarea>
    <button class="btn btn-primary" style="width: 100%; margin-bottom: 10px;" id="copyMsg">Copiar Mensagem</button>
    <button class="btn" style="width: 100%; background: var(--bg-main);" id="closeMsgModal">Fechar</button>
  `;

  modal.classList.remove('hidden');

  const select = document.getElementById('msgTypeSelect');
  const textarea = document.getElementById('finalMsgText');

  select.onchange = (e) => {
    if (e.target.value === 'renovacao') textarea.value = templateRenovacao;
    else if (e.target.value === 'boasvindas') textarea.value = templateBoasVindas;
    else if (e.target.value === 'venda') textarea.value = templateVenda;
    else if (e.target.value === 'atraso') textarea.value = templateAtraso;
  };

  document.getElementById('copyMsg').onclick = () => {
    navigator.clipboard.writeText(textarea.value).then(() => {
      alert('Mensagem copiada!');
      modal.classList.add('hidden');
    });
  };

  document.getElementById('closeMsgModal').onclick = () => {
    modal.classList.add('hidden');
  };
};

// --- Services Module ---
const renderServices = async (container) => {
  const services = await DataStore.getServices();
  const customers = await DataStore.getCustomers();
  const filtered = services.filter(s => s.name.toLowerCase().includes(searchTerm));

  container.innerHTML = `
    <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 15px;">
      <h1>Gestão de Serviços</h1>
      <button class="btn btn-primary" id="addServiceBtn">
        <i data-lucide="plus"></i> Novo Serviço
      </button>
    </div>
    <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
      ${filtered.map(s => {
    const activeClients = customers.filter(c => String(c.serviceId) === String(s.id) && c.status === 'Ativo');
    const count = activeClients.length;
    const profitPerUnit = (s.suggested || 0) - (s.cost || 0);
    const margin = s.suggested > 0 ? ((profitPerUnit / s.suggested) * 100).toFixed(1) : 0;
    const totalProfit = count * profitPerUnit;

    return `
          <div class="card" style="background: var(--bg-card); padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h3 style="margin-bottom: 15px; font-size: 1.2rem; color: var(--text-main);">${s.name}</h3>
              <div style="font-size: 0.95rem; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>Custo:<br><strong style="color: var(--text-main);">R$ ${(s.cost || 0).toFixed(2)}</strong></div>
                <div>Venda:<br><strong style="color: var(--text-main);">R$ ${(s.suggested || 0).toFixed(2)}</strong></div>
                <div style="grid-column: span 2; padding-top: 10px; border-top: 1px dashed var(--border-color);">
                  Referência Mercado: <strong style="color: var(--text-main);">R$ ${(s.marketPrice || 0).toFixed(2)}</strong>
                </div>
              </div>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: var(--bg-main); border-radius: var(--radius-md);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="font-size: 0.85rem; color: var(--text-muted);">Lucro Unitário / Margem</span>
                <span style="font-weight: 600; color: #059669;">R$ ${profitPerUnit.toFixed(2)} (${margin}%)</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <span style="font-size: 0.9rem; font-weight: 500;">${count} Clientes Ativos</span>
                <div style="text-align: right;">
                 <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Lucro Total</span>
                 <span style="font-weight: 700; color: var(--blue-petroleum);">R$ ${totalProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div class="service-card-actions">
              <button class="btn-icon" onclick="window.editService('${s.id}')" title="Editar Serviço">
                <i data-lucide="edit"></i>
              </button>
              <button class="btn-icon delete" onclick="window.deleteService('${s.id}')" title="Excluir Serviço">
                <i data-lucide="trash"></i>
              </button>
            </div>
          </div>
        `;
  }).join('') || '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Nenhum serviço encontrado.</p>'}
    </div>
  `;

  document.getElementById('addServiceBtn').onclick = () => window.showServiceModal();
  initIcons();
};

// --- Service Modal ---
window.showServiceModal = (service = null) => {
  const modal = document.getElementById('modal-container');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.innerText = service ? 'Editar Serviço' : 'Novo Serviço';
  body.innerHTML = `
    <form id="serviceForm" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <div class="form-group" style="grid-column: span 2;">
        <label>Nome do Serviço</label>
        <input type="text" name="name" value="${service?.name || ''}" placeholder="Ex: Netflix Premium" required>
      </div>
      <div class="form-group">
        <label>Custo (Compra) R$</label>
        <input type="number" step="0.01" name="cost" id="svcCost" value="${service?.cost || ''}" required>
      </div>
      <div class="form-group">
        <label>Preço de Venda R$</label>
        <input type="number" step="0.01" name="suggested" id="svcSuggested" value="${service?.suggested || ''}" required>
      </div>
      <div class="form-group">
        <label>Preço Mercado (Referência) R$</label>
        <input type="number" step="0.01" name="marketPrice" value="${service?.marketPrice || ''}" required>
      </div>
      <div class="form-group">
        <label>Lucro Automático</label>
        <input type="text" id="svcAutoProfit" value="R$ 0.00" readonly style="background: var(--bg-main); font-weight: 600; color: #059669;">
      </div>
      <div style="grid-column: span 2; display: flex; gap: 10px; margin-top: 20px;">
        <button type="submit" class="btn btn-primary" style="flex: 1;">Salvar Serviço</button>
        <button type="button" class="btn" id="closeServiceModalBtn" style="background: var(--bg-main);">Cancelar</button>
      </div>
    </form>
  `;

  modal.classList.remove('hidden');
  document.getElementById('closeServiceModalBtn').onclick = () => modal.classList.add('hidden');

  const costInput = document.getElementById('svcCost');
  const suggestedInput = document.getElementById('svcSuggested');
  const profitOutput = document.getElementById('svcAutoProfit');

  const updateSvcCalc = () => {
    const cost = parseFloat(costInput.value) || 0;
    const sell = parseFloat(suggestedInput.value) || 0;
    profitOutput.value = `R$ ${(sell - cost).toFixed(2)}`;
  };

  costInput.addEventListener('input', updateSvcCalc);
  suggestedInput.addEventListener('input', updateSvcCalc);
  if (service) updateSvcCalc();

  const form = document.getElementById('serviceForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const newService = {
      id: service?.id || Date.now(),
      name: fd.get('name'),
      cost: parseFloat(fd.get('cost')),
      suggested: parseFloat(fd.get('suggested')),
      marketPrice: parseFloat(fd.get('marketPrice'))
    };
    await DataStore.saveService(newService);
    modal.classList.add('hidden');
    renderView();
  };
};

window.editService = async (id) => {
  const services = await DataStore.getServices();
  const service = services.find(s => String(s.id) === String(id));
  if (service) window.showServiceModal(service);
};

window.deleteService = async (id) => {
  if (confirm('Tem certeza que deseja excluir este serviço?')) {
    await DataStore.deleteService(id);
    renderView();
  }
};

// --- Market Module ---
const renderMarket = async (container) => {
  const services = await DataStore.getServices();
  container.innerHTML = `
    <h1>Referência de Mercado (ADMIN)</h1>
    <div class="card" style="background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow); margin-top: 20px; overflow-x: auto; border: 1px solid var(--border-color);">
        <table class="data-table" style="width: 100%; border-collapse: collapse; min-width: 800px;">
          <thead style="background: var(--navy-dark); color: white; text-align: left;">
            <tr>
              <th style="padding: 15px;">Serviço</th>
              <th style="padding: 15px;">Compra</th>
              <th style="padding: 15px;">Venda (Meu Preço)</th>
              <th style="padding: 15px;">Preço Oficial/Mercado</th>
              <th style="padding: 15px;">Diferença</th>
              <th style="padding: 15px;">Lucro Unitário</th>
              <th style="padding: 15px;">Markup %</th>
            </tr>
          </thead>
          <tbody>
            ${services.map(s => {
    const diff = s.marketPrice - s.suggested;
    const profit = s.suggested - s.cost;
    const markup = s.cost > 0 ? ((profit / s.cost) * 100).toFixed(1) : 0;
    return `
              <tr>
                <td style="padding: 15px; font-weight: 600;">${s.name}</td>
                <td style="padding: 15px;">R$ ${s.cost.toFixed(2)}</td>
                <td style="padding: 15px; color: var(--blue-petroleum); font-weight: 600;">R$ ${s.suggested.toFixed(2)}</td>
                <td style="padding: 15px;">R$ ${s.marketPrice.toFixed(2)}</td>
                <td style="padding: 15px; color: #059669; font-weight: 500;">- R$ ${diff.toFixed(2)}</td>
                <td style="padding: 15px; font-weight: 600;">R$ ${profit.toFixed(2)}</td>
                <td style="padding: 15px; color: var(--text-muted);">${markup}%</td>
              </tr>
              `;
  }).join('')}
          </tbody>
        </table>
      </div>
  `;
};

// --- Financial Module ---
const renderFinancial = async (container) => {
  const customers = await DataStore.getCustomers();
  const totalCost = customers.reduce((sum, c) => sum + c.costPrice, 0);
  const totalRev = customers.reduce((sum, c) => sum + c.sellPrice, 0);
  const totalProfit = totalRev - totalCost;

  container.innerHTML = `
    <h1>Controle Financeiro Avançado</h1>
    <div class="stats-grid" style="margin-top: 20px;">
      <div class="stat-card">
        <span class="label">Total Investido</span>
        <span class="value">R$ ${totalCost.toFixed(2)}</span>
      </div>
      <div class="stat-card">
        <span class="label">Total Faturado</span>
        <span class="value">R$ ${totalRev.toFixed(2)}</span>
      </div>
      <div class="stat-card profit">
        <span class="label">Lucro Líquido</span>
        <span class="value">R$ ${totalProfit.toFixed(2)}</span>
      </div>
    </div>
    <div style="margin-top: 30px;">
      <button class="btn btn-primary" onclick="window.exportToCSV()">Exportar Relatório CSV</button>
    </div>
  `;
};

window.exportToCSV = async () => {
  const customers = await DataStore.getCustomers();
  let csv = 'Nome,Servico,Venda,Custo,Lucro,Vencimento,Status\n';
  customers.forEach(c => {
    csv += `${c.name},${c.service},${c.sellPrice},${c.costPrice},${c.sellPrice - c.costPrice},${c.dueDate},${c.status} \n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'relatorio_financeiro.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const renderSettings = async (container) => {
  const settings = await DataStore.getSettings();
  container.innerHTML = `
    <h1>Configurações</h1>
    <div class="card" style="background: var(--bg-card); padding: 30px; border-radius: var(--radius-lg); max-width: 500px; margin-top: 20px; border: 1px solid var(--border-color);">
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600;">Chave PIX para Mensagens</label>
          <input type="text" id="pixKeyInput" value="${settings.pixKey}" class="form-control" style="width: 100%;">
        </div>
        <button class="btn btn-primary" id="saveSettingsBtn">Salvar Configurações</button>
        
        <hr style="margin: 30px 0; border: 0; border-top: 1px solid var(--border-color);">
        
        <h3 style="margin-bottom: 15px;">Manutenção de Dados</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 15px;">Use este botão caso não esteja vendo todos os seus serviços na aba "Serviços". Ele irá forçar a sincronização da sua tabela oficial (com os 16 serviços originais) para o banco de dados nuvem.</p>
        <button class="btn" id="syncServicesBtn" style="background: var(--red-vibrant); color: white; width: 100%;">
            Sincronizar Tabela de Serviços (Firebase)
        </button>
      </div>
  `;

  document.getElementById('saveSettingsBtn').onclick = async () => {
    const newKey = document.getElementById('pixKeyInput').value;
    await DataStore.saveSettings({ pixKey: newKey });
    alert('Configurações salvas!');
  };

  const syncBtn = document.getElementById('syncServicesBtn');
  if (syncBtn) {
    syncBtn.onclick = async () => {
      if (confirm('Isso irá recarregar todos os 16 serviços padrão para o banco da nuvem. Deseja continuar?')) {
        syncBtn.innerText = 'Sincronizando...';
        syncBtn.disabled = true;
        await DataStore.syncDefaultServices();
        alert('Serviços sincronizados com sucesso!');
        syncBtn.innerText = 'Sincronizar Tabela de Serviços (Firebase)';
        syncBtn.disabled = false;
      }
    };
  }
};

// Boot
window.addEventListener('DOMContentLoaded', async () => {
  initDarkVeil();
  initTheme();
  initSearch();
  initIcons();
  initNavigation();

  // Initial Render
  await renderView();

  // Subscribe to real-time updates
  DataStore.subscribeCustomers(() => {
    renderView();
  });

  DataStore.subscribeServices(() => {
    renderView();
  });

  // Global Add Btn from Top Bar
  const topAddBtn = document.getElementById('addCustomerBtn');
  if (topAddBtn) topAddBtn.onclick = () => window.showCustomerModal();

  const closeModal = document.getElementById('closeModal');
  if (closeModal) closeModal.onclick = () => document.getElementById('modal-container').classList.add('hidden');
});
