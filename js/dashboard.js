// Global variable untuk business type
let currentBusinessType = 'fnb';

// Load profile data on page load
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    await loadUserProfile(user.id);
    setupProfileModal();
});

// Load user profile from database
async function loadUserProfile(userId) {
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        
        if (profile) {
            // Display user name
            const userNameSpan = document.getElementById('userName');
            if (userNameSpan) {
                userNameSpan.textContent = profile.full_name || 'Usahawan';
            }
            
            // Display business name
            const businessNameDisplay = document.getElementById('businessNameDisplay');
            if (businessNameDisplay) {
                businessNameDisplay.textContent = `🏪 Perniagaan: ${profile.business_name || 'Belum ditetapkan'}`;
            }
            
            // Get business type - FALLBACK: jika NULL, default ke 'fnb'
            let businessType = profile.business_type || profile.jenis_perniagaan || 'fnb';
            currentBusinessType = businessType;
            
            // Display business type with emoji
            const businessTypeDisplay = document.getElementById('businessTypeDisplay');
            if (businessTypeDisplay) {
                const typeMap = {
                    'fnb': '🍔 F&B (Makanan & Minuman)',
                    'retail': '👗 Retail / Butik',
                    'servis': '✂️ Perkhidmatan / Servis'
                };
                businessTypeDisplay.textContent = `📋 Jenis Bisnes: ${typeMap[businessType] || '🍔 F&B'}`;
            }
            
            // Store business type in localStorage for other pages
            localStorage.setItem('userBusinessType', businessType);
        }
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Setup profile modal
function setupProfileModal() {
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            openProfileModal();
        });
    }
}

// Open modal and populate with current data
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
        
        // Populate form
        const businessNameInput = document.getElementById('editBusinessName');
        const businessTypeSelect = document.getElementById('editBusinessType');
        
        if (businessNameInput) {
            businessNameInput.value = profile.business_name || '';
        }
        
        if (businessTypeSelect) {
            let businessType = profile.business_type || profile.jenis_perniagaan || 'fnb';
            businessTypeSelect.value = businessType;
        }
        
        // Show modal
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error opening profile modal:', error);
        alert('Error memuatkan data profil');
    }
}

// Close modal
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle profile form submission
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const user = await checkAuth();
        if (!user) return;
        
        const businessName = document.getElementById('editBusinessName').value;
        const businessType = document.getElementById('editBusinessType').value;
        
        const submitBtn = profileForm.querySelector('button[type="submit"]');
        const messageDiv = document.getElementById('profileMessage');
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Menyimpan...';
        messageDiv.style.display = 'none';
        
        try {
            // Update profile in Supabase
            const { error } = await supabaseClient
                .from('profiles')
                .update({
                    business_name: businessName,
                    business_type: businessType,
                    jenis_perniagaan: businessType  // For backward compatibility
                })
                .eq('id', user.id);
            
            if (error) throw error;
            
            // Update localStorage
            localStorage.setItem('userBusinessType', businessType);
            currentBusinessType = businessType;
            
            // Update display on dashboard
            const businessNameDisplay = document.getElementById('businessNameDisplay');
            const businessTypeDisplay = document.getElementById('businessTypeDisplay');
            
            if (businessNameDisplay) {
                businessNameDisplay.textContent = `🏪 Perniagaan: ${businessName || 'Belum ditetapkan'}`;
            }
            
            const typeMap = {
                'fnb': '🍔 F&B (Makanan & Minuman)',
                'retail': '👗 Retail / Butik',
                'servis': '✂️ Perkhidmatan / Servis'
            };
            
            if (businessTypeDisplay) {
                businessTypeDisplay.textContent = `📋 Jenis Bisnes: ${typeMap[businessType]}`;
            }
            
            // Show success message
            messageDiv.style.display = 'block';
            messageDiv.className = 'message-box success';
            messageDiv.innerHTML = '✅ Profil berjaya dikemas kini! Kategori untuk rekod jualan akan dikemas kini.';
            
            // Close modal after 2 seconds
            setTimeout(() => {
                closeProfileModal();
                messageDiv.style.display = 'none';
            }, 2000);
            
        } catch (error) {
            console.error('Error updating profile:', error);
            messageDiv.style.display = 'block';
            messageDiv.className = 'message-box error';
            messageDiv.innerHTML = `❌ Error: ${error.message}`;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Simpan Perubahan';
        }
    });
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('profileModal');
    if (event.target === modal) {
        closeProfileModal();
    }
}

// Function to get current business type (for other pages)
function getCurrentBusinessType() {
    return localStorage.getItem('userBusinessType') || 'fnb';
}
