// Tab Navigation
document.querySelectorAll('.tab-record-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-record-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-record-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');
        
        // Refresh data when tab changes
        if (tabId === 'harian') loadDailySummary();
        if (tabId === 'bulanan') loadMonthlySummary();
    });
});

// Load Daily Summary
async function loadDailySummary() {
    const user = await checkAuth();
    if (!user) return;
    
    const container = document.getElementById('dailySummaryList');
    container.innerHTML = '<div class="loading-state">📂 Loading...</div>';
    
    try {
        const { data, error } = await supabaseClient
            .from('jualan_records')
            .select('*')
            .eq('user_id', user.id)
            .order('tarikh', { ascending: false });
        
        if (error) throw error;
        
        // Group by date
        const dailyMap = new Map();
        data.forEach(record => {
            const date = record.tarikh;
            if (!dailyMap.has(date)) {
                dailyMap.set(date, { jualan: 0, belanja: 0 });
            }
            if (record.jenis === 'jualan') {
                dailyMap.get(date).jualan += record.jumlah;
            } else {
                dailyMap.get(date).belanja += record.jumlah;
            }
        });
        
        // Convert to array and sort
        const dailyArray = Array.from(dailyMap.entries()).map(([date, values]) => ({
            date,
            jualan: values.jualan,
            belanja: values.belanja,
            untung: values.jualan - values.belanja
        })).slice(0, 30); // Last 30 days
        
        if (dailyArray.length === 0) {
            container.innerHTML = '<div class="empty-state">📭 Tiada rekod</div>';
            return;
        }
        
        let html = '';
        dailyArray.forEach(day => {
            const profitClass = day.untung >= 0 ? 'summary-jualan' : 'summary-belanja';
            html += `
                <div class="summary-card-item">
                    <span class="summary-date">📅 ${day.date}</span>
                    <div class="summary-stats">
                        <span class="summary-jualan">💰 RM ${day.jualan.toFixed(2)}</span>
                        <span class="summary-belanja">📉 RM ${day.belanja.toFixed(2)}</span>
                        <span class="${profitClass}">🎯 RM ${day.untung.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        
    } catch (error) {
        container.innerHTML = '<div class="error-state">❌ Error loading data</div>';
    }
}

// Load Monthly Summary
async function loadMonthlySummary() {
    const user = await checkAuth();
    if (!user) return;
    
    const container = document.getElementById('monthlySummaryList');
    container.innerHTML = '<div class="loading-state">📂 Loading...</div>';
    
    try {
        const { data, error } = await supabaseClient
            .from('jualan_records')
            .select('*')
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        // Group by month
        const monthlyMap = new Map();
        data.forEach(record => {
            const date = new Date(record.tarikh);
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            const monthName = date.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });
            
            if (!monthlyMap.has(monthKey)) {
                monthlyMap.set(monthKey, { name: monthName, jualan: 0, belanja: 0 });
            }
            if (record.jenis === 'jualan') {
                monthlyMap.get(monthKey).jualan += record.jumlah;
            } else {
                monthlyMap.get(monthKey).belanja += record.jumlah;
            }
        });
        
        const monthlyArray = Array.from(monthlyMap.entries())
            .map(([key, values]) => ({
                key,
                ...values,
                untung: values.jualan - values.belanja
            }))
            .sort((a, b) => b.key.localeCompare(a.key));
        
        if (monthlyArray.length === 0) {
            container.innerHTML = '<div class="empty-state">📭 Tiada rekod</div>';
            return;
        }
        
        let html = '';
        monthlyArray.forEach(month => {
            const profitClass = month.untung >= 0 ? 'summary-jualan' : 'summary-belanja';
            html += `
                <div class="summary-card-item">
                    <span class="summary-date">📊 ${month.name}</span>
                    <div class="summary-stats">
                        <span class="summary-jualan">💰 RM ${month.jualan.toFixed(2)}</span>
                        <span class="summary-belanja">📉 RM ${month.belanja.toFixed(2)}</span>
                        <span class="${profitClass}">🎯 RM ${month.untung.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        
    } catch (error) {
        container.innerHTML = '<div class="error-state">❌ Error loading data</div>';
    }
}

// Update existing filterRecords to also refresh summaries
async function filterRecords() {
    const filter = document.getElementById('filterJenis')?.value || 'semua';
    currentFilter = filter;
    
    let filtered = currentRecords;
    if (filter !== 'semua') {
        filtered = currentRecords.filter(record => record.jenis === filter);
    }
    
    displayRecords(filtered);
    updateSummary(filtered);
    prepareChartData(filtered);
    
    // Refresh summaries if their tabs are active
    const activeTab = document.querySelector('.tab-record-btn.active')?.getAttribute('data-tab');
    if (activeTab === 'harian') await loadDailySummary();
    if (activeTab === 'bulanan') await loadMonthlySummary();
}
