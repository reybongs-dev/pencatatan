/* =========================================
   KEAMANAN, SANITASI & VALIDASI DATA
   ========================================= */
function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeText(str, maxLen = 60) {
  return String(str ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function parseValidPositiveInt(val, maxVal = 1000000000) {
  const cleaned = String(val ?? '').trim();
  if (!/^\d+$/.test(cleaned)) return null;
  const num = Number(cleaned);
  if (!Number.isSafeInteger(num) || num <= 0 || num > maxVal) return null;
  return num;
}

function isValidISODate(str) {
  if (typeof str !== 'string') return false;
  const d = new Date(str);
  return !Number.isNaN(d.getTime());
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast-msg ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3200);
}

/* =========================================
   STATE & LOCALSTORAGE SAFE ACCESS
   ========================================= */
const STORAGE_KEYS = {
  SERVICES: 'salon_mufida_services_v1',
  ORDERS: 'salon_mufida_orders_v1',
  EXPENSES: 'salon_mufida_expenses_v1',
  THEME: 'salon_mufida_theme_v1',
  PAPER: 'salon_mufida_paper_v1'
};

const DEFAULT_SERVICES = [
  { id: 'srv-1', name: 'Potong Rambut', price: 50000 },
  { id: 'srv-2', name: 'Cuci & Blow', price: 45000 },
  { id: 'srv-3', name: 'Creambath Tradisional', price: 85000 },
  { id: 'srv-4', name: 'Hair Spa', price: 110000 },
  { id: 'srv-5', name: 'Smoothing', price: 350000 },
  { id: 'srv-6', name: 'Coloring / Cat Rambut', price: 250000 }
];

function safeLoadArray(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

let services = safeLoadArray(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES);
let orders = safeLoadArray(STORAGE_KEYS.ORDERS, []);
let expenses = safeLoadArray(STORAGE_KEYS.EXPENSES, []);
let cart = [];
let activePeriod = 'today';
let currentReceiptOrder = null;
let restoreMode = 'merge';
let activePaperSize = '80mm';

try {
  const savedPaper = localStorage.getItem(STORAGE_KEYS.PAPER);
  if (savedPaper === '58mm' || savedPaper === '80mm') {
    activePaperSize = savedPaper;
  }
} catch (e) {}

function saveAll() {
  try {
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    return true;
  } catch (e) {
    showToast('Gagal menyimpan data: penyimpanan browser penuh atau dibatasi.', 'error');
    return false;
  }
}

/* =========================================
   FORMATTER & HELPER
   ========================================= */
const formatRupiah = (num) => {
  const safeNum = Number.isFinite(Number(num)) ? Number(num) : 0;
  return 'Rp ' + safeNum.toLocaleString('id-ID');
};

function formatDateIndo(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '-';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hour}.${min}`;
}

function generateOrderId() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  let candidate = '';
  do {
    const rand = Math.floor(1000 + Math.random() * 9000);
    candidate = `MFD-${yy}${mm}${dd}-${rand}`;
  } while (orders.some(o => o.id === candidate));
  return candidate;
}

/* =========================================
   TEMA TERANG / GELAP & STATUS KONEKSI
   ========================================= */
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const themeLabel = document.getElementById('themeLabel');

function applyTheme(theme) {
  const validTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', validTheme);
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, validTheme);
  } catch (e) {}
  if (validTheme === 'dark') {
    themeIcon.textContent = '☀️';
    themeLabel.textContent = 'Mode Terang';
  } else {
    themeIcon.textContent = '🌙';
    themeLabel.textContent = 'Mode Gelap';
  }
}

let savedTheme = 'light';
try {
  savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
} catch (e) {}
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

function updateOnlineStatus() {
  const dot = document.getElementById('statusDot');
  if (navigator.onLine) {
    dot.classList.remove('offline');
    dot.title = 'Online';
  } else {
    dot.classList.add('offline');
    dot.title = 'Mode Offline';
  }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

/* =========================================
   NAVIGASI TAB
   ========================================= */
const navButtons = document.querySelectorAll('[data-tab]');
const viewSections = document.querySelectorAll('.view-section');

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab');
    const targetEl = document.getElementById(`view-${target}`);
    if (!targetEl) return;

    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    viewSections.forEach(sec => sec.classList.remove('active'));
    targetEl.classList.add('active');

    if (target === 'laporan') renderLaporan();
    if (target === 'pengeluaran') renderExpenseOnly();
  });
});

/* =========================================
   KATALOG LAYANAN & KERANJANG (KASIR)
   ========================================= */
function renderCatalog() {
  const grid = document.getElementById('catalogGrid');
  document.getElementById('serviceCount').textContent = `${services.length} layanan`;
  grid.innerHTML = '';

  services.forEach(srv => {
    const div = document.createElement('div');
    div.className = 'service-item';
    div.innerHTML = `
      <div class="service-top">
        <span class="service-name">${escapeHTML(srv.name)}</span>
        <button type="button" class="btn-del-service" title="Hapus layanan" data-del="${escapeHTML(srv.id)}">&times;</button>
      </div>
      <div class="service-price">${formatRupiah(srv.price)}</div>
    `;

    div.addEventListener('click', (e) => {
      if (e.target.closest('[data-del]')) {
        e.stopPropagation();
        if (confirm(`Hapus layanan "${srv.name}" dari katalog?`)) {
          services = services.filter(item => item.id !== srv.id);
          saveAll();
          renderCatalog();
          showToast('Layanan dihapus dari katalog.');
        }
        return;
      }
      addToCart(srv);
    });

    grid.appendChild(div);
  });
}

document.getElementById('addServiceForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('newServiceName');
  const priceInput = document.getElementById('newServicePrice');
  const name = sanitizeText(nameInput.value, 60);
  const price = parseValidPositiveInt(priceInput.value, 100000000);

  if (!name) {
    showToast('Nama layanan tidak boleh kosong.', 'error');
    return;
  }
  if (price === null) {
    showToast('Masukkan harga rupiah bulat yang valid.', 'error');
    return;
  }

  services.push({
    id: 'srv-' + Date.now(),
    name,
    price
  });
  if (saveAll()) {
    renderCatalog();
    nameInput.value = '';
    priceInput.value = '';
    showToast('Layanan baru ditambahkan.', 'success');
  }
});

function addToCart(srv) {
  const existing = cart.find(c => c.id === srv.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: srv.id, name: srv.name, price: srv.price, qty: 1 });
  }
  renderCart();
}

function updateQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(c => c.id !== id);
  }
  renderCart();
}

function renderCart() {
  const list = document.getElementById('cartList');
  const totalEl = document.getElementById('cartTotal');
  const payBtn = document.getElementById('payBtn');

  if (cart.length === 0) {
    list.innerHTML = `<div class="cart-empty">Pilih layanan di sebelah kiri untuk memulai pesanan.</div>`;
    totalEl.textContent = 'Rp 0';
    payBtn.disabled = true;
    return;
  }

  list.innerHTML = '';
  let grandTotal = 0;

  cart.forEach(item => {
    const subtotal = item.price * item.qty;
    grandTotal += subtotal;

    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div class="cart-info">
        <div class="cart-name">${escapeHTML(item.name)}</div>
        <div class="cart-sub">${formatRupiah(item.price)} &times; ${item.qty} = <strong>${formatRupiah(subtotal)}</strong></div>
      </div>
      <div class="qty-control">
        <button type="button" class="qty-btn" data-act="dec">-</button>
        <span class="qty-val">${item.qty}</span>
        <button type="button" class="qty-btn" data-act="inc">+</button>
      </div>
    `;

    row.querySelector('[data-act="dec"]').addEventListener('click', () => updateQty(item.id, -1));
    row.querySelector('[data-act="inc"]').addEventListener('click', () => updateQty(item.id, 1));
    list.appendChild(row);
  });

  totalEl.textContent = formatRupiah(grandTotal);
  payBtn.disabled = false;
}

document.getElementById('clearCartBtn').addEventListener('click', () => {
  if (cart.length > 0 && confirm('Kosongkan pesanan aktif?')) {
    cart = [];
    document.getElementById('customerName').value = '';
    renderCart();
  }
});

/* =========================================
   CHECKOUT, UKURAN KERTAS & MODAL STRUK
   ========================================= */
function applyPaperSize(size) {
  activePaperSize = size === '58mm' ? '58mm' : '80mm';
  try {
    localStorage.setItem(STORAGE_KEYS.PAPER, activePaperSize);
  } catch (e) {}

  const receiptArea = document.getElementById('thermalReceiptArea');
  if (receiptArea) {
    receiptArea.classList.remove('paper-80mm', 'paper-58mm');
    receiptArea.classList.add(`paper-${activePaperSize}`);
  }

  document.querySelectorAll('.paper-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-paper') === activePaperSize);
  });
}

document.querySelectorAll('.paper-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    applyPaperSize(btn.getAttribute('data-paper'));
  });
});

applyPaperSize(activePaperSize);

document.getElementById('payBtn').addEventListener('click', () => {
  if (cart.length === 0) return;

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const customer = sanitizeText(document.getElementById('customerName').value, 60);

  const newOrder = {
    id: generateOrderId(),
    date: new Date().toISOString(),
    customer,
    items: JSON.parse(JSON.stringify(cart)),
    total
  };

  orders.unshift(newOrder);
  saveAll();

  cart = [];
  document.getElementById('customerName').value = '';
  renderCart();

  openReceiptModal(newOrder);
});

function openReceiptModal(order) {
  currentReceiptOrder = order;
  applyPaperSize(activePaperSize);
  document.getElementById('rcpId').textContent = order.id;
  document.getElementById('rcpDate').textContent = formatDateIndo(order.date);

  const custRow = document.getElementById('rcpCustomerRow');
  if (order.customer) {
    custRow.style.display = 'flex';
    document.getElementById('rcpCustomer').textContent = order.customer;
  } else {
    custRow.style.display = 'none';
  }

  const itemsContainer = document.getElementById('rcpItems');
  itemsContainer.innerHTML = order.items.map(it => `
    <div class="thermal-row">
      <span>${escapeHTML(it.name)} x${Number(it.qty)}</span>
      <span>${formatRupiah(it.price * it.qty)}</span>
    </div>
  `).join('');

  document.getElementById('rcpTotal').textContent = formatRupiah(order.total);
  document.getElementById('receiptModal').classList.add('open');
}

function closeReceiptModal() {
  document.getElementById('receiptModal').classList.remove('open');
}

document.getElementById('closeModalBtn').addEventListener('click', closeReceiptModal);
document.getElementById('doneModalBtn').addEventListener('click', closeReceiptModal);
document.getElementById('receiptModal').addEventListener('click', (e) => {
  if (e.target.id === 'receiptModal') closeReceiptModal();
});

document.getElementById('printReceiptBtn').addEventListener('click', () => {
  if (!currentReceiptOrder) return;
  window.print();
});

document.getElementById('downloadPdfBtn').addEventListener('click', () => {
  if (!currentReceiptOrder) return;
  if (typeof html2pdf === 'undefined') {
    showToast('Library PDF belum termuat (cek koneksi), membuka dialog cetak...', 'error');
    window.print();
    return;
  }
  const element = document.getElementById('thermalReceiptArea');
  const paperWidthMm = activePaperSize === '58mm' ? 58 : 80;
  const opt = {
    margin: 4,
    filename: `Struk-${currentReceiptOrder.id}-${activePaperSize}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: [paperWidthMm, 150], orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
});

/* =========================================
   PENGELUARAN & ARUS KAS (LAPORAN)
   ========================================= */
document.getElementById('expenseForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const descInput = document.getElementById('expenseDesc');
  const amountInput = document.getElementById('expenseAmount');

  const desc = sanitizeText(descInput.value, 120);
  const amount = parseValidPositiveInt(amountInput.value, 1000000000);

  if (!desc) {
    showToast('Keterangan pengeluaran tidak boleh kosong.', 'error');
    return;
  }
  if (amount === null) {
    showToast('Masukkan nominal rupiah bulat yang valid.', 'error');
    return;
  }

  expenses.unshift({
    id: 'EXP-' + Date.now(),
    date: new Date().toISOString(),
    desc,
    amount
  });

  if (saveAll()) {
    descInput.value = '';
    amountInput.value = '';
    renderExpenseOnly();
    showToast('Pengeluaran berhasil dicatat.', 'success');
  }
});

function renderExpenseOnly() {
  const tbody = document.getElementById('expenseOnlyBody');
  if (expenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Belum ada pengeluaran tercatat.</td></tr>`;
    return;
  }
  tbody.innerHTML = expenses.slice(0, 15).map(ex => `
    <tr>
      <td>${escapeHTML(formatDateIndo(ex.date))}</td>
      <td>${escapeHTML(ex.desc)}</td>
      <td style="font-weight:700; color:var(--danger);">${formatRupiah(ex.amount)}</td>
    </tr>
  `).join('');
}

function filterByPeriod(isoDate, period) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  if (period === 'today') {
    return d.toDateString() === now.toDateString();
  }
  if (period === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  }
  if (period === 'month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
}

document.querySelectorAll('.pill-btn').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.pill-btn').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activePeriod = pill.getAttribute('data-period');
    renderLaporan();
  });
});

function renderLaporan() {
  const filteredOrders = orders.filter(o => filterByPeriod(o.date, activePeriod));
  const filteredExpenses = expenses.filter(ex => filterByPeriod(ex.date, activePeriod));

  const totalIn = filteredOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const totalOut = filteredExpenses.reduce((s, ex) => s + Number(ex.amount || 0), 0);
  const balance = totalIn - totalOut;

  document.getElementById('statIncome').textContent = formatRupiah(totalIn);
  document.getElementById('statExpense').textContent = formatRupiah(totalOut);
  document.getElementById('statBalance').textContent = formatRupiah(balance);

  const combined = [
    ...filteredOrders.map(o => ({
      type: 'in',
      date: o.date,
      label: `${o.id}${o.customer ? ' — ' + o.customer : ''}`,
      amount: o.total,
      rawOrder: o
    })),
    ...filteredExpenses.map(ex => ({
      type: 'out',
      date: ex.date,
      label: ex.desc,
      amount: ex.amount
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const tbody = document.getElementById('cashflowTableBody');
  if (combined.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">Tidak ada transaksi pada periode ini.</td></tr>`;
    updateBackupSummary();
    return;
  }

  tbody.innerHTML = '';
  combined.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHTML(formatDateIndo(item.date))}</td>
      <td style="font-weight:600;">${escapeHTML(item.label)}</td>
      <td><span class="badge ${item.type === 'in' ? 'badge-in' : 'badge-out'}">${item.type === 'in' ? 'Masuk' : 'Keluar'}</span></td>
      <td style="font-weight:700;">${formatRupiah(item.amount)}</td>
      <td>${item.type === 'in' ? `<button type="button" class="btn-secondary" style="padding:5px 10px; font-size:12px;">Cetak Ulang</button>` : '-'}</td>
    `;
    if (item.type === 'in') {
      tr.querySelector('button').addEventListener('click', () => openReceiptModal(item.rawOrder));
    }
    tbody.appendChild(tr);
  });

  updateBackupSummary();
}

/* =========================================
   CADANGKAN & PULIHKAN DATA (.JSON)
   ========================================= */
function updateBackupSummary() {
  const el = document.getElementById('backupSummary');
  if (!el) return;
  el.textContent = `Tersimpan saat ini: ${orders.length} transaksi, ${expenses.length} pengeluaran, dan ${services.length} layanan.`;
}

function validateAndSanitizeBackup(backupData) {
  if (!backupData || typeof backupData !== 'object') return null;
  if (!Array.isArray(backupData.services) || !Array.isArray(backupData.orders)) return null;

  const cleanServices = [];
  for (const s of backupData.services) {
    if (!s || typeof s !== 'object') return null;
    const name = sanitizeText(s.name, 60);
    const price = Number(s.price);
    if (!name || !Number.isFinite(price) || price <= 0 || price > 100000000) return null;
    cleanServices.push({
      id: sanitizeText(s.id, 40) || ('srv-' + Date.now() + '-' + cleanServices.length),
      name,
      price: Math.round(price)
    });
  }

  const cleanOrders = [];
  for (const o of backupData.orders) {
    if (!o || typeof o !== 'object') return null;
    const id = sanitizeText(o.id, 30);
    if (!id || !isValidISODate(o.date) || !Array.isArray(o.items) || o.items.length === 0) return null;

    const cleanItems = [];
    let recomputedTotal = 0;
    for (const it of o.items) {
      if (!it || typeof it !== 'object') return null;
      const itemName = sanitizeText(it.name, 60);
      const itemPrice = Number(it.price);
      const itemQty = Number(it.qty);
      if (!itemName || !Number.isFinite(itemPrice) || itemPrice <= 0 || !Number.isInteger(itemQty) || itemQty <= 0) {
        return null;
      }
      const roundedPrice = Math.round(itemPrice);
      recomputedTotal += roundedPrice * itemQty;
      cleanItems.push({
        id: sanitizeText(it.id, 40) || 'srv-item',
        name: itemName,
        price: roundedPrice,
        qty: itemQty
      });
    }

    const total = Number.isFinite(Number(o.total)) && Number(o.total) > 0
      ? Math.round(Number(o.total))
      : recomputedTotal;

    cleanOrders.push({
      id,
      date: o.date,
      customer: sanitizeText(o.customer, 60),
      items: cleanItems,
      total
    });
  }

  const cleanExpenses = [];
  const rawExpenses = Array.isArray(backupData.expenses) ? backupData.expenses : [];
  for (const ex of rawExpenses) {
    if (!ex || typeof ex !== 'object') return null;
    const desc = sanitizeText(ex.desc, 120);
    const amount = Number(ex.amount);
    if (!desc || !isValidISODate(ex.date) || !Number.isFinite(amount) || amount <= 0) return null;
    cleanExpenses.push({
      id: sanitizeText(ex.id, 40) || ('EXP-' + Date.now() + '-' + cleanExpenses.length),
      date: ex.date,
      desc,
      amount: Math.round(amount)
    });
  }

  return {
    services: cleanServices,
    orders: cleanOrders,
    expenses: cleanExpenses
  };
}

document.getElementById('exportBackupBtn').addEventListener('click', () => {
  const payload = {
    app: 'Salon Mufida POS',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      services,
      orders,
      expenses
    }
  };

  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `Backup-Salon-Mufida-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('File cadangan berhasil diunduh.', 'success');
});

const restoreFileInput = document.getElementById('restoreFileInput');

document.getElementById('mergeBackupBtn').addEventListener('click', () => {
  restoreMode = 'merge';
  restoreFileInput.value = '';
  restoreFileInput.click();
});

document.getElementById('importBackupBtn').addEventListener('click', () => {
  restoreMode = 'replace';
  restoreFileInput.value = '';
  restoreFileInput.click();
});

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error(`File "${file.name}" melebihi batas 5 MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target.result);
    reader.onerror = () => reject(new Error(`Gagal membaca "${file.name}".`));
    reader.readAsText(file);
  });
}

restoreFileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  try {
    const parsedPacks = [];
    for (const file of files) {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text);
      const rawBackupData = parsed && parsed.data ? parsed.data : parsed;
      const validated = validateAndSanitizeBackup(rawBackupData);
      if (!validated) {
        showToast(`Format data di "${file.name}" tidak valid.`, 'error');
        return;
      }
      parsedPacks.push(validated);
    }

    if (restoreMode === 'replace') {
      const target = parsedPacks[parsedPacks.length - 1];
      if (!confirm(`Timpa seluruh data saat ini dengan ${target.orders.length} transaksi dan ${target.expenses.length} pengeluaran dari "${files[files.length - 1].name}"?`)) {
        return;
      }
      services = target.services;
      orders = target.orders;
      expenses = target.expenses;
    } else {
      const orderMap = new Map(orders.map(o => [o.id, o]));
      const expenseMap = new Map(expenses.map(ex => [ex.id, ex]));
      const serviceMap = new Map(services.map(s => [s.name.toLowerCase(), s]));

      let addedOrders = 0;
      let addedExpenses = 0;

      for (const pack of parsedPacks) {
        for (const s of pack.services) {
          if (!serviceMap.has(s.name.toLowerCase())) {
            serviceMap.set(s.name.toLowerCase(), s);
          }
        }
        for (const o of pack.orders) {
          if (!orderMap.has(o.id)) {
            orderMap.set(o.id, o);
            addedOrders += 1;
          }
        }
        for (const ex of pack.expenses) {
          if (!expenseMap.has(ex.id)) {
            expenseMap.set(ex.id, ex);
            addedExpenses += 1;
          }
        }
      }

      if (!confirm(`Gabungkan ${files.length} file cadangan? Ditemukan ${addedOrders} transaksi baru dan ${addedExpenses} pengeluaran baru (duplikat ID dilewati).`)) {
        return;
      }

      services = Array.from(serviceMap.values());
      orders = Array.from(orderMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
      expenses = Array.from(expenseMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (saveAll()) {
      renderCatalog();
      renderLaporan();
      showToast('Data berhasil diperbarui!', 'success');
    }
  } catch (err) {
    showToast(err.message || 'Gagal memproses file cadangan.', 'error');
  }
});

/* =========================================
   CEK ID ORDER
   ========================================= */
document.getElementById('lookupForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const query = sanitizeText(document.getElementById('lookupInput').value, 30).toUpperCase();
  const resultBox = document.getElementById('lookupResult');
  const found = orders.find(o => o.id.toUpperCase() === query);

  if (!found) {
    resultBox.innerHTML = `<div class="lookup-result" style="color:var(--danger); font-weight:600;">ID Order "${escapeHTML(query)}" tidak ditemukan di database lokal.</div>`;
    return;
  }

  resultBox.innerHTML = `
    <div class="lookup-result">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <strong style="font-size:15px;">${escapeHTML(found.id)}</strong>
        <span class="badge badge-in">Lunas</span>
      </div>
      <div style="font-size:13px; color:var(--text-secondary); margin-bottom:10px;">
        Waktu: ${escapeHTML(formatDateIndo(found.date))} ${found.customer ? '• Pelanggan: ' + escapeHTML(found.customer) : ''}
      </div>
      <div style="border-top:1px dashed var(--border-color); padding-top:10px; margin-bottom:12px;">
        ${found.items.map(i => `<div style="display:flex; justify-content:space-between; font-size:13.5px; margin-bottom:4px;"><span>${escapeHTML(i.name)} x${Number(i.qty)}</span><span>${formatRupiah(i.price * i.qty)}</span></div>`).join('')}
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong style="font-size:16px;">Total: ${formatRupiah(found.total)}</strong>
        <button type="button" id="reprintLookupBtn" class="btn-primary" style="padding:8px 14px;">Lihat &amp; Cetak Struk</button>
      </div>
    </div>
  `;

  document.getElementById('reprintLookupBtn').addEventListener('click', () => openReceiptModal(found));
});

/* =========================================
   SERVICE WORKER (OFFLINE PWA) & INIT
   ========================================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

renderCatalog();
renderCart();
updateBackupSummary();
