/* ============================================================================
 * Initialisation du client Supabase.
 * Nécessite que le SDK (supabase-js) et config.js soient chargés AVANT ce fichier.
 * Expose le client global sous window.sb.
 * ========================================================================== */
(function () {
    const cfg = window.HSM_CONFIG || {};

    const configure =
        cfg.SUPABASE_URL &&
        cfg.SUPABASE_ANON_KEY &&
        !cfg.SUPABASE_URL.includes('VOTRE-PROJET') &&
        !cfg.SUPABASE_ANON_KEY.includes('VOTRE_CLE');

    if (!configure) {
        console.error(
            '[HSMETALLERIE] Configuration Supabase manquante. ' +
            'Renseignez SUPABASE_URL et SUPABASE_ANON_KEY dans assets/js/config.js.'
        );
        window.sb = null;
        window.HSM_READY = false;
        return;
    }

    // Le SDK UMD expose l'objet global `supabase`.
    window.sb = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    window.HSM_READY = true;
})();
