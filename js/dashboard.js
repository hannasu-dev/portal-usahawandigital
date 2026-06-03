// Global variables
let currentBusinessType = 'fnb';
let currentProducts = [];
let productToDelete = null;

// Load profile data on page load
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    await loadUserProfile(user.id);
    await loadProducts();
    setupProfileModal();
    setupProductModal();
});

// =========================================
// PROFILE FUNCTIONS
// =========================================
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
            
            const typeMap = { 'fnb': '🍔 F&B (Makanan & Minuman)', 'retail': '👗 Retail / Butik', 'servis': '✂️ Perkhidmatan / Servis' };
            document.getElementById('businessTypeDisplay').textContent = `📋 Jenis Bisnes: ${typeMap[businessType] || '🍔 F&B'}`;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// =========================================
// PRODUCT FUNCTIONS
// =========================================
async function loadProducts() {
    const user = await checkAuth();
    if (!user) return;
    
    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '<p class="loading-text">📂 Loading produk...</p>';
    
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        currentProducts = data || [];
        displayProducts(currentProducts);
    } catch (error) {
        console.error('Error loading products:', error);
        productsList.innerHTML = '<p class="error-text">❌ Ralat memuatkan produk. Sila cuba lagi.</p>';
    }
}

function displayProducts(products) {
    const productsList = document.getElementById('productsList');
    
    if (products.length === 0) {
        productsList.innerHTML = '<p class="no-products">📭 Tiada produk. Klik "+ Tambah Produk" untuk mulakan.</p>';
        return;
    }
    
    let html = '<div class="products-grid">';
    products.forEach(product => {
        html += `
            <div class="product-card" data-id="${product.id}">
                <div class="product-info">
                    <h4>📦 ${escapeHtml(product.name)}</h4>
                    <p class="product-price">💰 RM ${product.price.toFixed(2)}</p>
                    <p class="product-category">📁 ${escapeHtml(product.category)}</p>
                </div>
                <div class="product-actions">
                    <button class="btn-edit-product" onclick="editProduct('${product.id}')">✏️ Edit</button>
                    <button class="btn-delete-product" onclick="confirmDeleteProduct('${product.id}')">🗑️ Padam</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    productsList.innerHTML = html;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =========================================
// PRODUCT MODAL FUNCTIONS
// =========================================
function setupProductModal() {
    const addBtn = document.getElementById('addProductBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openProductModal();
        });
    }
    
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveProduct();
        });
    }
}

function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const productForm = document.getElementById('productForm');
    const editIdField = document.getElementById('editProductId');
    const nameField = document.getElementById('productName');
    const priceField = document.getElementById('productPrice');
    const categorySelect = document.getElementById('productCategory');
    
    // Reset form
    productForm.reset();
    document.getElementById('productMessage').style.display = 'none';
    editIdField.value = '';
    
    // Populate category dropdown based on business type
    populateCategoryDropdown(categorySelect, currentBusinessType);
    
    if (productId) {
        // Edit mode
        const product = currentProducts.find(p => p.id === productId);
        if (product) {
            title.textContent = '✏️ Edit Produk';
            editIdField.value = product.id;
            nameField.value = product.name;
            priceField.value = product.price;
            categorySelect.value = product.category;
        }
    } else {
        title.textContent = '➕ Tambah Produk Baru';
    }
    
    modal.style.display = 'block';
}

function populateCategoryDropdown(select, businessType) {
    const categories = {
        fnb: [
            { value: "Kek & Pastri", label: "🍰 Kek & Pastri" },
            { value: "Minuman", label: "🥤 Minuman" },
            { value: "Makanan Utama", label: "🍝 Makanan Utama" },
            { value: "Pencuci Mulut", label: "🍨 Pencuci Mulut" },
            { value: "Lain-lain", label: "📝 Lain-lain" }
        ],
        retail: [
            { value: "Pakaian", label: "👗 Pakaian" },
            { value: "Aksesori", label: "💍 Aksesori" },
            { value: "Kasut", label: "👟 Kasut" },
            { value: "Beg", label: "👜 Beg" },
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
    const submitBtn = document.getElementById('saveProductBtn');
    const messageDiv = document.getElementById('productMessage');
    
    if (!name || isNaN(price) || price <= 0 || !category) {
        messageDiv.style.display = 'block';
        messageDiv.className = 'message-box error';
        messageDiv.innerHTML = '❌ Sila lengkapkan semua maklumat produk.';
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';
    messageDiv.style.display = 'none';
    
    try {
        if (editId) {
            // Update existing product
            const { error } = await supabaseClient
                .from('products')
                .update({
                    name: name,
                    price: price,
                    category: category,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editId)
                .eq('user_id', user.id);
            
            if (error) throw error;
            messageDiv.innerHTML = '✅ Produk berjaya dikemas kini!';
        } else {
            // Insert new product
            const { error } = await supabaseClient
                .from('products')
                .insert([{
                    user_id: user.id,
                    name: name,
                    price: price,
                    category: category,
                    business_type: currentBusinessType,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) throw error;
            messageDiv.innerHTML = '✅ Produk baru berjaya ditambah!';
        }
        
        messageDiv.style.display = 'block';
        messageDiv.className = 'message-box success';
        
        setTimeout(() => {
            closeProductModal();
            loadProducts();
        }, 1500);
        
    } catch (error) {
        console.error('Error saving product:', error);
        messageDiv.style.display = 'block';
        messageDiv.className = 'message-box error';
        messageDiv.innerHTML = `❌ Ralat: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Simpan Produk';
    }
}

function editProduct(productId) {
    openProductModal(productId);
}

function confirmDeleteProduct(productId) {
    productToDelete = productId;
    const modal = document.getElementById('deleteModal');
    modal.style.display = 'block';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    productToDelete = null;
}

async function deleteProduct() {
    if (!productToDelete) return;
    
    const user = await checkAuth();
    if (!user) return;
    
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Memadam...';
    
    try {
        const { error } = await supabaseClient
            .from('products')
            .delete()
            .eq('id', productToDelete)
            .eq('user_id', user.id);
        
        if (error) throw error;
        
        closeDeleteModal();
        await loadProducts();
        
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('❌ Ralat memadam produk: ' + error.message);
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Padam';
    }
}

document.getElementById('confirmDeleteBtn')?.addEventListener('click', deleteProduct);

// =========================================
// PROFILE MODAL FUNCTIONS
// =========================================
function setupProfileModal() {
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            openProfileModal();
        });
    }
    
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateProfile();
        });
    }
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
        
        let businessType = profile.business_type || profile.jenis_perniagaan || 'fnb';
        document.getElementById('editBusinessType').value = businessType;
        
        document.getElementById('profileModal').style.display = 'block';
        
    } catch (error) {
        console.error('Error opening profile modal:', error);
        alert('Error memuatkan data profil');
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
    submitBtn.textContent = 'Menyimpan...';
    messageDiv.style.display = 'none';
    
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({
                business_name: businessName,
                business_type: businessType,
                jenis_perniagaan: businessType
            })
            .eq('id', user.id);
        
        if (error) throw error;
        
        localStorage.setItem('userBusinessType', businessType);
        currentBusinessType = businessType;
        
        const typeMap = { 'fnb': '🍔 F&B (Makanan & Minuman)', 'retail': '👗 Retail / Butik', 'servis': '✂️ Perkhidmatan / Servis' };
        document.getElementById('businessNameDisplay').textContent = `🏪 Perniagaan: ${businessName || 'Belum ditetapkan'}`;
        document.getElementById('businessTypeDisplay').textContent = `📋 Jenis Bisnes: ${typeMap[businessType]}`;
        
        messageDiv.style.display = 'block';
        messageDiv.className = 'message-box success';
        messageDiv.innerHTML = '✅ Profil berjaya dikemas kini!';
        
        setTimeout(() => {
            closeProfileModal();
            loadProducts(); // Reload products to update categories
        }, 1500);
        
    } catch (error) {
        messageDiv.style.display = 'block';
        messageDiv.className = 'message-box error';
        messageDiv.innerHTML = `❌ Error: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Simpan Perubahan';
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const profileModal = document.getElementById('profileModal');
    const productModal = document.getElementById('productModal');
    const deleteModal = document.getElementById('deleteModal');
    
    if (event.target === profileModal) closeProfileModal();
    if (event.target === productModal) closeProductModal();
    if (event.target === deleteModal) closeDeleteModal();
}
