import './style.css';
import { DataStore } from './store.js';

// App State
let currentView = 'dashboard';
let searchTerm = '';

// Initialize Icons
const initIcons = () => lucide.createIcons();

// Theme Management
const initTheme = () => {
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);

  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateThemeIcon(next);
    };
  }
};

const updateThemeIcon = (theme) => {
  const icon = document.querySelector('#themeToggle i');
  if (icon) {
    icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    initIcons();
  }
};

// Search Management
const initSearch = () => {
  const searchInput = document.getElementById('globalSearch');
  if (searchInput) {
    searchInput.oninput = (e) => {
      searchTerm = e.target.value.toLowerCase();
      renderView();
    };
  }
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

  initIcons();
};

// Dashboard Renderer
const renderDashboard = async (container) => {
  const customers = await DataStore.getCustomers();

  const activeCount = customers.filter(c => c.status === 'Ativo').length;
  const expiredCount = customers.filter(c => c.status === 'Vencido').length;
  const revenue = customers.reduce((sum, c) => sum + (parseFloat(c.sellPrice) || 0), 0);
  const cost = customers.reduce((sum, c) => sum + (parseFloat(c.costPrice) || 0), 0);
  const profit = revenue - cost;

  container.innerHTML = `
    <h1 class="mb-4">Dashboard Geral</h1>
    <div class="stats-grid">
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
        <span class="label">Faturamento Total</span>
        <span class="value">R$ ${revenue.toFixed(2)}</span>
        <i data-lucide="trending-up" class="icon-bg"></i>
      </div>
      <div class="stat-card profit">
        <span class="label">Lucro Líquido</span>
        <span class="value">R$ ${profit.toFixed(2)}</span>
        <i data-lucide="dollar-sign" class="icon-bg"></i>
      </div>
    </div>

    <div class="charts-section" style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px;">
      <div class="card" style="background: var(--bg-card); padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border-color);">
        <h3>Faturamento vs Lucro</h3>
        <canvas id="mainChart" height="200"></canvas>
      </div>
      <div class="card" style="background: var(--bg-card); padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border-color);">
        <h3>Próximos Vencimentos</h3>
        <div id="expiring-list" style="margin-top: 15px;">
          ${customers.filter(c => {
    const diff = (new Date(c.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 5;
  }).map(c => `
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
  const filtered = allCustomers.filter(c =>
    c.name.toLowerCase().includes(searchTerm) ||
    c.service.toLowerCase().includes(searchTerm)
  );

  container.innerHTML = `
    <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h1>Gestão de Clientes</h1>
      <button class="btn btn-primary" id="addCustBtn">
        <i data-lucide="plus"></i> Novo Cliente
      </button>
    </div>

    <div class="table-card card" style="background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow); overflow: hidden; border: 1px solid var(--border-color);">
      <table class="data-table" style="width: 100%; border-collapse: collapse;">
        <thead style="background: var(--bg-main); text-align: left;">
          <tr>
            <th style="padding: 15px;">Cliente</th>
            <th style="padding: 15px;">Serviço</th>
            <th style="padding: 15px;">Vencimento</th>
            <th style="padding: 15px;">Status</th>
            <th style="padding: 15px;">Lucro</th>
            <th style="padding: 15px; text-align: right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(c => `
            <tr>
              <td style="padding: 15px; font-weight: 500;">${c.name}</td>
              <td style="padding: 15px;">${c.service}</td>
              <td style="padding: 15px;">${new Date(c.dueDate).toLocaleDateString('pt-BR')}</td>
              <td style="padding: 15px;">
                <span class="badge" style="padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; 
                  background: ${c.status === 'Ativo' ? '#d1fae5' : c.status === 'Vencido' ? '#fee2e2' : '#f1f5f9'};
                  color: ${c.status === 'Ativo' ? '#065f46' : c.status === 'Vencido' ? '#991b1b' : '#475569'};">
                  ${c.status}
                </span>
              </td>
              <td style="padding: 15px; color: #059669; font-weight: 600;">R$ ${(c.sellPrice - c.costPrice).toFixed(2)}</td>
              <td style="padding: 15px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                <button class="btn-icon" onclick="window.generateMessage('${c.id}')" title="Gerar Mensagem"><i data-lucide="message-square"></i></button>
                <button class="btn-icon" onclick="window.editCustomer('${c.id}')" title="Editar"><i data-lucide="edit"></i></button>
                <button class="btn-icon" onclick="window.deleteCustomer('${c.id}')" title="Excluir" style="color: var(--red-vibrant)"><i data-lucide="trash"></i></button>
              </td>
            </tr>
          `).join('') || '<tr><td colspan="6" style="padding: 40px; text-align: center; color: var(--text-muted);">Nenhum cliente cadastrado.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
  document.getElementById('addCustBtn').onclick = () => window.showCustomerModal();
  initIcons();
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

  serviceSelector.onchange = () => {
    const s = services.find(x => x.id == serviceSelector.value);
    if (s) {
      document.getElementById('costPrice').value = s.cost;
      document.getElementById('sellPrice').value = s.suggested;
    }
  };

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
      status: fd.get('status')
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

  let msg = isRenewal ? `Olá, ${customer.name}! 👋\nSua assinatura de ${customer.service} vence em ${new Date(customer.dueDate).toLocaleDateString('pt-BR')}.\nPara renovar por R$ ${customer.sellPrice.toFixed(2)}, envie o PIX na chave abaixo:\n\nChave PIX: ${settings.pixKey}\n\nAssim que confirmar, já renovo pra você 👍`
    : `Olá, ${customer.name}! 👋\nO serviço ${customer.service} está disponível por R$ ${customer.sellPrice.toFixed(2)} mensal.\n\nFunciona assim:\n• Acesso individual\n• Pode usar na TV, celular ou computador\n• Suporte durante a assinatura\n\nPagamento via PIX:\nChave: ${settings.pixKey}\n\nApós o pagamento, envio o acesso imediatamente.`;

  const modal = document.getElementById('modal-container');
  document.getElementById('modal-title').innerText = 'Mensagem Gerada';
  document.getElementById('modal-body').innerHTML = `
    <div style="background: var(--bg-main); padding: 20px; border-radius: var(--radius-md); white-space: pre-wrap; font-family: monospace; font-size: 0.9rem; margin-bottom: 20px; color: var(--text-main);">${msg}</div>
    <button class="btn btn-primary" style="width: 100%;" id="copyMsg">Copiar e Fechar</button>
  `;
  modal.classList.remove('hidden');
  document.getElementById('copyMsg').onclick = () => {
    navigator.clipboard.writeText(msg).then(() => {
      alert('Copiado!');
      modal.classList.add('hidden');
    });
  };
};

// --- Services Module ---
const renderServices = async (container) => {
  const services = await DataStore.getServices();
  const customers = await DataStore.getCustomers();
  const filtered = services.filter(s => s.name.toLowerCase().includes(searchTerm));

  container.innerHTML = `
    <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h1>Gestão de Serviços</h1>
    </div>
    <div class="grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
      ${filtered.map(s => {
    const count = customers.filter(c => String(c.serviceId) === String(s.id) && c.status === 'Ativo').length;
    return `
          <div class="card" style="background: var(--bg-card); padding: 20px; border-radius: var(--radius-lg); box-shadow: var(--shadow); border: 1px solid var(--border-color);">
            <h3 style="margin-bottom: 10px;">${s.name}</h3>
            <div style="font-size: 0.9rem; color: var(--text-muted);">
              <div>Custo: <strong>R$ ${s.cost.toFixed(2)}</strong></div>
              <div>Venda: <strong>R$ ${s.suggested.toFixed(2)}</strong></div>
              <div style="margin-top: 10px; color: var(--text-main); font-weight: 600;">${count} Clientes Ativos</div>
            </div>
          </div>
        `;
  }).join('')}
    </div>
  `;
  initIcons();
};

// --- Market Module ---
const renderMarket = async (container) => {
  const services = await DataStore.getServices();
  container.innerHTML = `
    <h1>Referência de Mercado (ADMIN)</h1>
    <div class="card" style="background: var(--bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow); margin-top: 20px; overflow-x: auto; border: 1px solid var(--border-color);">
      <table class="data-table" style="width: 100%; border-collapse: collapse;">
        <thead style="background: var(--navy-dark); color: white; text-align: left;">
          <tr>
            <th style="padding: 15px;">Serviço</th>
            <th style="padding: 15px;">Preço Oficial</th>
            <th style="padding: 15px;">Diferença</th>
          </tr>
        </thead>
        <tbody>
          ${services.map(s => `
            <tr>
              <td style="padding: 15px; font-weight: 600;">${s.name}</td>
              <td style="padding: 15px;">R$ ${s.marketPrice.toFixed(2)}</td>
              <td style="padding: 15px; color: #059669;">- R$ ${(s.marketPrice - s.suggested).toFixed(2)}</td>
            </tr>
          `).join('')}
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
    csv += `${c.name},${c.service},${c.sellPrice},${c.costPrice},${c.sellPrice - c.costPrice},${c.dueDate},${c.status}\n`;
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
    </div>
  `;

  document.getElementById('saveSettingsBtn').onclick = async () => {
    const newKey = document.getElementById('pixKeyInput').value;
    await DataStore.saveSettings({ pixKey: newKey });
    alert('Configurações salvas!');
  };
};

// Boot
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSearch();
  initIcons();
  initNavigation();

  // Subscribe to real-time updates
  DataStore.subscribeCustomers(() => {
    renderView();
  });

  // Global Add Btn from Top Bar
  const topAddBtn = document.getElementById('addCustomerBtn');
  if (topAddBtn) topAddBtn.onclick = () => window.showCustomerModal();
});
