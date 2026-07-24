/* ============================================================================
 * COUCHE D'ACCÈS AUX DONNÉES (API)
 * ----------------------------------------------------------------------------
 * Point d'entrée unique vers la base de données. Le reste de l'application ne
 * parle JAMAIS directement à Supabase : tout passe par window.API. Cela isole
 * le back-end — pour changer de fournisseur, il suffit de réécrire ce fichier.
 *
 * Les objets renvoyés sont normalisés pour l'interface (typeProjet, date, ...).
 * ========================================================================== */
(function () {
    const BUCKET = 'realisations';

    function sb() {
        if (!window.sb) {
            throw new Error('Base de données non configurée (voir assets/js/config.js).');
        }
        return window.sb;
    }

    // Échappe le texte avant insertion dans du HTML (protection anti-XSS).
    // Indispensable : les champs de devis sont saisis par des visiteurs.
    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return iso;
        }
    }

    // -- Normalisation (colonnes SQL -> objets utilisés par l'interface) -----
    function mapDevis(row) {
        return {
            id: row.id,
            nom: row.nom,
            email: row.email,
            telephone: row.telephone,
            typeProjet: row.type_projet,
            description: row.description,
            statut: row.statut,
            date: formatDate(row.created_at)
        };
    }

    function mapRealisation(row) {
        return {
            id: row.id,
            titre: row.titre,
            description: row.description,
            images: Array.isArray(row.images) ? row.images : [],
            date: formatDate(row.created_at)
        };
    }

    // =======================================================================
    // DEVIS
    // =======================================================================
    async function creerDevis(payload) {
        const { error } = await sb().from('devis').insert({
            nom:         payload.nom,
            email:       payload.email,
            telephone:   payload.telephone,
            type_projet: payload.typeProjet,
            description: payload.description
        });
        if (error) throw error;
    }

    async function listerDevis() {
        const { data, error } = await sb()
            .from('devis')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapDevis);
    }

    async function changerStatutDevis(id, statut) {
        const { error } = await sb().from('devis').update({ statut }).eq('id', id);
        if (error) throw error;
    }

    async function supprimerDevis(id) {
        const { error } = await sb().from('devis').delete().eq('id', id);
        if (error) throw error;
    }

    // =======================================================================
    // RÉALISATIONS
    // =======================================================================
    async function listerRealisations() {
        const { data, error } = await sb()
            .from('realisations')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(mapRealisation);
    }

    // Envoie les fichiers dans le stockage, puis crée la ligne.
    async function creerRealisation({ titre, description, files }) {
        const urls = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

            const up = await sb().storage.from(BUCKET).upload(path, file, {
                cacheControl: '3600',
                upsert: false
            });
            if (up.error) throw up.error;

            const pub = sb().storage.from(BUCKET).getPublicUrl(path);
            urls.push(pub.data.publicUrl);
        }

        const { error } = await sb().from('realisations').insert({
            titre, description, images: urls
        });
        if (error) throw error;
    }

    async function supprimerRealisation(id, images) {
        // Supprime d'abord les fichiers du stockage (best-effort).
        if (Array.isArray(images) && images.length) {
            const marker = `/${BUCKET}/`;
            const paths = images
                .map(url => (url.includes(marker) ? url.split(marker)[1] : null))
                .filter(Boolean);
            if (paths.length) {
                await sb().storage.from(BUCKET).remove(paths); // erreurs ignorées
            }
        }
        const { error } = await sb().from('realisations').delete().eq('id', id);
        if (error) throw error;
    }

    // Modifie titre/description, garde certaines images existantes (keepImages)
    // et ajoute de nouveaux fichiers uploadés (newFiles). Ne touche jamais aux
    // images des AUTRES réalisations : tout est filtré par id.
    async function modifierRealisation(id, { titre, description, keepImages, newFiles }) {
        const urls = [...keepImages];
        for (let i = 0; i < newFiles.length; i++) {
            const file = newFiles[i];
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

            const up = await sb().storage.from(BUCKET).upload(path, file, {
                cacheControl: '3600',
                upsert: false
            });
            if (up.error) throw up.error;

            const pub = sb().storage.from(BUCKET).getPublicUrl(path);
            urls.push(pub.data.publicUrl);
        }

        const { error } = await sb().from('realisations')
            .update({ titre, description, images: urls })
            .eq('id', id);
        if (error) throw error;
    }

    // Supprime du stockage les images retirées lors d'une modification (best-effort).
    async function supprimerImagesStorage(images) {
        if (!Array.isArray(images) || !images.length) return;
        const marker = `/${BUCKET}/`;
        const paths = images
            .map(url => (url.includes(marker) ? url.split(marker)[1] : null))
            .filter(Boolean);
        if (paths.length) {
            await sb().storage.from(BUCKET).remove(paths); // erreurs ignorées
        }
    }

    window.API = {
        escapeHtml, formatDate,
        creerDevis, listerDevis, changerStatutDevis, supprimerDevis,
        listerRealisations, creerRealisation, supprimerRealisation,
        modifierRealisation, supprimerImagesStorage
    };
})();
