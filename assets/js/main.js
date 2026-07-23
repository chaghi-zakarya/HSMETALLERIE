/* ============================================================================
 * SITE PUBLIC — galerie de réalisations + formulaire de devis.
 * Lit / écrit dans la base via window.API.
 * ========================================================================== */
(function () {
    const PLACEHOLDER =
        'https://via.placeholder.com/800x400/0B1B2B/D99B26?text=Image+indisponible';
    const esc = window.API.escapeHtml;

    let realisationsCache = [];

    // -----------------------------------------------------------------------
    // NOTIFICATION
    // -----------------------------------------------------------------------
    function afficherNotification(message, titre) {
        const notif = document.getElementById('notification');
        document.getElementById('notifTitle').textContent = titre || 'Demande envoyée !';
        document.getElementById('notifMessage').textContent = message;
        notif.classList.add('show');
        setTimeout(() => notif.classList.remove('show'), 5000);
    }
    window.fermerNotification = function () {
        document.getElementById('notification').classList.remove('show');
    };

    // -----------------------------------------------------------------------
    // FORMULAIRE DE DEVIS  ->  enregistré en base (visible dans l'admin)
    // -----------------------------------------------------------------------
    window.envoyerDevis = async function (event) {
        event.preventDefault();
        const btn = document.querySelector('#formDevis button[type="submit"]');

        const demande = {
            nom:         document.getElementById('nom').value.trim(),
            email:       document.getElementById('email').value.trim(),
            telephone:   document.getElementById('telephone').value.trim(),
            typeProjet:  document.getElementById('type_projet').value,
            description: document.getElementById('description').value.trim()
        };

        btn.disabled = true;
        try {
            await window.API.creerDevis(demande);
            document.getElementById('formDevis').reset();
            afficherNotification(
                '✅ Votre demande a bien été enregistrée. Nous vous recontacterons rapidement.'
            );
        } catch (e) {
            console.error(e);
            afficherNotification(
                "Une erreur est survenue. Vérifiez votre connexion et réessayez, " +
                "ou contactez-nous directement.",
                'Envoi impossible'
            );
        } finally {
            btn.disabled = false;
        }
    };

    // -----------------------------------------------------------------------
    // GALERIE DES RÉALISATIONS (grille de cartes)
    // -----------------------------------------------------------------------
    function renderGalerie() {
        const grid = document.getElementById('realisationsGrid');
        if (!grid) return;

        if (realisationsCache.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding:3rem; color:var(--text-muted);">
                    <i class="fa-regular fa-images" style="font-size:3rem; display:block; margin-bottom:1rem; color:#CBD5E1;"></i>
                    <h3 style="color:var(--text-dark);">Aucune réalisation pour le moment</h3>
                    <p>Revenez bientôt pour découvrir nos projets.</p>
                </div>`;
            return;
        }

        grid.innerHTML = realisationsCache.map(r => {
            const img = esc(r.images[0] || PLACEHOLDER);
            return `
                <div class="realisation-card" onclick="ouvrirModalReal('${esc(r.id)}')">
                    <img src="${img}" alt="${esc(r.titre)}" class="card-image"
                         onerror="this.src='${PLACEHOLDER}'">
                    <div class="realisation-card-content">
                        <h4>${esc(r.titre)}</h4>
                        <span class="voir-detail"><i class="fa-solid fa-arrow-right"></i> Voir le détail</span>
                    </div>
                </div>`;
        }).join('');
    }

    // -----------------------------------------------------------------------
    // DIAPORAMA PLEIN ÉCRAN
    // -----------------------------------------------------------------------
    let currentRealisation = null;
    let currentImageIndex = 0;

    function renderSlide() {
        if (!currentRealisation) return;
        const images = currentRealisation.images.length ? currentRealisation.images : [PLACEHOLDER];
        const total = images.length;

        document.getElementById('slideshowImage').src = esc(images[currentImageIndex] || PLACEHOLDER);
        document.getElementById('slideshowImage').alt = esc(currentRealisation.titre);
        document.getElementById('realModalTitle').textContent = currentRealisation.titre;
        document.getElementById('slideshowDescription').textContent = currentRealisation.description;
        document.getElementById('slideshowCounter').textContent =
            total > 1 ? `Image ${currentImageIndex + 1} / ${total}` : '';

        // Cache les flèches s'il n'y a qu'une seule image
        const showArrows = total > 1;
        document.querySelectorAll('.slideshow-arrow').forEach(btn => {
            btn.style.display = showArrows ? 'flex' : 'none';
        });
    }

    window.ouvrirModalReal = function (id) {
        const r = realisationsCache.find(x => x.id === id);
        if (!r) return;

        currentRealisation = r;
        currentImageIndex = 0;
        renderSlide();

        document.getElementById('realModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.slideshowNext = function () {
        if (!currentRealisation) return;
        const total = currentRealisation.images.length || 1;
        currentImageIndex = (currentImageIndex + 1) % total;
        renderSlide();
    };

    window.slideshowPrev = function () {
        if (!currentRealisation) return;
        const total = currentRealisation.images.length || 1;
        currentImageIndex = (currentImageIndex - 1 + total) % total;
        renderSlide();
    };

    window.fermerModalReal = function () {
        document.getElementById('realModal').classList.remove('active');
        document.body.style.overflow = '';
        currentRealisation = null;
    };

    // -----------------------------------------------------------------------
    // INITIALISATION
    // -----------------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', async function () {
        // Ferme si on clique en dehors de l'image / des infos
        document.getElementById('realModal').addEventListener('click', function (e) {
            if (e.target === this) window.fermerModalReal();
        });

        // Navigation clavier : Échap pour fermer, flèches pour naviguer
        document.addEventListener('keydown', function (e) {
            if (!document.getElementById('realModal').classList.contains('active')) return;
            if (e.key === 'Escape') window.fermerModalReal();
            if (e.key === 'ArrowRight') window.slideshowNext();
            if (e.key === 'ArrowLeft') window.slideshowPrev();
        });

        try {
            realisationsCache = await window.API.listerRealisations();
        } catch (e) {
            console.error('Chargement des réalisations impossible :', e);
            realisationsCache = [];
        }
        renderGalerie();
    });
})();
