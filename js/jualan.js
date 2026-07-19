// =========================================
// JUALAN.JS - STABLE VERSION
// =========================================

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

let currentRecords = [], currentFilter = 'semua', salesChart = null, itemCounter = 0, currentUserBusinessType = 'fnb', userProducts = [];

function escapeHtml(text) { if (!text) return ''; const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }

// =========================================
// LOAD USER PRODUCTS
// =========================================
async function loadUserProducts() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return [];
    try {
        const { data, error } = await supabaseClient.from('products').select('*').eq('user_id', user.id).order('name', { ascending: true });
        if (error) throw error;
        userProducts = data || [];
        return userProducts;
    } catch (error) { console.error('Error loading products:', error); return []; }
}

// =========================================
// RENDER KATEGORI
// =========================================
function renderDynamicCategories(jenisPerniagaan) {
    let businessData = KATEGORI_PERNIAGAAN[jenisPerniagaan] || KATEGORI_PERNIAGAAN[DEFAULT_KATEGORI];
    currentUserBusinessType = jenisPerniagaan;
    const kategoriSelect = document.getElementById('kategori');
    if (!kategoriSelect) return;
    const jenisTransaksi = document.getElementById('jenis').value;
    let kategoriList = jenisTransaksi === 'jualan' ? businessData.jualan : businessData.belanja;
    kategoriSelect.innerHTML = '<option value="">-- Pilih Kategori --</option>';
    kategoriList.forEach(kategori => { const option = document.createElement('option'); option.value = kategori.value; option.textContent = kategori.label; kategoriSelect.appendChild(option); });
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
    document.getElementById('jenis')?.addEventListener('change', () => {
        renderDynamicCategories(currentUserBusinessType);
        refreshAllItemRows();
    });
}

// =========================================
// SAVE PRODUCT TO DATABASE (JUALAN ONLY)
// =========================================
async function saveProductToDatabase(productName, productPrice, productCategory) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;
    try {
        const { data: existing } = await supabaseClient.from('products').select('id').eq('user_id', user.id).ilike('name', productName).maybeSingle();
        if (existing) return existing;
        const { data, error } = await supabaseClient.from('products').insert([{ user_id: user.id, name: productName, price: productPrice || 0, category: productCategory || 'Lain-lain', business_type: currentUserBusinessType }]).select();
        if (error) throw error;
        await loadUserProducts();
        return data ? data[0] : null;
    } catch (error) { console.error('Error saving product:', error); return null; }
}

// =========================================
// CALCULATE FUNCTIONS
// =========================================
function calculateRowSubtotal(row) {
    const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const subtotal = qty * price;
    const subtotalSpan = row.querySelector('.item-subtotal-text');
    if (subtotalSpan) subtotalSpan.textContent = `RM ${subtotal.toFixed(2)}`;
    return subtotal;
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

// =========================================
// ITEM MANAGEMENT - DROPDOWN FIXED
// =========================================
function addItemRow() {
    const itemsList = document.getElementById('itemsList');
    if (!itemsList) return;
    const itemId = Date.now() + itemCounter++;
    const isBelanja = document.getElementById('jenis').value === 'belanja';
    
    const row = document.createElement('div');
    row.className = 'item-row';
    row.id = `item-${itemId}`;
    
    let nameHtml = '';
    if (isBelanja) {
        nameHtml = `
            <div class="item-field item-name">
                <label>📝 Nama Item</label>
                <input type="text" class="item-name-manual" placeholder="cth: Beli Stok, Sewa" style="padding:0.4rem 0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; width:100%;">
            </div>
        `;
    } else {
        let optionsHtml = '<option value="">-- Pilih Produk --</option>';
        userProducts.forEach(p => {
            optionsHtml += `<option value="${escapeHtml(p.name)}" data-price="${p.price}">${escapeHtml(p.name)} - RM ${p.price.toFixed(2)}</option>`;
        });
        optionsHtml += '<option value="other">✏️ Tambah Manual</option>';
        nameHtml = `
            <div class="item-field item-name">
                <label>📝 Nama Produk</label>
                <select class="item-product-select" style="padding:0.4rem 0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; width:100%;">
                    ${optionsHtml}
                </select>
            </div>
        `;
    }
    
    row.innerHTML = `
        ${nameHtml}
        <div class="item-field item-qty">
            <label>🔢 Kuantiti</label>
            <input type="number" class="item-qty" value="1" min="1" step="1" style="padding:0.4rem 0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; width:100%;">
        </div>
        <div class="item-field item-price">
            <label>💰 Harga (RM)</label>
            <input type="number" class="item-price" value="0" min="0" step="0.01" style="padding:0.4rem 0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; width:100%;">
        </div>
        <div class="item-field item-subtotal">
            <label>💵 Jumlah</label>
            <span class="item-subtotal-text">RM 0.00</span>
        </div>
        <div class="item-field item-action">
            <button type="button" class="btn-remove-item" onclick="removeItemRow('${itemId}')">🗑️</button>
        </div>
    `;
    
    // Attach events
    attachRowEvents(row);
    
    itemsList.appendChild(row);
    calculateTotalAmount();
}

function attachRowEvents(row) {
    const qty = row.querySelector('.item-qty');
    const price = row.querySelector('.item-price');
    const select = row.querySelector('.item-product-select');
    const manual = row.querySelector('.item-name-manual');
    
    // Function to recalculate this row and total
    const recalc = function() {
        calculateRowSubtotal(row);
        calculateTotalAmount();
    };
    
    // QTY input events
    if (qty) {
        qty.addEventListener('input', recalc);
        qty.addEventListener('change', recalc);
    }
    
    // PRICE input events
    if (price) {
        price.addEventListener('input', recalc);
        price.addEventListener('change', recalc);
    }
    
    // DROPDOWN select event - FIXED!
    if (select) {
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const priceInput = this.closest('.item-row').querySelector('.item-price');
            const rowElement = this.closest('.item-row');
            
            console.log('🔄 Dropdown changed:', this.value);
            
            if (this.value === 'other') {
                // Manual entry - replace select with input
                const nameField = this.closest('.item-field');
                const newInput = document.createElement('input');
                newInput.type = 'text';
                newInput.className = 'item-name-manual';
                newInput.placeholder = 'cth: Kek Red Velvet';
                newInput.style.cssText = 'padding:0.4rem 0.5rem; border:1px solid #f59e0b; border-radius:6px; font-size:0.85rem; width:100%;';
                this.replaceWith(newInput);
                priceInput.value = '';
                priceInput.placeholder = '0.00';
                
                // Add recalc to new input
                newInput.addEventListener('input', recalc);
                newInput.addEventListener('change', recalc);
                
                // Auto-save to database
                newInput.addEventListener('blur', function() {
                    const name = this.value.trim();
                    if (name) {
                        const row = this.closest('.item-row');
                        const p = parseFloat(row.querySelector('.item-price').value) || 0;
                        const cat = document.getElementById('kategori').value || 'Lain-lain';
                        saveProductToDatabase(name, p, cat).then(() => {
                            loadUserProducts();
                            this.style.borderColor = '#16a34a';
                            setTimeout(() => { this.style.borderColor = '#cbd5e1'; }, 2000);
                        });
                    }
                });
                
                recalc();
                
            } else if (this.value) {
                // Product selected - set price from data-price attribute
                const productPrice = parseFloat(selectedOption.getAttribute('data-price')) || 0;
                console.log('💰 Product price:', productPrice);
                priceInput.value = productPrice;
                recalc();
            } else {
                // Empty selection - clear price
                priceInput.value = 0;
                recalc();
            }
        });
    }
    
    // Manual input events (for BELANJA or JUALAN manual)
    if (manual) {
        manual.addEventListener('input', recalc);
        manual.addEventListener('change', recalc);
    }
}

function removeItemRow(itemId) {
    const row = document.getElementById(`item-${itemId}`);
    if (row) row.remove();
    calculateTotalAmount();
}

// =========================================
// REFRESH ALL ITEM ROWS
// =========================================
function refreshAllItemRows() {
    const rows = document.querySelectorAll('.item-row');
    rows.forEach(row => {
        const isBelanja = document.getElementById('jenis').value === 'belanja';
        const nameField = row.querySelector('.item-field.item-name');
        if (!nameField) return;
        
        const select = nameField.querySelector('.item-product-select');
        const manual = nameField.querySelector('.item-name-manual');
        
        if (isBelanja) {
            if (select && !manual) {
                const newInput = document.createElement('input');
                newInput.type = 'text';
                newInput.className = 'item-name-manual';
                newInput.placeholder = 'cth: Beli Stok, Sewa';
                newInput.style.cssText = 'padding:0.4rem 0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; width:100%;';
                select.replaceWith(newInput);
                attachRowEvents(row);
            }
        } else {
            if (manual && !select) {
                const newSelect = document.createElement('select');
                newSelect.className = 'item-product-select';
                newSelect.style.cssText = 'padding:0.4rem 0.5rem; border:1px solid #cbd5e1; border-radius:6px; font-size:0.85rem; width:100%;';
                let html = '<option value="">-- Pilih Produk --</option>';
                userProducts.forEach(p => {
                    html += `<option value="${escapeHtml(p.name)}" data-price="${p.price}">${escapeHtml(p.name)} - RM ${p.price.toFixed(2)}</option>`;
                });
                html += '<option value="other">✏️ Tambah Manual</option>';
                newSelect.innerHTML = html;
                manual.replaceWith(newSelect);
                attachRowEvents(row);
            }
        }
    });
}

// =========================================
// GET ITEMS DATA
// =========================================
function getItemsData() {
    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        let name = '';
        const select = row.querySelector('.item-product-select');
        const manual = row.querySelector('.item-name-manual');
        
        if (select && select.value && select.value !== 'other') {
            name = select.options[select.selectedIndex]?.text.split(' -')[0] || '';
        } else if (manual) {
            name = manual.value.trim();
        }
        
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        
        console.log('📦 Item found:', { name, qty, price });
        
        if (name && qty > 0 && price > 0) {
            items.push({ name, quantity: qty, price, subtotal: qty * price });
        }
    });
    console.log('📋 Total items:', items.length);
    return items;
}

// =========================================
// FORM SUBMISSION
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    const dateInput = document.getElementById('tarikh');
    if (dateInput) dateInput.valueAsDate = new Date();
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    await loadUserProducts();
    addItemRow();
    currentUserBusinessType = await getUserBusinessType();
    renderDynamicCategories(currentUserBusinessType);
    setupJenisTransaksiListener();
    await loadRecords();
    setupTabs();
});

const jualanForm = document.getElementById('jualanForm');
if (jualanForm) {
    jualanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = await checkAuth();
        if (!user) {
            alert('Sila log masuk');
            window.location.href = 'login.html';
            return;
        }
        const tarikh = document.getElementById('tarikh').value;
        const jenis = document.getElementById('jenis').value;
        const kategori = document.getElementById('kategori').value;
        const items = getItemsData();
        const total = calculateTotalAmount();
        
        console.log('📝 Form submit:', { tarikh, jenis, kategori, items, total });
        
        if (!tarikh) { alert('Pilih tarikh'); return; }
        if (!kategori) { alert('Pilih kategori'); return; }
        if (items.length === 0) { alert('Tambah sekurang-kurangnya satu item'); return; }
        if (total <= 0) { alert('Jumlah mesti lebih dari RM0'); return; }
        
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Menyimpan...';
        
        try {
            const { error } = await supabaseClient.from('jualan_records').insert([{ 
                user_id: user.id, 
                tarikh, 
                jenis, 
                kategori, 
                jumlah: total, 
                items, 
                created_at: new Date().toISOString() 
            }]);
            
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
            
            setTimeout(() => {
                loadRecords();
                msgDiv.style.display = 'none';
            }, 1000);
            
        } catch (error) {
            console.error('Submit error:', error);
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
}

// =========================================
// LOAD & DISPLAY RECORDS
// =========================================
async function loadRecords() {
    const user = await checkAuth();
    if (!user) return;
    const rekodList = document.getElementById('rekodList');
    rekodList.innerHTML = '<p class="loading-text">📂 Loading...</p>';
    try {
        const { data, error } = await supabaseClient.from('jualan_records').select('*').eq('user_id', user.id).order('tarikh', { ascending: false });
        if (error) throw error;
        currentRecords = data || [];
        filterRecords();
        loadDailySummary();
        loadMonthlySummary();
    } catch (error) {
        console.error('Load records error:', error);
        rekodList.innerHTML = '<p class="error-text">❌ Ralat memuatkan rekod</p>';
    }
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
    if (records.length === 0) { rekodList.innerHTML = '<p class="empty-text">📭 Tiada rekod</p>'; return; }
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

async function loadDailySummary() {
    const user = await checkAuth();
    if (!user) return;
    const container = document.getElementById('dailySummaryList');
    container.innerHTML = '<p class="loading-text">📂 Loading...</p>';
    try {
        const { data, error } = await supabaseClient.from('jualan_records').select('*').eq('user_id', user.id).order('tarikh', { ascending: false });
        if (error) throw error;
        const dailyMap = new Map();
        data.forEach(record => {
            const date = record.tarikh;
            if (!dailyMap.has(date)) dailyMap.set(date, { jualan: 0, belanja: 0 });
            if (record.jenis === 'jualan') dailyMap.get(date).jualan += record.jumlah;
            else dailyMap.get(date).belanja += record.jumlah;
        });
        const dailyArray = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, jualan: v.jualan, belanja: v.belanja, untung: v.jualan - v.belanja })).slice(0, 30);
        if (dailyArray.length === 0) { container.innerHTML = '<p class="empty-text">📭 Tiada rekod</p>'; return; }
        let html = '';
        dailyArray.forEach(day => { html += `<div class="summary-item"><span class="summary-date">📅 ${day.date}</span><div class="summary-numbers"><span class="jualan">💰 RM ${day.jualan.toFixed(2)}</span><span class="belanja">📉 RM ${day.belanja.toFixed(2)}</span><span class="${day.untung >= 0 ? 'jualan' : 'belanja'}">🎯 RM ${day.untung.toFixed(2)}</span></div></div>`; });
        container.innerHTML = html;
    } catch (error) { console.error('Daily summary error:', error); container.innerHTML = '<p class="error-text">❌ Error loading data</p>'; }
}

async function loadMonthlySummary() {
    const user = await checkAuth();
    if (!user) return;
    const container = document.getElementById('monthlySummaryList');
    container.innerHTML = '<p class="loading-text">📂 Loading...</p>';
    try {
        const { data, error } = await supabaseClient.from('jualan_records').select('*').eq('user_id', user.id);
        if (error) throw error;
        const monthlyMap = new Map();
        data.forEach(record => {
            const date = new Date(record.tarikh);
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            const monthName = date.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });
            if (!monthlyMap.has(monthKey)) monthlyMap.set(monthKey, { name: monthName, jualan: 0, belanja: 0 });
            if (record.jenis === 'jualan') monthlyMap.get(monthKey).jualan += record.jumlah;
            else monthlyMap.get(monthKey).belanja += record.jumlah;
        });
        const monthlyArray = Array.from(monthlyMap.entries()).map(([k, v]) => ({ ...v, untung: v.jualan - v.belanja })).sort((a, b) => b.name.localeCompare(a.name));
        if (monthlyArray.length === 0) { container.innerHTML = '<p class="empty-text">📭 Tiada rekod</p>'; return; }
        let html = '';
        monthlyArray.forEach(month => { html += `<div class="summary-item"><span class="summary-date">📊 ${month.name}</span><div class="summary-numbers"><span class="jualan">💰 RM ${month.jualan.toFixed(2)}</span><span class="belanja">📉 RM ${month.belanja.toFixed(2)}</span><span class="${month.untung >= 0 ? 'jualan' : 'belanja'}">🎯 RM ${month.untung.toFixed(2)}</span></div></div>`; });
        container.innerHTML = html;
    } catch (error) { console.error('Monthly summary error:', error); container.innerHTML = '<p class="error-text">❌ Error loading data</p>'; }
}

function prepareChartData(records) {
    const months = [], jualanMap = {}, belanjaMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        months.push({ key, label: d.toLocaleDateString('ms-MY', { month: 'short', year: 'numeric' }) });
        jualanMap[key] = 0; belanjaMap[key] = 0;
    }
    records.forEach(r => {
        if (!r.tarikh) return;
        const date = new Date(r.tarikh);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (jualanMap[key] !== undefined) {
            if (r.jenis === 'jualan') jualanMap[key] += r.jumlah || 0;
            else belanjaMap[key] += r.jumlah || 0;
        }
    });
    updateChart(months.map(m => jualanMap[m.key]), months.map(m => belanjaMap[m.key]), months.map(m => m.label));
}

function updateChart(jualanData, belanjaData, labels) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Jualan (RM)', data: jualanData, backgroundColor: 'rgba(34,197,94,0.6)', borderColor: '#16a34a', borderWidth: 1 }, { label: 'Perbelanjaan (RM)', data: belanjaData, backgroundColor: 'rgba(239,68,68,0.6)', borderColor: '#dc2626', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } } });
}

async function deleteRecord(id) {
    if (!confirm('Padam rekod ini?')) return;
    try {
        const { error } = await supabaseClient.from('jualan_records').delete().eq('id', id);
        if (error) throw error;
        await loadRecords();
        alert('✅ Rekod berjaya dipadam!');
    } catch (error) {
        console.error('Delete error:', error);
        alert('❌ Ralat memadam rekod: ' + error.message);
    }
}

async function generateReport() {
    if (currentRecords.length === 0) {
        alert('Tiada rekod');
        return;
    }
    let filtered = currentRecords;
    if (currentFilter !== 'semua') filtered = currentRecords.filter(r => r.jenis === currentFilter);
    let totalJualan = 0, totalBelanja = 0;
    filtered.forEach(r => {
        if (r.jenis === 'jualan') totalJualan += r.jumlah || 0;
        else totalBelanja += r.jumlah || 0;
    });
    const keuntungan = totalJualan - totalBelanja;
    let rows = '';
    filtered.forEach(r => {
        if (r.items && r.items.length) {
            r.items.forEach(item => {
                rows += `<tr><td>${r.tarikh}</td><td>${r.jenis === 'jualan' ? 'Jualan' : 'Belanja'}</td><td>${r.kategori}</td><td>${item.name}</td><td>${item.quantity}</td><td>${item.price.toFixed(2)}</td><td>${item.subtotal.toFixed(2)}</td></tr>`;
            });
        } else {
            rows += `<tr><td>${r.tarikh}</td><td>${r.jenis === 'jualan' ? 'Jualan' : 'Belanja'}</td><td>${r.kategori}</td><td colspan="4">Tiada detail</td></tr>`;
        }
    });
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Laporan</title><style>body{font-family:Arial;padding:40px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px}th{background:#1a5f7a;color:white}</style></head><body><h1>Laporan Jualan & Belanja</h1><h3>Ringkasan</h3><p>Jualan: RM${totalJualan.toFixed(2)}</p><p>Belanja: RM${totalBelanja.toFixed(2)}</p><p>Untung: RM${keuntungan.toFixed(2)}</p><table><thead><tr><th>Tarikh</th><th>Jenis</th><th>Kategori</th><th>Item</th><th>Kuantiti</th><th>Harga</th><th>Jumlah</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    win.document.close();
    win.print();
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
            if (tabId === 'harian') loadDailySummary();
            if (tabId === 'bulanan') loadMonthlySummary();
        });
    });
}
