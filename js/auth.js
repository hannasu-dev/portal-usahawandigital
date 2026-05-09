// Handle Registration
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const businessName = document.getElementById('businessName')?.value || '';
        const registerBtn = document.getElementById('registerBtn');
        const messageDiv = document.getElementById('registerMessage');
        
        if (password.length < 6) {
            messageDiv.innerHTML = '<div class="message-box error">Kata laluan mesti sekurang-kurangnya 6 aksara</div>';
            return;
        }
        
        registerBtn.disabled = true;
        registerBtn.textContent = 'Mendaftar...';
        messageDiv.innerHTML = '';
        
        try {
            // Register with Supabase Auth
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        business_name: businessName
                    }
                }
            });
            
            if (error) throw error;
            
            if (data.user) {
                // Create profile in profiles table
                const { error: profileError } = await supabaseClient
                    .from('profiles')
                    .insert([
                        {
                            id: data.user.id,
                            full_name: fullName,
                            email: email,
                            business_name: businessName,
                            created_at: new Date().toISOString()
                        }
                    ]);
                
                if (profileError) console.error('Profile error:', profileError);
                
                messageDiv.innerHTML = '<div class="message-box success">Pendaftaran berjaya! Anda akan dihubungkan ke dashboard...</div>';
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            }
        } catch (error) {
            console.error('Registration error:', error);
            messageDiv.innerHTML = `<div class="message-box error">Ralat: ${error.message}</div>`;
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = 'Daftar Sekarang →';
        }
    });
}

// Handle Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        const messageDiv = document.getElementById('loginMessage');
        
        loginBtn.disabled = true;
        loginBtn.textContent = 'Log Masuk...';
        messageDiv.innerHTML = '';
        
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            if (data.user) {
                messageDiv.innerHTML = '<div class="message-box success">Log masuk berjaya! Mengalihkan...</div>';
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            }
        } catch (error) {
            console.error('Login error:', error);
            messageDiv.innerHTML = `<div class="message-box error">Log masuk gagal: ${error.message}</div>`;
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Log Masuk →';
        }
    });
}

// Handle Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            console.error('Logout error:', error);
        }
        
        window.location.href = 'index.html';
    });
}

// Update navbar based on auth status
async function updateNavbar() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    const loginBtn = document.getElementById('loginNavBtn');
    const registerBtn = document.getElementById('registerNavBtn');
    const dashboardBtn = document.getElementById('dashboardNavBtn');
    
    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (dashboardBtn) dashboardBtn.style.display = 'inline-block';
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (registerBtn) registerBtn.style.display = 'inline-block';
        if (dashboardBtn) dashboardBtn.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateNavbar();
});