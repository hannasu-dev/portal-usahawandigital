// ==========================================================================
// GLOBAL VARIABLES
// ==========================================================================
let currentBusinessType = 'fnb';
let currentProducts = [];
let productToDelete = null;

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    await loadUserProfile(user.id);
    await loadProducts();
    setupEventListeners();
});

// ==========================================================================
// PROFILE FUNCTIONS
// ==========================================================================
async function loadUserProfile(userId) {
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) throw error;
        
        if (profile) {
            document.getElementById('userName').textContent = profile.full_name || 'Usahawan';
            document.getElementById('businessNameDisplay').textContent = `🏪 Perniagaan: ${profile.business_name || 'Belum ditetapkan'}`;
            
            let businessType = profile.business_type || profile.jenis_perniagaan || 'fnb';
            currentBusinessType = businessType;
            localStorage.setItem('userBusinessType', businessType);
            
            const typeMap = { 'fnb': '🍔 F&B', 'retail': '👗 Retail', 'servis': '✂️ Servis' };
            document.getElementById('businessTypeDisplay').textContent = `📋 Jenis Bisnes: ${typeMap[businessType]}`;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// ==========================================================================
// PRODUCTS FUNCTIONS (Dalam Modal)
// ==========================================================================
async function loadProducts() {
    const user = await checkAuth();
    if (!user) return;
    
    const productsContainer = document.getElementById('productsListInModal');
    productsContainer.innerHTML = '<div class="loading-state">📂 Loading produk...</div>';
    
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        
        currentProducts = data || [];
        displayProductsInModal(currentProducts);
    } catch (error) {
        productsContainer.innerHTML = '<div class="loading-state">❌ Ralat memuatkan produk.</div>';
    }
}

function displayProductsInModal(products) {
    const container = document.getElementById('productsListInModal');
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state">📭 Tiada produk. Klik "+ Tambah Produk" untuk mulakan.</div>';
        return;
    }
    
    // Membina kotak skrol (modal-scroll-box)
    let html = `
        <div class="modal-scroll-box">
            <div class="modal-scroll-list">
    `;
    
    products.forEach(product => {
        html += `
            <div class="modal-product-row">
                <div class="product-details-left">
                    <span class="p-icon">📦</span>
                    <div class="p-texts">
                        <strong class="p-name">${escapeHtml(product.name)}</strong>
                        <span class="p-meta">RM ${product.price.toFixed(2)} • 📁 ${escapeHtml(product.category)}</span>
                    </div>
                </div>
                <div class="product-actions-right">
                    <button type="button" class="btn-action-edit" onclick="editProduct('${product.id}')" title="Edit">✏️</button>
                    <button type="button" class="btn-action-delete" onclick="confirmDeleteProduct('${product.id}')" title="Padam">🗑️</button>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Fungsi tambahan untuk keselamatan sekiranya belum ada dalam fail js anda
function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================================================
// EVENT LISTENERS & MODAL CONTROLS
// ==========================================================================
function setupEventListeners() {
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) editBtn.addEventListener('click', () => openProfileModal());
    
    const profileForm = document.getElementById('profileForm');
    if (profileForm) profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
    });
    
    const addProductBtn = document.getElementById('addProductInModalBtn');
    if (addProductBtn) addProductBtn.addEventListener('click', () => openProductModal());
    
    const productForm = document.getElementById('productForm');
    if (productForm) productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProduct();
    });
    
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', () => deleteProduct());
}

async function openProfileModal() {
    const user = await checkAuth();
    if (!user) return;
    
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        if (error) throw error;
        
        document.getElementById('editBusinessName').value = profile.business_name || '';
        document.getElementById('editBusinessType').value = profile.business_type || profile.jenis_perniagaan || 'fnb';
        
        await loadProducts();
        
        document.getElementById('profileModal').style.display = 'block';
    } catch (error) {
        alert('Error loading profile');
    }
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

async function updateProfile() {
    const user = await checkAuth();
    if (!user) return;
    
    const businessName = document.getElementById('editBusinessName').value;
    const businessType = document.getElementById('editBusinessType').value;
    const submitBtn = document.querySelector('#profileForm button[type="submit"]');
    const messageDiv = document.getElementById('profileMessage');
    
    submitBtn.disabled = true;
    messageDiv.style.display = 'none';
    
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({ business_name: businessName, business_type: businessType, jenis_perniagaan: businessType })
            .eq('id', user.id);
        if (error) throw error;
        
        localStorage.setItem('userBusinessType', businessType);
        currentBusinessType = businessType;
        
        const typeMap = { 'fnb': '🍔 F&B', 'retail': '👗 Retail', 'servis': '✂️ Servis' };
        document.getElementById('businessNameDisplay').textContent = `🏪 Perniagaan: ${businessName || 'Belum ditetapkan'}`;
        document.getElementById('businessTypeDisplay').textContent = `📋 Jenis Bisnes: ${typeMap[businessType]}`;
        
        messageDiv.style.display = 'block';
        messageDiv.className = 'message-box success';
        messageDiv.innerHTML = '✅ Profil berjaya dikemas kini!';
        
        setTimeout(() => closeProfileModal(), 1500);
    } catch (error) {
        messageDiv.style.display = 'block';
        messageDiv.className = 'message-box error';
        messageDiv.innerHTML = `❌ Error: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
    }
}

// ==========================================================================
// PRODUCT CRUD FUNCTIONS
// ==========================================================================
function populateCategoryDropdown(select, businessType) {
    const categories = {
        fnb: [
            { value: "Kek & Pastri", label: "🍰 Kek & Pastri" },
            { value: "Minuman", label: "🥤 Minuman" },
            { value: "Makanan Utama", label: "🍝 Makanan Utama" },
            { value: "Lain-lain", label: "📝 Lain-lain" }
        ],
        retail: [
            { value: "Pakaian", label: "👗 Pakaian" },
            { value: "Aksesori", label: "💍 Aksesori" },
            { value: "Kasut/Beg", label: "👟 Kasut/Beg" },
            { value: "Lain-lain", label: "📝 Lain-lain" }
        ],
        servis: [
            { value: "Servis Utama", label: "✂️ Servis Utama" },
            { value: "Rawatan", label: "💆 Rawatan" },
            { value: "Produk Tambahan", label: "🧴 Produk Tambahan" },
            { value: "Lain-lain", label: "📝 Lain-lain" }
        ]
    };
    const catList = categories[businessType] || categories.fnb;
    select.innerHTML = '<option value="">-- Pilih Kategori --</option>';
    catList.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;
        option.textContent = cat.label;
        select.appendChild(option);
    });
}

function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    form.reset();
    document.getElementById('editProductId').value = '';
    document.getElementById('productMessage').style.display = 'none';
    
    populateCategoryDropdown(document.getElementById('productCategory'), currentBusinessType);
    
    if (productId) {
        const product = currentProducts.find(p => p.id === productId);
        if (product) {
            title.textContent = '✏️ Edit Produk';
            document.getElementById('editProductId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productCategory').value = product.category;
        }
    } else {
        title.textContent = '➕ Tambah Produk';
    }
    modal.style.display = 'block';
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
}

async function saveProduct() {
    const user = await checkAuth();
    if (!user) return;
    
    const editId = document.getElementById('editProductId').value;
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const category = document.getElementById('productCategory').value;
    const submitBtn = document.querySelector('#productForm button[type="submit"]');
    const messageDiv = document.getElementById('productMessage');
    
    if (!name || isNaN(price) || price <= 0 || !category) {
        messageDiv.style.display = 'block';
        messageDiv.className = 'message-box error';
        messageDiv.innerHTML = '❌ Sila lengkapkan semua maklumat.';
        return;
    }
    
    submitBtn.disabled = true;
    messageDiv.style.display = 'none';
    
    try {
        if (editId) {
            const { error } = await supabaseClient
                .from('products')
                .update({ name, price, category, updated_at: new Date().toISOString() })
                .eq('id', editId);
            if (error) throw error;
            messageDiv.innerHTML = '✅ Produk dikemas kini!';
        } else {
            const { error } = await supabaseClient
                .from('products')
                .insert([{ user_id: user.id, name, price, category, business_type: currentBusinessType }]);
            if (error) throw error;
            messageDiv.innerHTML = '✅ Produk ditambah!';
        }
        messageDiv.className = 'message-box success';
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            closeProductModal();
            loadProducts(); 
        }, 1500);
    } catch (error) {
        messageDiv.className = 'message-box error';
        messageDiv.innerHTML = `❌ Error: ${error.message}`;
        messageDiv.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
    }
}

function editProduct(productId) {
    openProductModal(productId);
}

function confirmDeleteProduct(productId) {
    productToDelete = productId;
    document.getElementById('deleteModal').style.display = 'block';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    productToDelete = null;
}

async function deleteProduct() {
    if (!productToDelete) return;
    
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Memadam...';
    
    try {
        const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', productToDelete);
        if (error) throw error;
        
        closeDeleteModal();
        await loadProducts();
    } catch (error) {
        alert('❌ Ralat memadam: ' + error.message);
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Padam';
    }
}

// ==========================================================================
// CLOSING MODALS VIA OUTSIDE WINDOW CLICKS
// ==========================================================================
window.onclick = function(event) {
    if (event.target === document.getElementById('profileModal')) closeProfileModal();
    if (event.target === document.getElementById('productModal')) closeProductModal();
    if (event.target === document.getElementById('deleteModal')) closeDeleteModal();
}
