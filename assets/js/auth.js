/* ============================================================================
 * AUTHENTIFICATION ADMIN (Supabase Auth — réelle, côté serveur)
 * ----------------------------------------------------------------------------
 * Remplace l'ancien mot de passe en clair. Le compte admin est créé
 * manuellement dans Supabase (voir db/schema.sql). Aucun secret n'est stocké
 * dans le code : la session est gérée par Supabase.
 *
 * Ajout : gestion du compte (changement de mot de passe en libre-service).
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

    // -------------------------------------------------------------------
    // MON COMPTE — changement de mot de passe en libre-service
    // -------------------------------------------------------------------
    const compteBtn        = document.getElementById('compteBtn');
    const compteModal      = document.getElementById('compteModal');
    const compteEmailSpan  = document.getElementById('compteEmailActuel');
    const formPassword     = document.getElementById('formChangerPassword');
    const passwordError    = document.getElementById('passwordError');
    const passwordSuccess  = document.getElementById('passwordSuccess');

    window.ouvrirCompteModal = async function () {
        passwordError.style.display = 'none';
        passwordSuccess.style.display = 'none';
        formPassword.reset();

        const { data } = await window.sb.auth.getUser();
        compteEmailSpan.textContent = (data && data.user && data.user.email) || '—';

        compteModal.classList.add('active');
    };

    window.fermerCompteModal = function () {
        compteModal.classList.remove('active');
    };

    if (compteBtn) {
        compteBtn.addEventListener('click', window.ouvrirCompteModal);
    }
    if (compteModal) {
        compteModal.addEventListener('click', function (e) {
            if (e.target === this) window.fermerCompteModal();
        });
    }

    if (formPassword) {
        formPassword.addEventListener('submit', async function (e) {
            e.preventDefault();
            passwordError.style.display = 'none';
            passwordSuccess.style.display = 'none';

            const nouveau  = document.getElementById('nouveauPassword').value;
            const confirme = document.getElementById('confirmerPassword').value;

            if (nouveau.length < 6) {
                passwordError.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
                passwordError.style.display = 'block';
                return;
            }
            if (nouveau !== confirme) {
                passwordError.textContent = 'Les deux mots de passe ne correspondent pas.';
                passwordError.style.display = 'block';
                return;
            }

            const btn = formPassword.querySelector('button[type="submit"]');
            btn.disabled = true;
            const { error } = await window.sb.auth.updateUser({ password: nouveau });
            btn.disabled = false;

            if (error) {
                passwordError.textContent = 'Impossible de changer le mot de passe : ' + error.message;
                passwordError.style.display = 'block';
                return;
            }

            passwordSuccess.textContent = '✅ Mot de passe changé avec succès.';
            passwordSuccess.style.display = 'block';
            formPassword.reset();
        });
    }

    document.addEventListener('DOMContentLoaded', verifierSession);
})();
