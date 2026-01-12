window.Auth = {
    user: null,
    currentTab: 'login', // 'login' or 'signup'

    init: async () => {
        if (!window.supabase) return;

        // Check for existing session
        const { data: { session }, error } = await window.supabase.auth.getSession();

        if (session) {
            Auth.handleSessionSuccess(session);
        } else {
            Auth.showLoginView();
        }

        // Listen for auth changes
        window.supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                Auth.handleSessionSuccess(session);
            } else {
                Auth.showLoginView();
            }
        });
    },

    handleSessionSuccess: (session) => {
        Auth.user = session.user;

        // Hide Login, Show App
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');

        Auth.updateUserProfile();

        // Ensure app starts at dashboard if just logging in
        if (window.location.hash === '#login') {
            window.location.hash = '#dashboard';
        }
    },

    showLoginView: () => {
        Auth.user = null;
        document.getElementById('loginView').classList.remove('hidden');
        document.getElementById('appContainer').classList.add('hidden');

        // Clear User Profile
        const profileSection = document.querySelector('.user-profile');
        if (profileSection) profileSection.innerHTML = '';
    },

    switchTab: (tab) => {
        Auth.currentTab = tab;

        // Update Tabs UI
        document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
        const activeIdx = tab === 'login' ? 0 : 1;
        document.querySelectorAll('.auth-tab')[activeIdx].classList.add('active');

        // Update Button Text
        const btn = document.getElementById('authActionBtn');
        btn.textContent = tab === 'login' ? 'Login' : 'Sign Up';

        // Clear Error
        document.getElementById('authError').textContent = '';
    },

    signIn: async (email, password) => {
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    signUp: async (email, password) => {
        const { data, error } = await window.supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    signOut: async () => {
        try {
            const { error } = await window.supabase.auth.signOut();
            if (error) throw error;
        } catch (err) {
            console.error("Sign out error:", err);
            // Even if API fails, we should clear local state
        }

        Auth.user = null;
        Auth.showLoginView();

        // Optional: Reload to ensure clean state, but UI should be correct now.
        // window.location.reload(); 
    },

    updateUserProfile: () => {
        const profileSection = document.querySelector('.user-profile');
        if (Auth.user && profileSection) {
            profileSection.innerHTML = `
                <div class="avatar">${Auth.user.email[0].toUpperCase()}</div>
                <div class="user-info">
                    <span class="name">${Auth.user.email.split('@')[0]}</span>
                    <span class="status" onclick="Auth.signOut()" style="cursor:pointer; color: var(--accent);">Sign Out</span>
                </div>
            `;
        }
    }
};

// Handle Auth Form Submissions
async function handleAuthAction() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    const btn = document.getElementById('authActionBtn'); // Fix id reference

    // Simple Validation
    if (!email || !password) {
        errorEl.textContent = "Please fill in all fields.";
        return;
    }

    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
        if (Auth.currentTab === 'login') {
            await Auth.signIn(email, password);
            // Success Handled by onAuthStateChange
        } else {
            await Auth.signUp(email, password);
            alert("Verification email sent! Please check your inbox then login.");
            Auth.switchTab('login'); // Switch to login after signup
        }
    } catch (err) {
        errorEl.textContent = err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = Auth.currentTab === 'login' ? 'Login' : 'Sign Up';
    }
}
