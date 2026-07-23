-- ============================================================================
-- HSMETALLERIE — Schéma de base de données (Supabase / PostgreSQL)
-- ----------------------------------------------------------------------------
-- À exécuter UNE FOIS dans le SQL Editor de votre projet Supabase.
-- (Supabase > votre projet > SQL Editor > New query > coller > Run)
--
-- Ce script crée :
--   1. la table `devis`         (demandes de devis envoyées par le site public)
--   2. la table `realisations`  (portfolio géré depuis l'admin)
--   3. les règles de sécurité   (RLS) : le public peut ENVOYER un devis et LIRE
--      les réalisations, mais seul un administrateur connecté peut consulter les
--      devis et modifier le portfolio.
--   4. le bucket de stockage    `realisations` pour les images.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. TABLE DES DEMANDES DE DEVIS
-- ---------------------------------------------------------------------------
create table if not exists public.devis (
    id          uuid primary key default gen_random_uuid(),
    nom         text        not null,
    email       text        not null,
    telephone   text        not null,
    type_projet text,
    description text        not null,
    statut      text        not null default 'en-attente'
                            check (statut in ('en-attente', 'traite', 'ignore')),
    created_at  timestamptz not null default now()
);

comment on table public.devis is 'Demandes de devis soumises depuis le formulaire public.';


-- ---------------------------------------------------------------------------
-- 2. TABLE DES RÉALISATIONS (PORTFOLIO)
-- ---------------------------------------------------------------------------
create table if not exists public.realisations (
    id          uuid primary key default gen_random_uuid(),
    titre       text        not null,
    description text        not null,
    images      jsonb       not null default '[]'::jsonb,  -- tableau d'URLs publiques
    created_at  timestamptz not null default now()
);

comment on table public.realisations is 'Projets affichés dans la galerie publique.';


-- ---------------------------------------------------------------------------
-- 3. SÉCURITÉ AU NIVEAU DES LIGNES (Row Level Security)
-- ---------------------------------------------------------------------------
alter table public.devis        enable row level security;
alter table public.realisations enable row level security;

-- DEVIS -----------------------------------------------------------------
-- N'importe quel visiteur peut ENVOYER une demande...
drop policy if exists "devis_insert_public" on public.devis;
create policy "devis_insert_public"
    on public.devis for insert
    to anon, authenticated
    with check (true);

-- ...mais seul un administrateur connecté peut les lire / modifier / supprimer.
drop policy if exists "devis_select_admin" on public.devis;
create policy "devis_select_admin"
    on public.devis for select
    to authenticated
    using (true);

drop policy if exists "devis_update_admin" on public.devis;
create policy "devis_update_admin"
    on public.devis for update
    to authenticated
    using (true) with check (true);

drop policy if exists "devis_delete_admin" on public.devis;
create policy "devis_delete_admin"
    on public.devis for delete
    to authenticated
    using (true);

-- RÉALISATIONS ----------------------------------------------------------
-- Tout le monde peut LIRE le portfolio...
drop policy if exists "real_select_public" on public.realisations;
create policy "real_select_public"
    on public.realisations for select
    to anon, authenticated
    using (true);

-- ...seul un administrateur connecté peut le gérer.
drop policy if exists "real_insert_admin" on public.realisations;
create policy "real_insert_admin"
    on public.realisations for insert
    to authenticated
    with check (true);

drop policy if exists "real_update_admin" on public.realisations;
create policy "real_update_admin"
    on public.realisations for update
    to authenticated
    using (true) with check (true);

drop policy if exists "real_delete_admin" on public.realisations;
create policy "real_delete_admin"
    on public.realisations for delete
    to authenticated
    using (true);


-- ---------------------------------------------------------------------------
-- 4. STOCKAGE DES IMAGES (bucket public en lecture, écriture réservée admin)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('realisations', 'realisations', true)
on conflict (id) do nothing;

drop policy if exists "real_files_read" on storage.objects;
create policy "real_files_read"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'realisations');

drop policy if exists "real_files_insert" on storage.objects;
create policy "real_files_insert"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'realisations');

drop policy if exists "real_files_update" on storage.objects;
create policy "real_files_update"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'realisations');

drop policy if exists "real_files_delete" on storage.objects;
create policy "real_files_delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'realisations');


-- ============================================================================
-- ADMINISTRATEUR
-- ----------------------------------------------------------------------------
-- Il n'y a PAS d'inscription publique. Créez le compte admin manuellement :
--   Supabase > Authentication > Users > "Add user" > Email + mot de passe.
-- Ce compte est le seul à pouvoir se connecter à admin.html.
-- (Désactivez aussi les inscriptions : Authentication > Providers > Email >
--  "Allow new users to sign up" = OFF.)
-- ============================================================================
