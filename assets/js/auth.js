/* ============================================================================
 * AUTHENTIFICATION ADMIN (Supabase Auth — réelle, côté serveur)
 * ----------------------------------------------------------------------------
 * Remplace l'ancien mot de passe en clair. Le compte admin est créé
 * manuellement dans Supabase (voir db/schema.sql). Aucun secret n'est stocké
 * dans le code : la session est gérée par Supabase.
 * ========================================================================== */
(function () {
    const loginScreen = document.getElementById('loginScreen');
    const adminApp    = document.getElementById('adminApp');
    const loginForm   = document.getElementById('loginForm');
    const loginError  = document.getElementById('loginError');
    const logoutBtn   = document.getElementById('logoutBtn');

    function showApp() {
        loginScreen.style.display = 'none';
        adminApp.style.display = 'block';
        if (typeof window.initAdmin === 'function') window.initAdmin();
    }

    function showLogin() {
        adminApp.style.display = 'none';
        loginScreen.style.display = 'flex';
    }

    async function verifierSession() {
        if (!window.sb) {
            loginError.textContent =
                'Base de données non configurée. Renseignez assets/js/config.js.';
            showLogin();
            return;
        }
        const { data } = await window.sb.auth.getSession();
        if (data && data.session) showApp();
        else showLogin();
    }

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        loginError.textContent = '';

        if (!window.sb) {
            loginError.textContent = 'Base de données non configurée.';
            return;
        }

        const email = document.getElementById('loginEmail').value.trim();
        const motDePasse = document.getElementById('loginPassword').value;
        const btn = loginForm.querySelector('button[type="submit"]');
        btn.disabled = true;

        const { error } = await window.sb.auth.signInWithPassword({
            email, password: motDePasse
        });

        btn.disabled = false;

        if (error) {
            loginError.textContent = 'Identifiants incorrects. Réessayez.';
            return;
        }
        loginForm.reset();
        showApp();
    });

    logoutBtn.addEventListener('click', async function () {
        await window.sb.auth.signOut();
        showLogin();
    });

    document.addEventListener('DOMContentLoaded', verifierSession);
})();
