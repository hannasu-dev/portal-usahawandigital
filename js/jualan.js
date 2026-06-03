// =========================================
// 1. STRUKTUR DATA KATEGORI (MAPPING OBJECT)
// =========================================
const KATEGORI_PERNIAGAAN = {
    fnb: {
        jualan: [
            { value: "Kek & Pastri", label: "🍰 Kek & Pastri" },
            { value: "Minuman Premium", label: "☕ Minuman Premium" },
            { value: "Minuman Biasa", label: "🥤 Minuman Biasa" },
            { value: "Makanan Utama", label: "🍝 Makanan Utama" },
            { value: "Lain-lain", label: "📝 Lain-lain" }
        ],
        belanja: [
            { value: "Bahan Mentah", label: "🥛 Bahan Mentah" },
            { value: "Pembungkusan", label: "📦 Pembungkusan" },
            { value: "Kos Operasi", label: "🏢 Kos Operasi" },
            { value: "Utiliti", label: "⚡ Utiliti" },
            { value: "Pemasaran", label: "📣 Pemasaran" },
            { value: "Penyelenggaraan Mesin", label: "🛠️ Penyelenggaraan Mesin" }
        ]
    },
    retail: {
        jualan: [
            { value: "Pakaian Wanita", label: "👗 Pakaian Wanita" },
            { value: "Pakaian Lelaki", label: "👕 Pakaian Lelaki" },
            { value: "Pakaian Kanak-Kanak", label: "👶 Pakaian Kanak-Kanak" },
            { value: "Hijab & Aksesori", label: "🧕 Hijab & Aksesori" },
            { value: "Kasut & Beg", label: "👜 Kasut & Beg" },
            { value: "Lain-lain", label: "📝 Lain-lain" }
        ],
        belanja: [
            { value: "Belian Stok Borong", label: "📦 Belian Stok Borong" },
            { value: "Logistik/Shipping", label: "🚚 Logistik/Shipping" },
            { value: "Pembungkusan/Beg", label: "🛍️ Pembungkusan/Beg" },
            { value: "Kos Operasi", label: "🏢 Kos Operasi" },
            { value: "Pemasaran", label: "📣 Pemasaran" }
        ]
    },
    servis: {
        jualan: [
            { value: "Servis Utama", label: "✂️ Servis Utama" },
            { value: "Rawatan/Treatment", label: "💆 Rawatan/Treatment" },
            { value: "Jualan Produk Tambahan", label: "🧴 Jualan Produk Tambahan" },
            { value: "Lain-lain", label: "📝 Lain-lain" }
        ],
        belanja: [
            { value: "Produk/Alatan Servis", label: "🧴 Produk/Alatan Servis" },
            { value: "Kos Operasi/Sewa", label: "🏢 Kos Operasi/Sewa" },
            { value: "Utiliti", label: "⚡ Utiliti" },
            { value: "Pemasaran", label: "📣 Pemasaran" },
            { value: "Lesen/Perisian", label: "💻 Lesen/Perisian" }
        ]
    }
};

const DEFAULT_KATEGORI = 'fnb';

// Global variables
let currentRecords = [];
let currentFilter = 'semua';
let salesChart = null;
let itemCounter = 0;
let currentUserBusinessType = 'fnb';
let userProductsCache = []; // Cache untuk menyimpan senarai produk pengguna

// =========================================
// 2. FUNGSI RENDER DROPDOWN KATEGORI DINAMIK
// =========================================
function renderDynamicCategories(jenisPerniagaan) {
    let businessData = KATEGORI_PERNIAGAAN[jenisPerniagaan];
    if (!businessData) {
        console.warn(`Jenis perniagaan "${jenisPerniagaan}" tidak dijumpai. Menggunakan default (fnb).`);
        businessData = KATEGORI_PERNIAGAAN[DEFAULT_KATEGORI];
        jenisPerniagaan = DEFAULT_KATEGORI;
    }
    
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
    
    if (kategoriList.length > 0 && kategoriSelect.options.length > 1) {
        kategoriSelect.value = kategoriList[0].value;
    }

    // Refresh baris item yang sedia ada untuk kemas kini input nama/dropdown produk
    const itemRows = document.querySelectorAll('.item-row');
    if (itemRows.length > 0) {
        document.getElementById('itemsList').innerHTML = '';
        addItemRow();
    }
}

// =========================================
// 3. DAPATKAN JENIS PERNIAGAAN DARI STORAGE/PROFILE
// =========================================
function getActiveBusinessType() {
    return localStorage.getItem('userBusinessType') || 'fnb';
}

async function getUserBusinessType() {
    const localType = getActiveBusinessType();
    if (localType && KATEGORI_PERNIAGAAN[localType]) {
        return localType;
    }
    
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return DEFAULT_KATEGORI;
    
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('business_type, jenis_perniagaan')
            .eq('id', user.id)
            .single();
        
        if (error) throw error;
        
        let businessType = profile?.business_type || profile?.jenis_perniagaan || DEFAULT_KATEGORI;
        if (!KATEGORI_PERNIAGAAN[businessType]) businessType = DEFAULT_KATEGORI;
        
        localStorage.setItem('userBusinessType', businessType);
        return businessType;
    } catch (err) {
        console.error('Error in getUserBusinessType:', err);
        return DEFAULT_KATEGORI;
    }
}

function setupJenisTransaksiListener() {
    const jenisSelect = document.getElementById('jenis');
    if (jenisSelect) {
        jenisSelect.addEventListener('change', () => {
            renderDynamicCategories(currentUserBusinessType);
        });
    }
}

// =========================================
// 4. ITEM MANAGEMENT FUNCTIONS (WITH PRODUCT DROPDOWN)
// =========================================
function addItemRow() {
    const itemsList = document.getElementById('itemsList');
    if (!itemsList) return;
    
    const itemId = Date.now() + itemCounter++;
    const jenisTransaksi = document.getElementById('jenis')?.value || 'jualan';
    
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.id = `item-${itemId}`;
    
    // Jana input nama item berdasarkan jenis transaksi (Dropdown jika Jualan & ada produk sedia ada)
    let nameColumnHtml = '';
    
    if (jenisTransaksi === 'jualan' && userProductsCache.length > 0) {
        let optionsHtml = '<option value="">-- Pilih Produk --</option>';
        userProductsCache.forEach(prod => {
            optionsHtml += `<option value="${prod.name}" data-price="${prod.price || 0}">${prod.name} (RM ${(prod.price || 0).toFixed(2)})</option>`;
        });
        optionsHtml += '<option value="custom">✍️ Taip Manual...</option>';
        
        nameColumnHtml = `
            <label>🛍️ Pilih Produk</label>
            <div class="product-select-wrapper" style="display: flex; flex-direction: column; gap: 0.3rem;">
                <select class="item-product-select" onchange="handleProductSelectChange('${itemId}', this)" required>
                    ${optionsHtml}
                </select>
                <input type="text" class="item-name" placeholder="Nama item manual" style="display: none;">
            </div>
        `;
    } else {
        // Jika Perbelanjaan atau pengguna belum daftar sebarang produk, tunjuk input text biasa
        nameColumnHtml = `
            <label>📝 Nama Item</label>
            <input type="text" class="item-name" placeholder="Contoh: Kek Coklat, Air Sirap, Kos Pembungkusan" required>
        `;
    }
    
    itemRow.innerHTML = `
        <div class="item-col item-name-col">
            ${nameColumnHtml}
        </div>
        <div class="item-col item-qty-col">
            <label>🔢 Kuantiti</label>
            <input type="number" class="item-qty" value="1" min="1" step="1" required>
        </div>
        <div class="item-col item-price-col">
            <label>💰 Harga (RM)</label>
            <input type="number" class="item-price" value="0" min="0" step="0.01" required>
        </div>
        <div class="item-col item-subtotal-col">
            <label>💵 Jumlah</label>
            <span class="item-subtotal">RM 0.00</span>
        </div>
        <div class="item-col item-action-col">
            <button type="button" class="btn-remove-item" onclick="removeItemRow('${itemId}')">🗑️</button>
        </div>
    `;
    
    const qtyInput = itemRow.querySelector('.item-qty');
    const priceInput = itemRow.querySelector('.item-price');
    qtyInput.addEventListener('input', () => calculateItemSubtotal(itemId));
    priceInput.addEventListener('input', () => calculateItemSubtotal(itemId));
    
    itemsList.appendChild(itemRow);
    calculateTotalAmount();
}

// Fungsi baru untuk menguruskan auto-isi harga apabila produk dipilih
function handleProductSelectChange(itemId, selectElement) {
    const itemRow = document.getElementById(`item-${itemId}`);
    if (!itemRow) return;
    
    const textInput = itemRow.querySelector('.item-name');
    const priceInput = itemRow.querySelector('.item-price');
    
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    
    if (selectElement.value === 'custom') {
        // Jika pilih "Taip Manual", paparkan input text dan reset harga
        textInput.style.display = 'block';
        textInput.value = '';
        textInput.required = true;
        priceInput.value = 0;
    } else if (selectElement.value !== '') {
        // Jika pilih produk sedia ada, masukkan nilai nama ke input tersembunyi dan auto-isi harga
        textInput.style.display = 'none';
        textInput.value = selectElement.value;
        textInput.required = false;
        
        const price = parseFloat(selectedOption.getAttribute('data-price')) || 0;
        priceInput.value = price;
    } else {
        // Jika kembali kepada default "-- Pilih Produk --"
        textInput.style.display = 'none';
        textInput.value = '';
        priceInput.value = 0;
    }
    
    calculateItemSubtotal(itemId);
}

function removeItemRow(itemId) {
    const itemRow = document.getElementById(`item-${itemId}`);
    if (itemRow) {
        itemRow.remove();
        calculateTotalAmount();
    }
}

function calculateItemSubtotal(itemId) {
    const itemRow = document.getElementById(`item-${itemId}`);
    if (!itemRow) return;
    
    const qty = parseFloat(itemRow.querySelector('.item-qty').value) || 0;
    const price = parseFloat(itemRow.querySelector('.item-price').value) || 0;
    const subtotal = qty * price;
    
    const subtotalSpan = itemRow.querySelector('.item-subtotal');
    subtotalSpan.textContent = `RM ${subtotal.toFixed(2)}`;
    
    calculateTotalAmount();
}

function calculateTotalAmount() {
    const itemRows = document.querySelectorAll('.item-row');
    let total = 0;
    
    itemRows.forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        total += qty * price;
    });
    
    const totalDisplay = document.getElementById('totalAmountDisplay');
    if (totalDisplay) totalDisplay.textContent = `RM ${total.toFixed(2)}`;
    return total;
}

function getItemsData() {
    const itemRows = document.querySelectorAll('.item-row');
    const items = [];
    
    itemRows.forEach(row => {
        const nameInput = row.querySelector('.item-name');
        const name = nameInput ? nameInput.value.trim() : '';
        const quantity = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        
        if (name && quantity > 0 && price >= 0) {
            items.push({ name, quantity, price, subtotal: quantity * price });
        }
    });
    return items;
}

// =========================================
// 5. INITIALIZATION
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    const tarikhInput = document.getElementById('tarikh');
    if (tarikhInput) tarikhInput.valueAsDate = new Date();
    
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Muatkan produk pengguna dan masukkan ke dalam global cache terlebih dahulu
    userProductsCache = await loadUserProducts();
    
    addItemRow();
    currentUserBusinessType = await getUserBusinessType();
    renderDynamicCategories(currentUserBusinessType);
    setupJenisTransaksiListener();
    await loadRecords();
});

// =========================================
// 6. FORM SUBMISSION
// =========================================
const jualanForm = document.getElementById('jualanForm');
if (jualanForm) {
    jualanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const user = await checkAuth();
        if (!user) {
            alert('Sila log masuk terlebih dahulu');
            window.location.href = 'login.html';
            return;
        }
        
        const tarikh = document.getElementById('tarikh').value;
        const jenis = document.getElementById('jenis').value;
        const kategori = document.getElementById('kategori').value;
        const items = getItemsData();
        const total = calculateTotalAmount();
        
        if (!tarikh) { alert('Sila pilih tarikh'); return; }
        if (!kategori) { alert('Sila pilih kategori'); return; }
        if (items.length === 0) { alert('Sila tambah sekurang-kurangnya satu item lengkap dengan nama'); return; }
        if (total <= 0) { alert('Jumlah mesti lebih dari RM0'); return; }
        
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Menyimpan...';
        
        try {
            const { error } = await supabaseClient
                .from('jualan_records')
                .insert([{
                    user_id: user.id,
                    tarikh: tarikh,
                    jenis: jenis,
                    kategori: kategori,
                    jumlah: total,
                    items: items,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) throw error;
            
            document.getElementById('jualanForm').reset();
            document.getElementById('tarikh').valueAsDate = new Date();
            document.getElementById('itemsList').innerHTML = '';
            itemCounter = 0;
            
            // Muatkan semula produk terkini jika ada perubahan di database
            userProductsCache = await loadUserProducts();
            addItemRow();
            renderDynamicCategories(currentUserBusinessType);
            
            const formMessage = document.getElementById('formMessage');
            formMessage.style.display = 'block';
            formMessage.className = 'message-box success';
            formMessage.innerHTML = '✅ Rekod berjaya disimpan!';
            setTimeout(() => { formMessage.style.display = 'none'; }, 3000);
            
            await loadRecords();
        } catch (error) {
            const formMessage = document.getElementById('formMessage');
            formMessage.style.display = 'block';
            formMessage.className = 'message-box error';
            formMessage.innerHTML = `❌ Ralat: ${error.message}`;
            setTimeout(() => { formMessage.style.display = 'none'; }, 5000);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Simpan Rekod';
        }
    });
}

// =========================================
// 7. LOAD, FILTER, DISPLAY RECORDS
// =========================================
async function loadRecords() {
    const user = await checkAuth();
    if (!user) return;
    
    const rekodList = document.getElementById('rekodList');
    rekodList.innerHTML = '<p class="loading-text">📂 Loading rekod...</p>';
    
    try {
        const { data, error } = await supabaseClient
            .from('jualan_records')
            .select('*')
            .eq('user_id', user.id)
            .order('tarikh', { ascending: false });
        
        if (error) throw error;
        currentRecords = data || [];
        filterRecords();
    } catch (error) {
        rekodList.innerHTML = '<p class="error-text">❌ Ralat memuatkan rekod. Sila cuba lagi.</p>';
    }
}

function filterRecords() {
    const filter = document.getElementById('filterJenis')?.value || 'semua';
    currentFilter = filter;
    let filtered = currentRecords;
    if (filter !== 'semua') filtered = currentRecords.filter(record => record.jenis === filter);
    
    displayRecords(filtered);
    updateSummary(filtered);
    prepareChartData(filtered);
}

function displayRecords(records) {
    const rekodList = document.getElementById('rekodList');
    if (records.length === 0) {
        rekodList.innerHTML = '<p class="no-records">📭 Tiada rekod dijumpai. Tambah rekod baru di atas.</p>';
        return;
    }
    
    let html = '';
    records.forEach(record => {
        const tanggal = new Date(record.tarikh).toLocaleDateString('ms-MY');
        const jenisClass = record.jenis === 'jualan' ? 'jualan' : 'belanja';
        const jenisIcon = record.jenis === 'jualan' ? '💰' : '📉';
        const jenisText = record.jenis === 'jualan' ? 'Jualan' : 'Perbelanjaan';
        
        let itemsHtml = '';
        if (record.items && Array.isArray(record.items) && record.items.length > 0) {
            itemsHtml = '<div class="rekod-items">';
            record.items.forEach(item => {
                itemsHtml += `<div class="rekod-item-detail">• ${item.name} (${item.quantity} x RM${item.price.toFixed(2)}) = RM${item.subtotal.toFixed(2)}</div>`;
            });
            itemsHtml += '</div>';
        }
        
        html += `
            <div class="rekod-item ${jenisClass}" data-id="${record.id}">
                <div class="rekod-info">
                    <div class="rekod-tarikh">${tanggal}</div>
                    <div class="rekod-keterangan">${jenisIcon} ${jenisText} - ${record.kategori || 'Tiada kategori'}</div>
                    ${itemsHtml}
                </div>
                <div class="rekod-jumlah ${jenisClass}">RM ${(record.jumlah || 0).toFixed(2)}</div>
                <button class="rekod-delete" onclick="deleteRecord('${record.id}')">🗑️</button>
            </div>
        `;
    });
    rekodList.innerHTML = html;
}

function updateSummary(records) {
    let totalJualan = 0, totalBelanja = 0;
    records.forEach(record => {
        if (record.jenis === 'jualan') totalJualan += record.jumlah || 0;
        else totalBelanja += record.jumlah || 0;
    });
    const keuntungan = totalJualan - totalBelanja;
    
    document.getElementById('totalJualan').textContent = `RM ${totalJualan.toFixed(2)}`;
    document.getElementById('totalBelanja').textContent = `RM ${totalBelanja.toFixed(2)}`;
    const keuntunganEl = document.getElementById('keuntungan');
    keuntunganEl.textContent = `RM ${keuntungan.toFixed(2)}`;
    keuntunganEl.style.color = keuntungan >= 0 ? '#16a34a' : '#dc2626';
}

// =========================================
// 8. CHART FUNCTIONS
// =========================================
function prepareChartData(records) {
    const months = [];
    const jualanByMonth = {}, belanjaByMonth = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
        const monthLabel = d.toLocaleDateString('ms-MY', { month: 'short', year: 'numeric' });
        months.push({ key: monthKey, label: monthLabel });
        jualanByMonth[monthKey] = 0;
        belanjaByMonth[monthKey] = 0;
    }
    
    records.forEach(record => {
        if (!record.tarikh) return;
        const date = new Date(record.tarikh);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (jualanByMonth[monthKey] !== undefined) {
            if (record.jenis === 'jualan') jualanByMonth[monthKey] += record.jumlah || 0;
            else belanjaByMonth[monthKey] += record.jumlah || 0;
        }
    });
    
    updateChart(months.map(m => jualanByMonth[m.key]), months.map(m => belanjaByMonth[m.key]), months.map(m => m.label));
}

function updateChart(jualanData, belanjaData, labels) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    if (salesChart) salesChart.destroy();
    
    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Jualan (RM)', data: jualanData, backgroundColor: 'rgba(34, 197, 94, 0.6)', borderColor: 'rgb(34, 197, 94)', borderWidth: 1 },
                { label: 'Perbelanjaan (RM)', data: belanjaData, backgroundColor: 'rgba(239, 68, 68, 0.6)', borderColor: 'rgb(239, 68, 68)', borderWidth: 1 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (ctx) => `RM ${ctx.raw.toFixed(2)}` } } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Jumlah (RM)' } }, x: { title: { display: true, text: 'Bulan' } } }
        }
    });
}

async function deleteRecord(recordId) {
    if (!confirm('⚠️ Padam rekod ini? Tindakan ini tidak boleh dibatalkan.')) return;
    try {
        const { error } = await supabaseClient.from('jualan_records').delete().eq('id', recordId);
        if (error) throw error;
        await loadRecords();
    } catch (error) {
        alert('❌ Ralat memadam rekod: ' + error.message);
    }
}

async function generateReport() {
    if (currentRecords.length === 0) { alert('📭 Tiada rekod untuk dijana laporan.'); return; }
    
    let filtered = currentRecords;
    if (currentFilter !== 'semua') filtered = currentRecords.filter(record => record.jenis === currentFilter);
    
    let totalJualan = 0, totalBelanja = 0;
    filtered.forEach(record => {
        if (record.jenis === 'jualan') totalJualan += record.jumlah || 0;
        else totalBelanja += record.jumlah || 0;
    });
    const keuntungan = totalJualan - totalBelanja;
    const reportDate = new Date().toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' });
    
    let tableRows = '';
    filtered.forEach(record => {
        if (record.items && Array.isArray(record.items) && record.items.length > 0) {
            record.items.forEach(item => {
                tableRows += `<tr><td>${record.tarikh}</td><td>${record.jenis === 'jualan' ? '💰 Jualan' : '📉 Perbelanjaan'}</td><td>${record.kategori || '-'}</td><td>${item.name}</td><td>${item.quantity}</td><td>${item.price.toFixed(2)}</td><td>${item.subtotal.toFixed(2)}</td></tr>`;
            });
        } else {
            tableRows += `<tr><td>${record.tarikh}</td><td>${record.jenis === 'jualan' ? '💰 Jualan' : '📉 Perbelanjaan'}</td><td>${record.kategori || '-'}</td><td colspan="4">${record.keterangan || 'Tiada detail item'}</td></tr>`;
        }
    });
    
    const reportHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Laporan Kewangan - UsahawanDigital</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;padding:40px;background:white;}.report-container{max-width:1200px;margin:0 auto;}.report-header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #1a5f7a;}.report-header h1{color:#1a5f7a;}.summary-card{background:#f0f7ff;padding:20px;border-radius:12px;margin-bottom:30px;}.summary-grid{display:flex;justify-content:space-around;text-align:center;}.summary-item{background:white;padding:15px 25px;border-radius:10px;}.summary-item strong{font-size:24px;color:#1a5f7a;}.profit{color:#16a34a;}.loss{color:#dc2626;}table{width:100%;border-collapse:collapse;margin-top:20px;}th,td{border:1px solid #e2e8f0;padding:10px;text-align:left;}th{background:#1a5f7a;color:white;}.footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;}</style></head><body><div class="report-container"><div class="report-header"><h1>📊 Laporan Jualan & Perbelanjaan</h1><p>Portal UsahawanDigital | Dijana pada: ${reportDate}</p></div><div class="summary-card"><h3>💰 Ringkasan Kewangan</h3><div class="summary-grid"><div class="summary-item"><span>Jumlah Jualan</span><strong>RM ${totalJualan.toFixed(2)}</strong></div><div class="summary-item"><span>Jumlah Perbelanjaan</span><strong>RM ${totalBelanja.toFixed(2)}</strong></div><div class="summary-item"><span>Untung Bersih</span><strong class="${keuntungan >= 0 ? 'profit' : 'loss'}">RM ${keuntungan.toFixed(2)}</strong></div></div></div><h3>📋 Senarai Transaksi</h3><table><thead><tr><th>Tarikh</th><th>Jenis</th><th>Kategori</th><th>Item</th><th>Kuantiti</th><th>Harga (RM)</th><th>Jumlah (RM)</th></tr></thead><tbody>${tableRows}</tbody></table><div class="footer"><p>Dijana oleh Portal UsahawanDigital © ${new Date().getFullYear()}</p></div></div><script>window.onload=function(){window.print();};<\/script></body></html>`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportHtml);
    printWindow.document.close();
}

// =========================================
// 9. PRODUCT FETCH DATA FROM DATABASE
// =========================================
async function loadUserProducts() {
    const user = await checkAuth();
    if (!user) return [];
    
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .order('name', { ascending: true });
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}
