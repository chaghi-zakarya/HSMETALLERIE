/* ============================================================================
 * CONFIGURATION — à renseigner avant la mise en ligne
 * ----------------------------------------------------------------------------
 * Récupérez ces deux valeurs dans votre projet Supabase :
 *   Supabase > Project Settings > API
 *     - "Project URL"        -> SUPABASE_URL
 *     - "anon" / "public" key -> SUPABASE_ANON_KEY
 *
 * La clé "anon" est PRÉVUE pour être publique : la sécurité est assurée par les
 * règles RLS définies dans db/schema.sql. Ne mettez JAMAIS la clé "service_role"
 * ici — elle contourne toute sécurité.
 * ========================================================================== */
window.HSM_CONFIG = {
    SUPABASE_URL:      'https://VOTRE-PROJET.supabase.co',
    SUPABASE_ANON_KEY: 'VOTRE_CLE_ANON_PUBLIQUE',

    // Adresse affichée dans le pied de page / contact.
    EMAIL_CONTACT: 'hsmetallerie@gmail.com'
};
