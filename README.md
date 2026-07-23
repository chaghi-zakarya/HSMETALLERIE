# HSMETALLERIE — Site vitrine + espace administrateur

Site vitrine (public) et panneau d'administration pour **SARL HSMETALLERIE**
(construction et ouvrages métalliques, Versailles).

Le site est **statique** (HTML/CSS/JS, aucun framework) et s'appuie sur
**[Supabase](https://supabase.com)** pour la base de données, l'authentification
et le stockage des images. Il fonctionne donc sur **n'importe quel hébergement**
(Netlify, Vercel, OVH, hébergement mutualisé, GitHub Pages…) — la sécurité et les
données ne dépendent pas du serveur web.

## Structure du projet

```
├── index.html            Site public (accueil, prestations, galerie, devis)
├── admin.html            Espace admin (connexion + gestion devis/réalisations)
├── assets/
│   ├── css/
│   │   ├── styles.css     Styles du site public
│   │   └── admin.css      Styles de l'admin (+ écran de connexion)
│   └── js/
│       ├── config.js      ⚙️  Clés Supabase À RENSEIGNER
│       ├── supabase.js    Initialisation du client Supabase
│       ├── api.js         Couche d'accès aux données (seul point vers la BDD)
│       ├── main.js        Logique du site public
│       ├── admin.js       Logique du panneau admin
│       └── auth.js        Connexion / déconnexion admin
├── db/
│   └── schema.sql         Schéma BDD + sécurité + stockage (à exécuter 1 fois)
└── README.md
```

## Flux des données

```
Visiteur ──(formulaire devis)──▶  table `devis`  ◀──(lecture/gestion)── Admin connecté
Admin ──(ajout réalisation)──▶ table `realisations` + bucket `realisations`
                                        │
Visiteur ◀──────(galerie, lecture publique)─────────┘
```

- Les demandes de devis sont **enregistrées en base** : elles apparaissent dans
  l'admin **depuis n'importe quel appareil** (fini le localStorage).
- Les réalisations ajoutées par l'admin sont visibles par **tous les visiteurs**.
- Les images sont hébergées dans le **stockage Supabase**, pas en base64.

## Mise en route (une seule fois)

1. **Créer un projet Supabase** sur https://supabase.com (offre gratuite suffisante).

2. **Créer la base** : dans Supabase → *SQL Editor* → *New query*, coller le
   contenu de [`db/schema.sql`](db/schema.sql) puis *Run*.

3. **Créer le compte administrateur** : Supabase → *Authentication* → *Users* →
   *Add user* → saisir un e-mail + mot de passe. C'est ce compte qui sert à se
   connecter à `admin.html`.
   - Puis *Authentication* → *Providers* → *Email* → désactiver
     **« Allow new users to sign up »** (aucune inscription publique).

4. **Renseigner les clés** dans [`assets/js/config.js`](assets/js/config.js) :
   - `SUPABASE_URL` et `SUPABASE_ANON_KEY` se trouvent dans
     Supabase → *Project Settings* → *API*.
   - ⚠️ Utiliser uniquement la clé **anon / public** (jamais `service_role`).

5. **Tester en local** :
   ```bash
   python -m http.server 8000
   # http://localhost:8000/index.html  et  /admin.html
   ```

6. **Mettre en ligne** : déposer tous les fichiers sur votre hébergement.
   Aucune configuration serveur n'est nécessaire.

## Sécurité

- L'accès admin est protégé par une **authentification Supabase réelle**
  (e-mail + mot de passe), pas par un mot de passe caché dans le code.
- Les règles **RLS** (dans `schema.sql`) garantissent que le public peut
  seulement *envoyer un devis* et *lire la galerie* ; consulter les devis et
  gérer le portfolio exige d'être connecté.
- La clé `anon` exposée dans `config.js` est prévue pour être publique ; ce sont
  les règles RLS qui protègent les données.

## Évolution possible : notification e-mail

Pour recevoir un e-mail à chaque nouvelle demande de devis, ajouter dans Supabase
un *Database Webhook* (ou une *Edge Function*) déclenché sur `insert` de la table
`devis`, relié à un service d'envoi (Resend, SendGrid…). Le code du site n'a pas
besoin d'être modifié.
