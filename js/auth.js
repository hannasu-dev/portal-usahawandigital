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

// Handle Forgot Password (Reset Password)
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        
        if (!email) {
            alert('Sila masukkan emel anda terlebih dahulu');
            return;
        }
        
        forgotPasswordBtn.textContent = 'Menghantar...';
        forgotPasswordBtn.style.opacity = '0.7';
        
        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });
            
            if (error) throw error;
            
            alert('Link reset password telah dihantar ke emel anda. Sila semak kotak masuk/spam.');
            
        } catch (error) {
            console.error('Reset password error:', error);
            alert('Error: ' + error.message);
        } finally {
            forgotPasswordBtn.textContent = 'Lupa Kata Laluan?';
            forgotPasswordBtn.style.opacity = '1';
        }
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

// Check auth status on page load
async function checkAuth() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        window.currentUser = user;
        return user;
    }
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateNavbar();
});
