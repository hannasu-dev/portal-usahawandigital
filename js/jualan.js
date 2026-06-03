// KATEGORI PERNIAGAAN
const KATEGORI_PERNIAGAAN = {
    fnb: {
        jualan: [{ value: "Kek & Pastri", label: "🍰 Kek & Pastri" }, { value: "Minuman", label: "🥤 Minuman" }, { value: "Makanan Utama", label: "🍝 Makanan Utama" }, { value: "Lain-lain", label: "📝 Lain-lain" }],
        belanja: [{ value: "Bahan Mentah", label: "🥛 Bahan Mentah" }, { value: "Pembungkusan", label: "📦 Pembungkusan" }, { value: "Kos Operasi", label: "🏢 Kos Operasi" }, { value: "Utiliti", label: "⚡ Utiliti" }, { value: "Pemasaran", label: "📣 Pemasaran" }]
    },
    retail: {
        jualan: [{ value: "Pakaian Wanita", label: "👗 Pakaian Wanita" }, { value: "Pakaian Lelaki", label: "👕 Pakaian Lelaki" }, { value: "Aksesori", label: "💍 Aksesori" }, { value: "Lain-lain", label: "📝 Lain-lain" }],
        belanja: [{ value: "Belian Stok", label: "📦 Belian Stok" }, { value: "Logistik", label: "🚚 Logistik" }, { value: "Kos Operasi", label: "🏢 Kos Operasi" }, { value: "Pemasaran", label: "📣 Pemasaran" }]
    },
    servis: {
        jualan: [{ value: "Servis Utama", label: "✂️ Servis Utama" }, { value: "Rawatan", label: "💆 Rawatan" }, { value: "Produk Tambahan", label: "🧴 Produk Tambahan" }, { value: "Lain-lain", label: "📝 Lain-lain" }],
        belanja: [{ value: "Alatan Servis", label: "🛠️ Alatan Servis" }, { value: "Kos Operasi", label: "🏢 Kos Operasi" }, { value: "Utiliti", label: "⚡ Utiliti" }, { value: "Lesen/Perisian", label: "💻 Lesen/Perisian" }]
    }
};
const DEFAULT_KATEGORI = 'fnb';

let currentRecords = [], currentFilter = 'semua', salesChart = null, itemCounter = 0, currentUserBusinessType = 'fnb';

// Helper functions
function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

function renderDynamicCategories(jenisPerniagaan) {
    let businessData = KATEGORI_PERNIAGAAN[jenisPerniagaan] || KATEGORI_PERNIAGAAN[DEFAULT_KATEGORI];
    currentUserBusinessType = jenisPerniagaan;
    const kategoriSelect = document.getElementById('kategori');
    if (!kategoriSelect) return;
    const jenisTransaksi = document.getElementById('jenis').value;
    let kategoriList = jenisTransaksi === 'jualan' ? businessData.jualan : businessData.belanja;
    kategoriSelect.innerHTML = '<option value="">-- Pilih Kategori --</option>';
    kategoriList.forEach(kategori => {
        const option = document.createElement('option');
        option.value = kategori.value;
        option.textContent = kategori.label;
        kategoriSelect.appendChild(option);
    });
    if (kategoriList.length > 0 && kategoriSelect.options.length > 1) kategoriSelect.value = kategoriList[0].value;
}

async function getUserBusinessType() {
    const localType = localStorage.getItem('userBusinessType');
    if (localType && KATEGORI_PERNIAGAAN[localType]) return localType;
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return DEFAULT_KATEGORI;
    try {
        const { data: profile } = await supabaseClient.from('profiles').select('business_type, jenis_perniagaan').eq('id', user.id).single();
        let businessType = profile?.business_type || profile?.jenis_perniagaan || DEFAULT_KATEGORI;
        if (!KATEGORI_PERNIAGAAN[businessType]) businessType = DEFAULT_KATEGORI;
        localStorage.setItem('userBusinessType', businessType);
        return businessType;
    } catch { return DEFAULT_KATEGORI; }
}

function setupJenisTransaksiListener() {
    document.getElementById('jenis')?.addEventListener('change', () => renderDynamicCategories(currentUserBusinessType));
}

// ITEM MANAGEMENT
function addItemRow() {
    const itemsList = document.getElementById('itemsList');
    if (!itemsList) return;
    const itemId = Date.now() + itemCounter++;
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.id = `item-${itemId}`;
    itemRow.innerHTML = `
        <div class="item-col"><label>📝 Nama Item</label><input type="text" class="item-name" placeholder="Contoh: Kek Coklat" required></div>
        <div class="item-col"><label>🔢 Kuantiti</label><input type="number" class="item-qty" value="1" min="1" step="1" required></div>
        <div class="item-col"><label>💰 Harga (RM)</label><input type="number" class="item-price" value="0" min="0" step="0.01" required></div>
        <div class="item-col"><label>💵 Jumlah</label><span class="item-subtotal">RM 0.00</span></div>
        <div class="item-col"><button type="button" class="btn-remove-item" onclick="removeItemRow('${itemId}')">🗑️</button></div>
    `;
    const qtyInput = itemRow.querySelector('.item-qty');
    const priceInput = itemRow.querySelector('.item-price');
    qtyInput.addEventListener('input', () => calculateItemSubtotal(itemId));
    priceInput.addEventListener('input', () => calculateItemSubtotal(itemId));
    itemsList.appendChild(itemRow);
    calculateTotalAmount();
}

function removeItemRow(itemId) { document.getElementById(`item-${itemId}`)?.remove(); calculateTotalAmount(); }

function calculateItemSubtotal(itemId) {
    const row = document.getElementById(`item-${itemId}`);
    if (!row) return;
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const subtotal = qty * price;
    row.querySelector('.item-subtotal').textContent = `RM ${subtotal.toFixed(2)}`;
    calculateTotalAmount();
}

function calculateTotalAmount() {
    let total = 0;
    document.querySelectorAll('.item-row').forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        total += qty * price;
    });
    const totalDisplay = document.getElementById('totalAmountDisplay');
    if (totalDisplay) totalDisplay.textContent = `RM ${total.toFixed(2)}`;
    return total;
}

function getItemsData() {
    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const quantity = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        if (name && quantity > 0 && price > 0) items.push({ name, quantity, price, subtotal: quantity * price });
    });
    return items;
}

// FORM SUBMISSION
document.addEventListener('DOMContentLoaded', async () => {
    const dateInput = document.getElementById('tarikh');
    if (dateInput) dateInput.valueAsDate = new Date();
    const user = await checkAuth();
    if (!user) { window.location.href = 'login.html'; return; }
    addItemRow();
    currentUserBusinessType = await getUserBusinessType();
    renderDynamicCategories(currentUserBusinessType);
    setupJenisTransaksiListener();
    await loadRecords();
});

document.getElementById('jualanForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = await checkAuth();
    if (!user) { alert('Sila log masuk'); window.location.href = 'login.html'; return; }
    const tarikh = document.getElementById('tarikh').value;
    const jenis = document.getElementById('jenis').value;
    const kategori = document.getElementById('kategori').value;
    const items = getItemsData();
    const total = calculateTotalAmount();
    if (!tarikh) { alert('Pilih tarikh'); return; }
    if (!kategori) { alert('Pilih kategori'); return; }
    if (items.length === 0) { alert('Tambah sekurang-kurangnya satu item'); return; }
    if (total <= 0) { alert('Jumlah mesti lebih dari RM0'); return; }
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';
    try {
        const { error } = await supabaseClient.from('jualan_records').insert([{ user_id: user.id, tarikh, jenis, kategori, jumlah: total, items, created_at: new Date().toISOString() }]);
        if (error) throw error;
        document.getElementById('jualanForm').reset();
        document.getElementById('tarikh').valueAsDate = new Date();
        document.getElementById('itemsList').innerHTML = '';
        itemCounter = 0;
        addItemRow();
        renderDynamicCategories(currentUserBusinessType);
        const msgDiv = document.getElementById('formMessage');
        msgDiv.style.display = 'block';
        msgDiv.className = 'message-box success';
        msgDiv.innerHTML = '✅ Rekod berjaya disimpan!';
        setTimeout(() => msgDiv.style.display = 'none', 3000);
        await loadRecords();
    } catch (error) {
        const msgDiv = document.getElementById('formMessage');
        msgDiv.style.display = 'block';
        msgDiv.className = 'message-box error';
        msgDiv.innerHTML = `❌ Ralat: ${error.message}`;
        setTimeout(() => msgDiv.style.display = 'none', 5000);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Simpan Rekod';
    }
});

// LOAD & DISPLAY RECORDS
async function loadRecords() {
    const user = await checkAuth();
    if (!user) return;
    const rekodList = document.getElementById('rekodList');
    rekodList.innerHTML = '<p>📂 Loading...</p>';
    try {
        const { data, error } = await supabaseClient.from('jualan_records').select('*').eq('user_id', user.id).order('tarikh', { ascending: false });
        if (error) throw error;
        currentRecords = data || [];
        filterRecords();
    } catch (error) { rekodList.innerHTML = '<p>❌ Ralat memuatkan rekod</p>'; }
}

function filterRecords() {
    const filter = document.getElementById('filterJenis')?.value || 'semua';
    currentFilter = filter;
    let filtered = currentRecords;
    if (filter !== 'semua') filtered = currentRecords.filter(r => r.jenis === filter);
    displayRecords(filtered);
    updateSummary(filtered);
    prepareChartData(filtered);
}

function displayRecords(records) {
    const rekodList = document.getElementById('rekodList');
    if (records.length === 0) { rekodList.innerHTML = '<p>📭 Tiada rekod</p>'; return; }
    let html = '';
    records.forEach(record => {
        const tanggal = new Date(record.tarikh).toLocaleDateString('ms-MY');
        const jenisClass = record.jenis === 'jualan' ? 'jualan' : 'belanja';
        const jenisIcon = record.jenis === 'jualan' ? '💰' : '📉';
        let itemsHtml = '';
        if (record.items && Array.isArray(record.items) && record.items.length > 0) {
            itemsHtml = '<div class="rekod-items">';
            record.items.forEach(item => { itemsHtml += `<div class="rekod-item-detail">• ${escapeHtml(item.name)} (${item.quantity} x RM${item.price.toFixed(2)}) = RM${item.subtotal.toFixed(2)}</div>`; });
            itemsHtml += '</div>';
        }
        html += `<div class="rekod-item ${jenisClass}"><div class="rekod-info"><div class="rekod-tarikh">${tanggal}</div><div class="rekod-keterangan">${jenisIcon} ${record.jenis} - ${record.kategori || '-'}</div>${itemsHtml}</div><div class="rekod-jumlah ${jenisClass}">RM ${(record.jumlah || 0).toFixed(2)}</div><button class="rekod-delete" onclick="deleteRecord('${record.id}')">🗑️</button></div>`;
    });
    rekodList.innerHTML = html;
}

function updateSummary(records) {
    let jualan = 0, belanja = 0;
    records.forEach(r => { if (r.jenis === 'jualan') jualan += r.jumlah || 0; else belanja += r.jumlah || 0; });
    document.getElementById('totalJualan').textContent = `RM ${jualan.toFixed(2)}`;
    document.getElementById('totalBelanja').textContent = `RM ${belanja.toFixed(2)}`;
    const untung = jualan - belanja;
    const el = document.getElementById('keuntungan');
    el.textContent = `RM ${untung.toFixed(2)}`;
    el.style.color = untung >= 0 ? '#16a34a' : '#dc2626';
}

function prepareChartData(records) {
    const months = [], jualanMap = {}, belanjaMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const key = `${d.getFullYear()}-${d.getMonth() + 1}`; months.push({ key, label: d.toLocaleDateString('ms-MY', { month: 'short', year: 'numeric' }) }); jualanMap[key] = 0; belanjaMap[key] = 0; }
    records.forEach(r => { if (!r.tarikh) return; const date = new Date(r.tarikh); const key = `${date.getFullYear()}-${date.getMonth() + 1}`; if (jualanMap[key] !== undefined) { if (r.jenis === 'jualan') jualanMap[key] += r.jumlah || 0; else belanjaMap[key] += r.jumlah || 0; } });
    updateChart(months.map(m => jualanMap[m.key]), months.map(m => belanjaMap[m.key]), months.map(m => m.label));
}

function updateChart(jualanData, belanjaData, labels) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Jualan (RM)', data: jualanData, backgroundColor: 'rgba(34,197,94,0.6)', borderColor: 'rgb(34,197,94)', borderWidth: 1 }, { label: 'Perbelanjaan (RM)', data: belanjaData, backgroundColor: 'rgba(239,68,68,0.6)', borderColor: 'rgb(239,68,68)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (ctx) => `RM ${ctx.raw.toFixed(2)}` } } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'RM' } } } } });
}

async function deleteRecord(id) { if (!confirm('Padam rekod ini?')) return; const { error } = await supabaseClient.from('jualan_records').delete().eq('id', id); if (!error) loadRecords(); else alert('Error: ' + error.message); }

async function generateReport() {
    if (currentRecords.length === 0) { alert('Tiada rekod'); return; }
    let filtered = currentRecords;
    if (currentFilter !== 'semua') filtered = currentRecords.filter(r => r.jenis === currentFilter);
    let totalJualan = 0, totalBelanja = 0;
    filtered.forEach(r => { if (r.jenis === 'jualan') totalJualan += r.jumlah || 0; else totalBelanja += r.jumlah || 0; });
    const keuntungan = totalJualan - totalBelanja;
    let rows = '';
    filtered.forEach(r => { if (r.items && r.items.length) { r.items.forEach(item => { rows += `<tr><td>${r.tarikh}</td><td>${r.jenis === 'jualan' ? 'Jualan' : 'Belanja'}</td><td>${r.kategori}</td><td>${item.name}</td><td>${item.quantity}</td><td>${item.price.toFixed(2)}</td><td>${item.subtotal.toFixed(2)}</td></tr>`; }); } else { rows += `<tr><td>${r.tarikh}</td><td>${r.jenis === 'jualan' ? 'Jualan' : 'Belanja'}</td><td>${r.kategori}</td><td colspan="4">Tiada detail</td></tr>`; } });
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Laporan</title><style>body{font-family:Arial;padding:40px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px}th{background:#1a5f7a;color:white}.summary{background:#f0f7ff;padding:20px;margin-bottom:20px}</style></head><body><h1>Laporan Jualan & Belanja</h1><div class="summary"><h3>Ringkasan</h3><p>Jualan: RM${totalJualan.toFixed(2)}</p><p>Belanja: RM${totalBelanja.toFixed(2)}</p><p>Untung: RM${keuntungan.toFixed(2)}</p></div><table><thead><tr><th>Tarikh</th><th>Jenis</th><th>Kategori</th><th>Item</th><th>Kuantiti</th><th>Harga</th><th>Jumlah</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    win.document.close(); win.print();
}
