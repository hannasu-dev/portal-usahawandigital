document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Get user profile
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan) {
        userNameSpan.textContent = profile?.full_name || user.email.split('@')[0];
    }
});