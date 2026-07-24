/* ============================================================================
 * AUTHENTIFICATION ADMIN (Supabase Auth — réelle, côté serveur)
 * ----------------------------------------------------------------------------
 * Le compte admin est créé manuellement dans Supabase. Aucun secret n'est
 * stocké dans le code : la session est gérée par Supabase.
 *
 * Écrans gérés ici :
 *   - loginScreen  : connexion normale (email + mot de passe)
 *   - forgotScreen : demande d'un lien de réinitialisation par email
 *   - resetScreen  : saisie du nouveau mot de passe (après clic sur le lien
 *                    reçu par email — Supabase authentifie temporairement
 *                    la personne pour lui permettre de choisir un nouveau
 *                    mot de passe)
 *   - adminApp     : l'application, une fois connecté
 *
 * Gère aussi le changement de mot de passe en libre-service ("Mon compte").
 * ========================================================================== */
(function () {
    const loginScreen  = document.getElementById('loginScreen');
    const forgotScreen = document.getElementById('forgotScreen');
    const resetScreen  = document.getElementById('resetScreen');
    const adminApp     = document.getElementById('adminApp');
    const loginForm    = document.getElementById('loginForm');
    const loginError   = document.getElementById('loginError');
    const logoutBtn    = document.getElementById('logoutBtn');

    function hideAllAuthScreens() {
        loginScreen.style.display = 'none';
        forgotScreen.style.display = 'none';
        resetScreen.style.display = 'none';
        adminApp.style.display = 'none';
    }

    function showApp() {
        hideAllAuthScreens();
        adminApp.style.display = 'block';
        if (typeof window.initAdmin === 'function') window.initAdmin();
    }
    function showLogin() {
        hideAllAuthScreens();
        loginScreen.style.display = 'flex';
    }
    function showForgot() {
        hideAllAuthScreens();
        forgotScreen.style.display = 'flex';
    }
    function showReset() {
        hideAllAuthScreens();
        resetScreen.style.display = 'flex';
    }

    window.afficherMotDePasseOublie = function (e) {
        if (e) e.preventDefault();
        document.getElementById('forgotError').style.display = 'none';
        document.getElementById('forgotSuccess').style.display = 'none';
        document.getElementById('formForgot').reset();
        showForgot();
    };
    window.retourConnexion = function (e) {
        if (e) e.preventDefault();
        showLogin();
    };

    // Détecte si la page a été ouverte via le lien de réinitialisation reçu par email
    function estUnLienDeReinitialisation() {
        const hash = window.location.hash || '';
        return hash.includes('type=recovery');
    }

    async function verifierSession() {
        if (!window.sb) {
            loginError.textContent =
                'Base de données non configurée. Renseignez assets/js/config.js.';
            showLogin();
            return;
        }
        if (estUnLienDeReinitialisation()) {
            showReset();
            return;
        }
        const { data } = await window.sb.auth.getSession();
        if (data && data.session) showApp();
        else showLogin();
    }

    // -------------------------------------------------------------------
    // CONNEXION NORMALE
    // -------------------------------------------------------------------
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
    // MOT DE PASSE OUBLIÉ — envoi du lien de réinitialisation
    // -------------------------------------------------------------------
    const formForgot = document.getElementById('formForgot');
    if (formForgot) {
        formForgot.addEventListener('submit', async function (e) {
            e.preventDefault();
            const forgotError   = document.getElementById('forgotError');
            const forgotSuccess = document.getElementById('forgotSuccess');
            forgotError.style.display = 'none';
            forgotSuccess.style.display = 'none';

            const email = document.getElementById('forgotEmail').value.trim();
            const btn = formForgot.querySelector('button[type="submit"]');
            btn.disabled = true;

            // Redirige vers CETTE page (admin.html) après le clic sur le lien reçu par email
            const redirectTo = window.location.origin + window.location.pathname;
            const { error } = await window.sb.auth.resetPasswordForEmail(email, { redirectTo });

            btn.disabled = false;

            if (error) {
                forgotError.textContent = "Impossible d'envoyer l'email : " + error.message;
                forgotError.style.display = 'block';
                return;
            }
            forgotSuccess.textContent =
                "✅ Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé. " +
                "Vérifiez votre boîte de réception (et vos spams).";
            forgotSuccess.style.display = 'block';
            formForgot.reset();
        });
    }

    // -------------------------------------------------------------------
    // RÉINITIALISATION — nouveau mot de passe après clic sur le lien reçu
    // -------------------------------------------------------------------
    const formReset = document.getElementById('formReset');
    if (formReset) {
        formReset.addEventListener('submit', async function (e) {
            e.preventDefault();
            const resetError = document.getElementById('resetError');
            resetError.style.display = 'none';

            const nouveau  = document.getElementById('resetPassword').value;
            const confirme = document.getElementById('resetPasswordConfirm').value;

            if (nouveau.length < 6) {
                resetError.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
                resetError.style.display = 'block';
                return;
            }
            if (nouveau !== confirme) {
                resetError.textContent = 'Les deux mots de passe ne correspondent pas.';
                resetError.style.display = 'block';
                return;
            }

            const btn = formReset.querySelector('button[type="submit"]');
            btn.disabled = true;
            const { error } = await window.sb.auth.updateUser({ password: nouveau });
            btn.disabled = false;

            if (error) {
                resetError.textContent = 'Impossible de mettre à jour le mot de passe : ' + error.message;
                resetError.style.display = 'block';
                return;
            }

            formReset.reset();
            // Nettoie l'URL (retire le token de récupération) puis entre dans l'admin
            history.replaceState(null, '', window.location.pathname);
            showApp();
        });
    }

    // Filet de sécurité : si Supabase détecte le lien de récupération après coup
    if (window.sb) {
        window.sb.auth.onAuthStateChange(function (event) {
            if (event === 'PASSWORD_RECOVERY') {
                showReset();
            }
        });
    }

    // -------------------------------------------------------------------
    // MON COMPTE — changement de mot de passe en libre-service (déjà connecté)
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
