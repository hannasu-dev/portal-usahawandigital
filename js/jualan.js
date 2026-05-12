// Global variables
let currentRecords = [];
let currentFilter = 'semua';
let salesChart = null;

// 1. Load records apabila halaman dimuatkan
document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndLoad();
});

async function checkAuthAndLoad() {
    const user = await checkAuth();
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Pastikan ID userName wujud di HTML anda
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.textContent = user.email;
    
    loadRecords();
}

// 2. Kendalikan penghantaran borang (Form Submission)
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
            
            // Kosongkan borang
            jualanForm.reset();
            document.getElementById('tarikh').valueAsDate = new Date();
            
            // Muat semula rekod & carta
            loadRecords();
            
        } catch (error) {
            console.error('Error saving record:', error);
            alert('Ralat menyimpan rekod: ' + error.message);
        }
    });
}

// 3. Fungsi memuatkan data dari Supabase
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
        
        // Simpan data ke dalam variable global
        currentRecords = data || [];
        
        // 1. Tapis dan papar senarai
        filterRecords();
        
        // 2. Sediakan dan kemaskini carta (Langkah 5)
        prepareChartData(currentRecords);
        
    } catch (error) {
        console.error('Error loading records:', error);
        rekodList.innerHTML = '<p>Ralat memuatkan rekod. Sila cuba lagi.</p>';
    }
}

// 4. Penapisan Rekod (Filter)
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

// 5. Paparkan senarai rekod di HTML
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

// 6. Kemaskini Ringkasan (Summary)
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

// 7. Padam Rekod
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

// ==========================================
// LOGIK CARTA (CHART.JS)
// ==========================================

function updateChart(jualanData, belanjaData, bulanLabels) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: bulanLabels,
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
            maintainAspectRatio: false,
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
                }
            }
        }
    });
}

function prepareChartData(records) {
    const months = [];
    const jualanByMonth = {};
    const belanjaByMonth = {};
    
    const now = new Date();
    // Ambil data 6 bulan terakhir
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
        const monthLabel = d.toLocaleDateString('ms-MY', { month: 'short', year: 'numeric' });
        months.push({ key: monthKey, label: monthLabel });
        jualanByMonth[monthKey] = 0;
        belanjaByMonth[monthKey] = 0;
    }
    
    records.forEach(record => {
        const date = new Date(record.tarikh);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        if (jualanByMonth[monthKey] !== undefined) {
            if (record.jenis === 'jualan') {
                jualanByMonth[monthKey] += record.jumlah;
            } else {
                belanjaByMonth[monthKey] += record.jumlah;
            }
        }
    });
    
    const labels = months.map(m => m.label);
    const jualanData = months.map(m => jualanByMonth[m.key]);
    const belanjaData = months.map(m => belanjaByMonth[m.key]);
    
    updateChart(jualanData, belanjaData, labels);
}

// 8. Jana Laporan HTML/PDF
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
    
    // Create PDF using html2pdf library
    // First, create a hidden div for PDF content
    const pdfContent = document.createElement('div');
    pdfContent.style.padding = '20px';
    pdfContent.style.fontFamily = 'Arial, sans-serif';
    
    pdfContent.innerHTML = `
        <h1 style="color: #1a5f7a;">Laporan Jualan & Perbelanjaan</h1>
        <p>Tarikh laporan: ${new Date().toLocaleDateString('ms-MY')}</p>
        
        <div style="margin: 20px 0; padding: 15px; background: #f0f7ff; border-radius: 8px;">
            <p><strong>Ringkasan Kewangan</strong></p>
            <p>Jumlah Jualan: RM ${totalJualan.toFixed(2)}</p>
            <p>Jumlah Perbelanjaan: RM ${totalBelanja.toFixed(2)}</p>
            <p>Untung Bersih: RM ${keuntungan.toFixed(2)}</p>
        </div>
        
        <h3>Senarai Transaksi</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #1a5f7a; color: white;">
                    <th style="padding: 8px; border: 1px solid #ddd;">Tarikh</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Jenis</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Kategori</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Jumlah (RM)</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Keterangan</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(record => `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">${record.tarikh}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${record.jenis === 'jualan' ? 'Jualan' : 'Perbelanjaan'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${record.kategori}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${record.jumlah.toFixed(2)}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${record.keterangan || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <p style="margin-top: 20px;">Dijana oleh Portal UsahawanDigital</p>
    `;
    
    // Open print window (which can save as PDF)
    const printWindow = window.open('', '_blank');
    printWindow.document.write(pdfContent.innerHTML);
    printWindow.document.close();
    printWindow.print();
}
