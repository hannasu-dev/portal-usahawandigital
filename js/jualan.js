let currentRecords = [];
let currentFilter = 'semua';

// Load records on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndLoad();
});

async function checkAuthAndLoad() {
    const user = await checkAuth();
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('userName').textContent = user.email;
    loadRecords();
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
        const jumlah = parseFloat(document.getElementById('jumlah').value);
        const keterangan = document.getElementById('keterangan').value;
        
        if (!tarikh || isNaN(jumlah) || jumlah <= 0) {
            alert('Sila lengkapkan semua maklumat yang diperlukan');
            return;
        }
        
        try {
            const { error } = await supabaseClient
                .from('jualan_records')
                .insert([
                    {
                        user_id: user.id,
                        tarikh: tarikh,
                        jenis: jenis,
                        kategori: kategori,
                        jumlah: jumlah,
                        keterangan: keterangan,
                        created_at: new Date().toISOString()
                    }
                ]);
            
            if (error) throw error;
            
            // Clear form
            document.getElementById('jualanForm').reset();
            document.getElementById('tarikh').valueAsDate = new Date();
            
            // Reload records
            loadRecords();
            
        } catch (error) {
            console.error('Error saving record:', error);
            alert('Ralat menyimpan rekod: ' + error.message);
        }
    });
}

async function loadRecords() {
    const user = await checkAuth();
    if (!user) return;
    
    const rekodList = document.getElementById('rekodList');
    if (!rekodList) return;
    
    rekodList.innerHTML = '<p>Loading rekod...</p>';
    
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
        rekodList.innerHTML = '<p>Ralat memuatkan rekod. Sila cuba lagi.</p>';
    }
}

function filterRecords() {
    const filter = document.getElementById('filterJenis')?.value || 'semua';
    currentFilter = filter;
    
    let filtered = currentRecords;
    if (filter !== 'semua') {
        filtered = currentRecords.filter(record => record.jenis === filter);
    }
    
    displayRecords(filtered);
    updateSummary(filtered);
}

function displayRecords(records) {
    const rekodList = document.getElementById('rekodList');
    
    if (records.length === 0) {
        rekodList.innerHTML = '<p class="no-records">Tiada rekod dijumpai. Tambah rekod baru di atas.</p>';
        return;
    }
    
    let html = '';
    records.forEach(record => {
        const tanggal = new Date(record.tarikh).toLocaleDateString('ms-MY');
        const jenisClass = record.jenis === 'jualan' ? 'jualan' : 'belanja';
        const jenisIcon = record.jenis === 'jualan' ? '💰' : '📉';
        const jenisText = record.jenis === 'jualan' ? 'Jualan' : 'Perbelanjaan';
        
        html += `
            <div class="rekod-item ${jenisClass}">
                <div class="rekod-info">
                    <div class="rekod-tarikh">${tanggal}</div>
                    <div class="rekod-keterangan">${jenisIcon} ${jenisText} - ${record.kategori}</div>
                    ${record.keterangan ? `<div class="rekod-catatan">${record.keterangan}</div>` : ''}
                </div>
                <div class="rekod-jumlah ${jenisClass}">
                    RM ${record.jumlah.toFixed(2)}
                </div>
                <button class="rekod-delete" onclick="deleteRecord('${record.id}')">🗑️</button>
            </div>
        `;
    });
    
    rekodList.innerHTML = html;
}

function updateSummary(records) {
    let totalJualan = 0;
    let totalBelanja = 0;
    
    records.forEach(record => {
        if (record.jenis === 'jualan') {
            totalJualan += record.jumlah;
        } else {
            totalBelanja += record.jumlah;
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

async function deleteRecord(recordId) {
    if (!confirm('Padam rekod ini?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('jualan_records')
            .delete()
            .eq('id', recordId);
        
        if (error) throw error;
        
        loadRecords();
        
    } catch (error) {
        console.error('Error deleting record:', error);
        alert('Ralat memadam rekod: ' + error.message);
    }
}

function generateReport() {
    if (currentRecords.length === 0) {
        alert('Tiada rekod untuk dijana laporan.');
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
            totalJualan += record.jumlah;
        } else {
            totalBelanja += record.jumlah;
        }
    });
    
    const keuntungan = totalJualan - totalBelanja;
    
    let reportHtml = `
        <html>
        <head>
            <title>Laporan Jualan - UsahawanDigital</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #1a5f7a; }
                .summary { margin: 20px 0; padding: 15px; background: #f0f7ff; border-radius: 8px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #1a5f7a; color: white; }
                .total-jualan { color: green; font-weight: bold; }
                .total-belanja { color: red; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>Laporan Jualan & Perbelanjaan</h1>
            <p>Tarikh laporan: ${new Date().toLocaleDateString('ms-MY')}</p>
            
            <div class="summary">
                <p><strong>Ringkasan Kewangan</strong></p>
                <p>Jumlah Jualan: RM ${totalJualan.toFixed(2)}</p>
                <p>Jumlah Perbelanjaan: RM ${totalBelanja.toFixed(2)}</p>
                <p>Untung Bersih: RM ${keuntungan.toFixed(2)}</p>
            </div>
            
            <h3>Senarai Transaksi</h3>
            <table>
                <thead>
                    <tr><th>Tarikh</th><th>Jenis</th><th>Kategori</th><th>Jumlah (RM)</th><th>Keterangan</th></tr>
                </thead>
                <tbody>
    `;
    
    filtered.forEach(record => {
        reportHtml += `
            <tr>
                <td>${record.tarikh}</td>
                <td>${record.jenis === 'jualan' ? 'Jualan' : 'Perbelanjaan'}</td>
                <td>${record.kategori}</td>
                <td>${record.jumlah.toFixed(2)}</td>
                <td>${record.keterangan || '-'}</td>
            </tr>
        `;
    });
    
    reportHtml += `
                </tbody>
            </table>
            <p>Dijana oleh Portal UsahawanDigital</p>
        </body>
        </html>
    `;
    
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan_jualan_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Laporan siap dimuat turun!');
}