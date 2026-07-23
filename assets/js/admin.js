/* ============================================================================
 * PANNEAU D'ADMINISTRATION
 * ----------------------------------------------------------------------------
 * Lancé par auth.js (window.initAdmin) une fois l'administrateur connecté.
 * Toutes les données transitent par window.API.
 * ========================================================================== */
(function () {
    const esc = window.API.escapeHtml;
    const MAX_IMAGE_MB = 5;                       // taille max par image
    const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

    let demandesCache = [];
    let realisationsCache = [];
    let selectedFiles = [];

    // -----------------------------------------------------------------------
    // TOAST
    // -----------------------------------------------------------------------
    function showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // -----------------------------------------------------------------------
    // APERÇU DES IMAGES (avant envoi)
    // -----------------------------------------------------------------------
    function bindImagePreview() {
        const input = document.getElementById('realImages');
        input.addEventListener('change', function () {
            const container = document.getElementById('imagePreviewContainer');
            container.innerHTML = '';
            selectedFiles = Array.from(input.files).filter(f => f.type.startsWith('image/'));
            selectedFiles.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = function (ev) {
                    const div = document.createElement('div');
                    div.className = 'image-preview-item';
                    div.innerHTML =
                        `<img src="${ev.target.result}" alt="Aperçu">` +
                        `<button class="remove-img" type="button" onclick="removeImage(${index})">×</button>`;
                    container.appendChild(div);
                };
                reader.readAsDataURL(file);
            });
        });
    }

    window.removeImage = function (index) {
        selectedFiles.splice(index, 1);
        const input = document.getElementById('realImages');
        const dt = new DataTransfer();
        selectedFiles.forEach(f => dt.items.add(f));
        input.files = dt.files;
        input.dispatchEvent(new Event('change'));
    };

    // =======================================================================
    // RÉALISATIONS
    // =======================================================================
    window.ajouterRealisation = async function (event) {
        event.preventDefault();
        const titre = document.getElementById('realTitre').value.trim();
        const description = document.getElementById('realDescription').value.trim();
        const files = document.getElementById('realImages').files;

        if (!titre || !description || files.length === 0) {
            showToast('⚠️ Renseignez tous les champs et au moins une image.');
            return;
        }

        const tropLourde = Array.from(files).find(f => f.size > MAX_IMAGE_BYTES);
        if (tropLourde) {
            showToast(`⚠️ « ${tropLourde.name} » dépasse ${MAX_IMAGE_MB} Mo. Réduisez l'image et réessayez.`);
            return;
        }

        const btn = document.querySelector('#formRealisation button[type="submit"]');
        btn.disabled = true;
        showToast('⏳ Envoi en cours…');
        try {
            await window.API.creerRealisation({ titre, description, files });
            document.getElementById('formRealisation').reset();
            document.getElementById('imagePreviewContainer').innerHTML = '';
            selectedFiles = [];
            await chargerRealisations();
            showToast('✅ Réalisation publiée avec succès !');
        } catch (e) {
            console.error(e);
            showToast('❌ Publication impossible : ' + (e.message || 'erreur inconnue'));
        } finally {
            btn.disabled = false;
        }
    };

    window.supprimerRealisation = async function (id) {
        if (!confirm('Supprimer cette réalisation ?')) return;
        const r = realisationsCache.find(x => x.id === id);
        try {
            await window.API.supprimerRealisation(id, r ? r.images : []);
            await chargerRealisations();
            showToast('🗑️ Réalisation supprimée');
        } catch (e) {
            console.error(e);
            showToast('❌ Suppression impossible');
        }
    };

    window.voirDetailRealAdmin = function (id) {
        const r = realisationsCache.find(x => x.id === id);
        if (!r) return;
        const imagesHtml = r.images.length
            ? `<div class="images-gallery">${r.images.map(img => `<img src="${esc(img)}" alt="${esc(r.titre)}">`).join('')}</div>`
            : `<p style="color:var(--text-muted);">Aucune image</p>`;

        document.getElementById('modalRealContent').innerHTML = `
            ${imagesHtml}
            <div class="modal-detail-item"><span class="label">Titre</span><span class="value"><strong>${esc(r.titre)}</strong></span></div>
            <div class="modal-detail-item"><span class="label">Description</span><span class="value">${esc(r.description)}</span></div>
            <div class="modal-detail-item"><span class="label">Publié le</span><span class="value">${esc(r.date)}</span></div>
            <div class="modal-detail-item" style="border-bottom:none;"><span class="label">Images</span><span class="value">${r.images.length} image${r.images.length > 1 ? 's' : ''}</span></div>`;
        document.getElementById('detailRealModal').classList.add('active');
    };
    window.fermerRealModal = function () {
        document.getElementById('detailRealModal').classList.remove('active');
    };

    function renderRealisations() {
        const container = document.getElementById('realisationsList');
        document.getElementById('nbRealisations').textContent = `(${realisationsCache.length})`;

        if (realisationsCache.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column:1 / -1;">
                    <i class="fa-regular fa-images"></i>
                    <h3>Aucune réalisation publiée</h3>
                    <p>Ajoutez votre première réalisation via le formulaire ci-dessus.</p>
                </div>`;
            return;
        }

        container.innerHTML = realisationsCache.map(r => {
            const nb = r.images.length;
            return `
                <div class="realisation-card-admin">
                    <div class="card-body">
                        <h4>${esc(r.titre)}</h4>
                        <div class="mini-images">
                            ${r.images.slice(0, 3).map(img => `<img src="${esc(img)}" alt="">`).join('')}
                            ${nb > 3 ? `<span style="font-size:0.8rem; color:var(--text-muted);">+${nb - 3}</span>` : ''}
                        </div>
                        <p>${esc(r.description.substring(0, 80))}${r.description.length > 80 ? '…' : ''}</p>
                        <small style="color:var(--text-muted); font-size:0.75rem;">${esc(r.date)} • ${nb} image${nb > 1 ? 's' : ''}</small>
                        <div class="card-actions">
                            <button class="btn-edit" onclick="voirDetailRealAdmin('${esc(r.id)}')"><i class="fa-solid fa-eye"></i> Voir</button>
                            <button class="btn-danger" onclick="supprimerRealisation('${esc(r.id)}')"><i class="fa-solid fa-trash"></i> Supprimer</button>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    async function chargerRealisations() {
        try {
            realisationsCache = await window.API.listerRealisations();
        } catch (e) {
            console.error(e);
            realisationsCache = [];
        }
        renderRealisations();
    }

    // =======================================================================
    // DEVIS
    // =======================================================================
    function renderDemandes(filtreTexte = '', filtreStatut = 'all') {
        const tbody = document.getElementById('tableBody');
        let filtrees = demandesCache;

        if (filtreTexte.trim()) {
            const s = filtreTexte.toLowerCase().trim();
            filtrees = filtrees.filter(d =>
                (d.nom || '').toLowerCase().includes(s) ||
                (d.email || '').toLowerCase().includes(s) ||
                (d.telephone || '').includes(s) ||
                (d.typeProjet || '').toLowerCase().includes(s));
        }
        if (filtreStatut !== 'all') {
            filtrees = filtrees.filter(d => d.statut === filtreStatut);
        }

        document.getElementById('totalDemandes').textContent = demandesCache.length;
        document.getElementById('enAttente').textContent = demandesCache.filter(d => d.statut === 'en-attente').length;
        document.getElementById('traitees').textContent = demandesCache.filter(d => d.statut === 'traite').length;
        document.getElementById('ignorees').textContent = demandesCache.filter(d => d.statut === 'ignore').length;

        if (filtrees.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="8">
                    <div class="empty-state">
                        <i class="fa-regular fa-file-lines"></i>
                        <h3>${demandesCache.length === 0 ? 'Aucune demande de devis' : 'Aucune demande ne correspond à vos filtres'}</h3>
                        <p>${demandesCache.length === 0 ? 'Les demandes envoyées depuis le site apparaîtront ici.' : 'Modifiez vos filtres pour voir plus de résultats.'}</p>
                    </div>
                </td></tr>`;
            return;
        }

        tbody.innerHTML = filtrees.map((d, index) => {
            const cls = d.statut === 'en-attente' ? 'en-attente' : d.statut === 'traite' ? 'traite' : 'ignore';
            const lbl = d.statut === 'en-attente' ? 'En attente' : d.statut === 'traite' ? 'Traité' : 'Ignoré';
            const id = esc(d.id);
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${esc(d.nom || '—')}</strong></td>
                    <td>${esc(d.email || '—')}</td>
                    <td>${esc(d.telephone || '—')}</td>
                    <td>${esc(d.typeProjet || '—')}</td>
                    <td>${esc(d.date)}</td>
                    <td><span class="status-badge ${cls}">${lbl}</span></td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button class="btn-action voir" onclick="voirDetail('${id}')" title="Voir le détail"><i class="fa-solid fa-eye"></i></button>
                        ${d.statut === 'en-attente' ? `
                            <button class="btn-action traiter" onclick="changerStatut('${id}','traite')" title="Marquer comme traité"><i class="fa-solid fa-check"></i></button>
                            <button class="btn-action ignorer" onclick="changerStatut('${id}','ignore')" title="Ignorer"><i class="fa-solid fa-times"></i></button>
                        ` : `
                            <button class="btn-action traiter" onclick="changerStatut('${id}','en-attente')" title="Remettre en attente"><i class="fa-solid fa-undo"></i></button>
                        `}
                        <button class="btn-action supprimer" onclick="supprimerDemandeConfirm('${id}')" title="Supprimer définitivement"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
        }).join('');
    }

    window.changerStatut = async function (id, statut) {
        try {
            await window.API.changerStatutDevis(id, statut);
            const d = demandesCache.find(x => x.id === id);
            if (d) d.statut = statut;
            appliquerFiltres();
            showToast('Statut mis à jour');
        } catch (e) {
            console.error(e);
            showToast('❌ Mise à jour impossible');
        }
    };

    window.supprimerDemandeConfirm = async function (id) {
        if (!confirm('Supprimer définitivement cette demande ?')) return;
        try {
            await window.API.supprimerDevis(id);
            demandesCache = demandesCache.filter(x => x.id !== id);
            appliquerFiltres();
            showToast('Demande supprimée');
        } catch (e) {
            console.error(e);
            showToast('❌ Suppression impossible');
        }
    };

    window.voirDetail = function (id) {
        const d = demandesCache.find(x => x.id === id);
        if (!d) return;
        const lbl = d.statut === 'en-attente' ? 'En attente' : d.statut === 'traite' ? 'Traité' : 'Ignoré';
        const cls = d.statut === 'en-attente' ? 'en-attente' : d.statut === 'traite' ? 'traite' : 'ignore';
        document.getElementById('modalContent').innerHTML = `
            <div class="modal-detail-item"><span class="label">Nom / Entreprise</span><span class="value"><strong>${esc(d.nom || '—')}</strong></span></div>
            <div class="modal-detail-item"><span class="label">Email</span><span class="value">${esc(d.email || '—')}</span></div>
            <div class="modal-detail-item"><span class="label">Téléphone</span><span class="value">${esc(d.telephone || '—')}</span></div>
            <div class="modal-detail-item"><span class="label">Prestation</span><span class="value"><strong>${esc(d.typeProjet || '—')}</strong></span></div>
            <div class="modal-detail-item"><span class="label">Date</span><span class="value">${esc(d.date)}</span></div>
            <div class="modal-detail-item"><span class="label">Statut</span><span class="value"><span class="status-badge ${cls}">${lbl}</span></span></div>
            <div class="modal-detail-item" style="border-bottom:none; flex-direction:column; align-items:flex-start;">
                <span class="label" style="width:100%; margin-bottom:0.3rem;">Description du projet</span>
                <span class="value" style="background:var(--bg-light); padding:1rem; border-radius:6px; width:100%; font-size:0.95rem;">${esc(d.description || 'Aucune description fournie.')}</span>
            </div>`;
        document.getElementById('detailModal').classList.add('active');
    };
    window.fermerModal = function () {
        document.getElementById('detailModal').classList.remove('active');
    };

    window.appliquerFiltres = function () {
        renderDemandes(
            document.getElementById('searchInput').value,
            document.getElementById('statusFilter').value
        );
    };
    window.reinitialiserFiltres = function () {
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = 'all';
        renderDemandes('', 'all');
    };

    async function chargerDemandes() {
        try {
            demandesCache = await window.API.listerDevis();
        } catch (e) {
            console.error(e);
            demandesCache = [];
        }
        appliquerFiltres();
    }

    // =======================================================================
    // TABS & INIT
    // =======================================================================
    window.switchTab = function (tab) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');
        document.querySelector(`.tab-btn[onclick="switchTab('${tab}')"]`).classList.add('active');
        if (tab === 'realisations') chargerRealisations();
    };

    let initDone = false;
    window.initAdmin = function () {
        if (initDone) { chargerDemandes(); return; }
        initDone = true;

        bindImagePreview();
        document.getElementById('detailModal').addEventListener('click', function (e) {
            if (e.target === this) window.fermerModal();
        });
        document.getElementById('detailRealModal').addEventListener('click', function (e) {
            if (e.target === this) window.fermerRealModal();
        });
        document.getElementById('searchInput').addEventListener('keyup', function (e) {
            if (e.key === 'Enter') window.appliquerFiltres();
        });

        chargerDemandes();
        chargerRealisations();
    };
})();
