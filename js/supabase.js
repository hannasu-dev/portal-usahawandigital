// Supabase Configuration
const SUPABASE_URL = 'https://zholdqlkyrbeiaavsveb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpob2xkcWxreXJiZWlhYXZzdmViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMjkxNjYsImV4cCI6MjA5MzkwNTE2Nn0.JvzdRzkbdUp26iBSGOvV1maE2ryVAmsQrm4QHAElmdI';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variable untuk current user
window.currentUser = null;

// Function to check if user is logged in
async function checkAuth() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    if (user) {
        window.currentUser = user;
        
        // Update UI for logged in user
        const loginNavBtn = document.getElementById('loginNavBtn');
        const registerNavBtn = document.getElementById('registerNavBtn');
        const dashboardNavBtn = document.getElementById('dashboardNavBtn');
        
        if (loginNavBtn) loginNavBtn.style.display = 'none';
        if (registerNavBtn) registerNavBtn.style.display = 'none';
        if (dashboardNavBtn) dashboardNavBtn.style.display = 'inline-block';
        
        return user;
    }
    
    return null;
}

// Run auth check on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});
