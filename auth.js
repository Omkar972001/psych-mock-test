window.Auth = {
    user: null,

    init: async () => {
        if (!window.supabase) return;

        // Check for existing session
        const { data: { session }, error } = await window.supabase.auth.getSession();
        if (session) {
            Auth.user = session.user;
        }
        Auth.updateUI();

        // Listen for auth changes
        window.supabase.auth.onAuthStateChange((_event, session) => {
            Auth.user = session ? session.user : null;
            Auth.updateUI();
        });
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
        const { error } = await window.supabase.auth.signOut();
        if (error) throw error;
        Auth.user = null;
        Auth.updateUI();
    },

    updateUI: () => {
        const profileSection = document.querySelector('.user-profile');
        if (Auth.user) {
            profileSection.innerHTML = `
                <div class="avatar">${Auth.user.email[0].toUpperCase()}</div>
                <div class="user-info">
                    <span class="name">${Auth.user.email.split('@')[0]}</span>
                    <span class="status" onclick="Auth.signOut()" style="cursor:pointer; color: var(--accent);">Sign Out</span>
                </div>
            `;
        } else {
            profileSection.innerHTML = `
                <div class="avatar">?</div>
                <div class="user-info">
                    <span class="name">Guest</span>
                    <span class="status" onclick="Auth.showLoginModal()" style="cursor:pointer; color: var(--primary);">Login / Sign Up</span>
                </div>
            `;
        }
    },

    showLoginModal: () => {
        const modal = document.getElementById('authModal');
        modal.classList.remove('hidden');
    },

    closeLoginModal: () => {
        const modal = document.getElementById('authModal');
        modal.classList.add('hidden');
    }
};

// Handle Auth Form Submissions
async function handleAuthAction(type) {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    errorEl.textContent = '';

    try {
        if (type === 'login') {
            await Auth.signIn(email, password);
        } else {
            await Auth.signUp(email, password);
            alert("Verification email sent! Please check your inbox.");
        }
        Auth.closeLoginModal();
    } catch (err) {
        errorEl.textContent = err.message;
    }
}
