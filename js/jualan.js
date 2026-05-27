// Global variables
let currentRecords = [];
let currentFilter = 'semua';
let salesChart = null;
let itemCounter = 0;
let userItemsList = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Set default date
    const tarikhInput = document.getElementById('tarikh');
    if (tarikhInput) {
        tarikhInput.valueAsDate = new Date();
    }
    
    // Check auth and load records
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load user items from database
    await loadUserItems();
    
    // Add first empty item row
    await addItemRow();
    
    // Load records
    await loadRecords();
});

// Load user items from database
async function loadUserItems() {
    const user = await checkAuth();
    if (!user) return [];
    
    try {
        const { data, error } = await supabaseClient
            .from('user_items')
            .select('*')
            .eq('user_id', user.id)
            .order('item_name');
        
        if (error) throw error;
        userItemsList = data || [];
        return userItemsList;
    } catch (error) {
        console.error('Error loading items:', error);
        return [];
    }
}

// Function to add new item row with dropdown
async function addItemRow() {
    const itemsList = document.getElementById('itemsList');
    if (!itemsList) return;
    
    const itemId = Date.now() + itemCounter++;
    
    // Build options for dropdown
    let optionsHtml = '<option value="">-- Pilih Item (pilih atau taip baru) --</option>';
    userItemsList.forEach(item => {
        optionsHtml += `<option value="${item.item_name}" data-price="${item.item_price}" data-category="${item.category || ''}">${item.item_name} (RM${item.item_price.toFixed(2)})</option>`;
    });
    optionsHtml += '<option value="new">+ Tambah Item Baru (taip manual)</option>';
    
    const itemRow = document.createElement('div');
    itemRow.className = 'item-row';
    itemRow.id = `item-${itemId}`;
    itemRow.innerHTML = `
        <div class="item-col item-name-col">
            <label>Nama Item</label>
            <select class="item-select" onchange="onItemSelect(this, '${itemId}')">
                ${optionsHtml}
            </select>
            <input type="text" class="item-name manual-name" placeholder="Taip nama item baru" style="display:none; margin-top:5px;">
        </div>
        <div class="item-col item-qty-col">
            <label>Kuantiti</label>
            <input type="number" class="item-qty" value="1" min="1" step="1" required>
        </div>
        <div class="item-col item-price-col">
            <label>Harga (RM)</label>
            <input type="number" class="item-price" value="0" min="0" step="0.01" required>
        </div>
        <div class="item-col item-subtotal-col">
            <label>Jumlah (RM)</label>
            <span class="item-subtotal">RM 0.00</span>
        </div>
        <div class="item-col item-action-col">
            <button type="button" class="btn-remove-item" onclick="removeItemRow('${itemId}')">🗑️</button>
        </div>
    `;
    
    // Add event listeners
    const qtyInput = itemRow.querySelector('.item-qty');
    const priceInput = itemRow.querySelector('.item-price');
    
    qtyInput.addEventListener('input', () => calculateItemSubtotal(itemId));
    priceInput.addEventListener('input', () => calculateItemSubtotal(itemId));
    
    itemsList.appendChild(itemRow);
    calculateTotalAmount();
}

// Handle item select change
function onItemSelect(select, itemId) {
    const row = document.getElementById(`item-${itemId}`);
    if (!row) return;
    
    const priceInput = row.querySelector('.item-price');
    const manualNameInput = row.querySelector('.manual-name');
    const selectedOption = select.options[select.selectedIndex];
    const selectedValue = select.value;
    
    if (selectedValue === 'new') {
        // Show manual input for new item
        manualNameInput.style.display = 'block';
        manualNameInput.required = true;
        manualNameInput.focus();
        priceInput.value = '';
        priceInput.readOnly = false;
        
        // Clear select and mark that we're adding new item
        select.style.border = '1px solid #ff9800';
        
        // Add event to manual name input
        manualNameInput.oninput = function() {
            if (this.value.trim()) {
                select.style.border = '1px solid #cbd5e1';
            }
        };
    } else if (selectedValue && selectedValue !== '') {
        // Existing item selected
        manualNameInput.style.display = 'none';
        manualNameInput.required = false;
        const price = selectedOption.getAttribute('data-price');
        if (price) {
            priceInput.value = parseFloat(price).toFixed(2);
        }
        priceInput.readOnly = false;
        select.style.border = '1px solid #cbd5e1';
    } else {
        // No selection
        manualNameInput.style.display = 'none';
        priceInput.value = '';
    }
    
    calculateItemSubtotal(itemId);
}

// Function to get item name from row
function getItemNameFromRow(row) {
    const select = row.querySelector('.item-select');
    const manualName = row.querySelector('.manual-name');
    
    if (select.value === 'new' && manualName.value.trim()) {
        return manualName.value.trim();
    } else if (select.value && select.value !== '' && select.value !== 'new') {
        return select.value;
    }
    return '';
}

// Function to remove item row
function removeItemRow(itemId) {
    const itemRow = document.getElementById(`item-${itemId}`);
    if (itemRow) {
        itemRow.remove();
        calculateTotalAmount();
    }
}

// Function to calculate subtotal for an item
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

// Function to calculate total amount from all items
function calculateTotalAmount() {
    const itemRows = document.querySelectorAll('.item-row');
    let total = 0;
    
    itemRows.forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        total += qty * price;
    });
    
    const totalDisplay = document.getElementById('totalAmountDisplay');
    if (totalDisplay) {
        totalDisplay.textContent = `RM ${total.toFixed(2)}`;
    }
    
    return total;
}

// Function to get items data from form
function getItemsData() {
    const itemRows = document.querySelectorAll('.item-row');
    const items = [];
    
    itemRows.forEach(row => {
        const name = getItemNameFromRow(row);
        const quantity = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        
        if (name && quantity > 0 && price > 0) {
            items.push({
                name: name,
                quantity: quantity,
                price: price,
                subtotal: quantity * price
            });
        }
    });
    
    return items;
}

// Handle form submission
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
        
        if (!tarikh) {
            alert('Sila pilih tarikh');
            return;
        }
        
        if (items.length === 0) {
            alert('Sila tambah sekurang-kurangnya satu item');
            return;
        }
        
        if (total <= 0) {
            alert('Jumlah mesti lebih dari RM0');
            return;
        }
        
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Menyimpan...';
        
        try {
            const { error } = await supabaseClient
                .from('jualan_records')
                .insert([
                    {
                        user_id: user.id,
                        tarikh: tarikh,
                        jenis: jenis,
                        kategori: kategori,
                        jumlah: total,
                        items: items,
                        created_at: new Date().toISOString()
                    }
                ]);
            
            if (error) throw error;
            
            // Check if there are new items to save to user_items
            for (const item of items) {
                // Check if item already exists in user_items
                const exists = userItemsList.some(ui => ui.item_name.toLowerCase() === item.name.toLowerCase());
                if (!exists) {
                    await supabaseClient
                        .from('user_items')
                        .insert([{
                            user_id: user.id,
                            item_name: item.name,
                            item_price: item.price,
                            category: kategori
                        }]);
                }
            }
            
            // Reload user items
            await loadUserItems();
            
            // Reset form
            document.getElementById('jualanForm').reset();
            document.getElementById('tarikh').valueAsDate = new Date();
            
            // Clear items and add one empty row
            const itemsList = document.getElementById('itemsList');
            if (itemsList) {
                itemsList.innerHTML = '';
            }
            itemCounter = 0;
            await addItemRow();
            
            // Show success message
            const formMessage = document.getElementById('formMessage');
            formMessage.style.display = 'block';
            formMessage.className = 'message-box success';
            formMessage.innerHTML = '✅ Rekod berjaya disimpan!';
            setTimeout(() => {
                formMessage.style.display = 'none';
            }, 3000);
            
            // Reload records
            await loadRecords();
            
        } catch (error) {
            console.error('Error saving record:', error);
            const formMessage = document.getElementById('formMessage');
            formMessage.style.display = 'block';
            formMessage.className = 'message-box error';
            formMessage.innerHTML = `❌ Ralat: ${error.message}`;
            setTimeout(() => {
                formMessage.style.display = 'none';
            }, 5000);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Simpan Rekod';
        }
    });
}

// Load records from database
async function loadRecords() {
    const user = await checkAuth();
    if (!user) return;
    
    const rekodList = document.getElementById('rekodList');
    if (!rekodList) return;
    
    rekodList.innerHTML = '<p class="loading-text">📂 Loading rekod...</p>';
    
    try {
        let query = supabaseClient
            .from('jualan_records')
            .select('*')
            .eq('user_id', user.id)
            .order('tarikh', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        currentRecords = data || [];
        filterRecords();
        
    } catch (error) {
        console.error('Error loading records:', error);
        rekodList.innerHTML = '<p class="error-text">❌ Ralat memuatkan rekod. Sila cuba lagi.</p>';
    }
}

// Filter and display records
function filterRecords() {
    const filter = document.getElementById('filterJenis')?.value || 'semua';
    currentFilter = filter;
    
    let filtered = currentRecords;
    if (filter !== 'semua') {
        filtered = currentRecords.filter(record => record.jenis === filter);
    }
    
    displayRecords(filtered);
    updateSummary(filtered);
    prepareChartData(filtered);
}

// Display records in list
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
        
        // Display items detail
        let itemsHtml = '';
        if (record.items && Array.isArray(record.items) && record.items.length > 0) {
            itemsHtml = '<div class="rekod-items">';
            record.items.forEach(item => {
                itemsHtml += `<div class="rekod-item-detail">• ${item.name} (${item.quantity} x RM${item.price.toFixed(2)}) = RM${item.subtotal.toFixed(2)}</div>`;
            });
            itemsHtml += '</div>';
        } else if (record.keterangan) {
            itemsHtml = `<div class="rekod-items"><div class="rekod-item-detail">• ${record.keterangan}</div></div>`;
        }
        
        html += `
            <div class="rekod-item ${jenisClass}" data-id="${record.id}">
                <div class="rekod-info">
                    <div class="rekod-tarikh">${tanggal}</div>
                    <div class="rekod-keterangan">${jenisIcon} ${jenisText} - ${record.kategori}</div>
                    ${itemsHtml}
                </div>
                <div class="rekod-jumlah ${jenisClass}">
                    RM ${(record.jumlah || 0).toFixed(2)}
                </div>
                <button class="rekod-delete" onclick="deleteRecord('${record.id}')">🗑️</button>
            </div>
        `;
    });
    
    rekodList.innerHTML = html;
}

// Update summary cards
function updateSummary(records) {
    let totalJualan = 0;
    let totalBelanja = 0;
    
    records.forEach(record => {
        if (record.jenis === 'jualan') {
            totalJualan += record.jumlah || 0;
        } else {
            totalBelanja += record.jumlah || 0;
        }
    });
    
    const keuntungan = totalJualan - totalBelanja;
    
    const totalJualanEl = document.getElementById('totalJualan');
    const totalBelanjaEl = document.getElementById('totalBelanja');
    const keuntunganEl = document.getElementById('keuntungan');
    
    if (totalJualanEl) totalJualanEl.textContent = `RM ${totalJualan.toFixed(2)}`;
    if (totalBelanjaEl) totalBelanjaEl.textContent = `RM ${totalBelanja.toFixed(2)}`;
    if (keuntunganEl) {
        keuntunganEl.textContent = `RM ${keuntungan.toFixed(2)}`;
        keuntunganEl.style.color = keuntungan >= 0 ? '#16a34a' : '#dc2626';
    }
}

// Prepare chart data
function prepareChartData(records) {
    const months = [];
    const jualanByMonth = {};
    const belanjaByMonth = {};
    
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
            if (record.jenis === 'jualan') {
                jualanByMonth[monthKey] += record.jumlah || 0;
            } else {
                belanjaByMonth[monthKey] += record.jumlah || 0;
            }
        }
    });
    
    const labels = months.map(m => m.label);
    const jualanData = months.map(m => jualanByMonth[m.key]);
    const belanjaData = months.map(m => belanjaByMonth[m.key]);
    
    updateChart(jualanData, belanjaData, labels);
}

// Update chart
function updateChart(jualanData, belanjaData, labels) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Jualan (RM)',
                    data: jualanData,
                    backgroundColor: 'rgba(34, 197, 94, 0.6)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1
                },
                {
                    label: 'Perbelanjaan (RM)',
                    data: belanjaData,
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `RM ${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Jumlah (RM)' }
                },
                x: {
                    title: { display: true, text: 'Bulan' }
                }
            }
        }
    });
}

// Delete record
async function deleteRecord(recordId) {
    if (!confirm('⚠️ Padam rekod ini? Tindakan ini tidak boleh dibatalkan.')) return;
    
    try {
        const { error } = await supabaseClient
            .from('jualan_records')
            .delete()
            .eq('id', recordId);
        
        if (error) throw error;
        
        await loadRecords();
        
    } catch (error) {
        console.error('Error deleting record:', error);
        alert('❌ Ralat memadam rekod: ' + error.message);
    }
}

// Generate Professional PDF Report
async function generateReport() {
    if (currentRecords.length === 0) {
        alert('📭 Tiada rekod untuk dijana laporan.');
        return;
    }
    
    let filtered = currentRecords;
    if (currentFilter !== 'semua') {
        filtered = currentRecords.filter(record => record.jenis === currentFilter);
    }
    
    let totalJualan = 0;
    let totalBelanja = 0;
    
    filtered.forEach(record => {
        if (record.jenis === 'jualan') {
            totalJualan += record.jumlah || 0;
        } else {
            totalBelanja += record.jumlah || 0;
        }
    });
    
    const keuntungan = totalJualan - totalBelanja;
    const reportDate = new Date().toLocaleDateString('ms-MY', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Build HTML for report
    let tableRows = '';
    filtered.forEach(record => {
        if (record.items && Array.isArray(record.items) && record.items.length > 0) {
            record.items.forEach(item => {
                tableRows += `
                    <tr>
                        <td>${record.tarikh}</td>
                        <td>${record.jenis === 'jualan' ? '💰 Jualan' : '📉 Perbelanjaan'}</td>
                        <td>${record.kategori}</td>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>${item.subtotal.toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
            tableRows += `
                <tr>
                    <td>${record.tarikh}</td>
                    <td>${record.jenis === 'jualan' ? '💰 Jualan' : '📉 Perbelanjaan'}</td>
                    <td>${record.kategori}</td>
                    <td colspan="4">${record.keterangan || 'Tiada detail item'}</td>
                </tr>
            `;
        }
    });
    
    const reportHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Laporan Kewangan - UsahawanDigital</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Arial', sans-serif;
                    padding: 40px;
                    background: white;
                    color: #1e293b;
                }
                .report-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .report-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #1a5f7a;
                }
                .report-header h1 {
                    color: #1a5f7a;
                    margin-bottom: 10px;
                }
                .summary-card {
                    background: #f0f7ff;
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 30px;
                }
                .summary-card h3 {
                    color: #1a5f7a;
                    margin-bottom: 15px;
                }
                .summary-grid {
                    display: flex;
                    justify-content: space-around;
                    text-align: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                .summary-item {
                    background: white;
                    padding: 15px 25px;
                    border-radius: 10px;
                    min-width: 150px;
                }
                .summary-item span {
                    display: block;
                    font-size: 14px;
                    color: #64748b;
                }
                .summary-item strong {
                    font-size: 24px;
                    color: #1a5f7a;
                }
                .profit { color: #16a34a; }
                .loss { color: #dc2626; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    border: 1px solid #e2e8f0;
                    padding: 10px;
                    text-align: left;
                }
                th {
                    background: #1a5f7a;
                    color: white;
                }
                .footer {
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e2e8f0;
                    color: #94a3b8;
                    font-size: 12px;
                }
                @media print {
                    body { padding: 20px; }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="report-header">
                    <h1>📊 Laporan Jualan & Perbelanjaan</h1>
                    <p>Portal UsahawanDigital | Dijana pada: ${reportDate}</p>
                </div>
                
                <div class="summary-card">
                    <h3>💰 Ringkasan Kewangan</h3>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span>Jumlah Jualan</span>
                            <strong>RM ${totalJualan.toFixed(2)}</strong>
                        </div>
                        <div class="summary-item">
                            <span>Jumlah Perbelanjaan</span>
                            <strong>RM ${totalBelanja.toFixed(2)}</strong>
                        </div>
                        <div class="summary-item">
                            <span>Untung Bersih</span>
                            <strong class="${keuntungan >= 0 ? 'profit' : 'loss'}">RM ${keuntungan.toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
                
                <h3>📋 Senarai Transaksi</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Tarikh</th>
                            <th>Jenis</th>
                            <th>Kategori</th>
                            <th>Item</th>
                            <th>Kuantiti</th>
                            <th>Harga (RM)</th>
                            <th>Jumlah (RM)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>Dijana oleh Portal UsahawanDigital © ${new Date().getFullYear()}</p>
                    <p>Portal literasi digital untuk usahawan mikro Malaysia</p>
                </div>
            </div>
            <script>
                window.onload = function() { window.print(); };
            <\/script>
        </body>
        </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportHtml);
    printWindow.document.close();
}
