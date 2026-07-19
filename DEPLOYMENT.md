# Guide de Déploiement & Runbook

Ce document décrit comment déployer et valider la configuration Supabase pour le système "Épargne à la Carte".

---

## 1. Déploiement des Migrations SQL sur Supabase

### Option A : Via Supabase CLI (Recommandé)

1. Installez le CLI Supabase si ce n'est pas déjà fait :

   ```bash
   npm install -g supabase
   ```

2. Connectez-vous à votre compte Supabase :

   ```bash
   supabase login
   ```

3. Initialisez le projet dans votre dossier local :

   ```bash
   supabase init
   ```

4. Liez votre projet local au projet Supabase distant :

   ```bash
   supabase link --project-ref <votre-project-ref>
   ```

5. Appliquez les migrations :

   ```bash
   supabase db push
   ```

### Option B : Via le SQL Editor de Supabase

1. Connectez-vous à votre dashboard [Supabase](https://supabase.com).
2. Ouvrez le **SQL Editor**.
3. Copiez-collez le contenu de du fichier `supabase/migrations/20260630000000_initial_schema.sql`.
4. Cliquez sur **Run**.

---

## 2. Création et Attribution des Comptes Utilisateurs (Seeding)

Supabase gère l'authentification dans le schéma `auth`. Pour attribuer un rôle à un utilisateur à sa création, utilisez les commandes SQL suivantes dans le SQL Editor.

### 2.1 Enregistrement du Profil en Base

Chaque utilisateur créé dans `auth.users` doit correspondre à une ligne dans `public.user_profiles`. Vous pouvez automatiser cela via un trigger d'inscription ou le faire manuellement lors du provisionnement administratif :

```sql
-- Exemple : Création manuelle du Super Admin d'origine
-- Après l'inscription de l'utilisateur sur Supabase Auth, récupérez son ID (uuid)
INSERT INTO public.user_profiles (id, role, full_name, phone)
VALUES ('<uuid-super-admin>', 'super_admin', 'Super Administrateur Adonaï', '+243000000000');
```

### 2.2 Création de la Hiérarchie (Exemples)

```sql
-- 1. Un Super Admin crée un Admin Principal
INSERT INTO public.user_profiles (id, role, full_name, phone, created_by)
VALUES ('<uuid-admin>', 'admin_principal', 'Directeur Provincial', '+243111111111', '<uuid-super-admin>');

-- 2. Un Admin Principal crée un Superviseur
INSERT INTO public.user_profiles (id, role, full_name, phone, created_by)
VALUES ('<uuid-superviseur>', 'supervisor', 'Superviseur Bukavu', '+243222222222', '<uuid-admin>');

-- Déclaration de la relation Supervisor -> Admin
INSERT INTO public.supervisors (id, admin_id, created_by)
VALUES ('<uuid-superviseur>', '<uuid-admin>', '<uuid-admin>');

-- 3. Un Superviseur crée un Agent de terrain
INSERT INTO public.user_profiles (id, role, full_name, phone, created_by)
VALUES ('<uuid-agent>', 'agent', 'Agent Terrain A', '+243333333333', '<uuid-superviseur>');

-- Déclaration de la relation Agent -> Supervisor
INSERT INTO public.terrain_agents (id, supervisor_id, created_by)
VALUES ('<uuid-agent>', '<uuid-superviseur>', '<uuid-superviseur>');
```

---

## 3. Checklist de Validation

Avant d'ouvrir la plateforme en production, procédez aux tests de validation suivants :

### validation 1 : Premier Dépôt Obligatoire

Tentez d'insérer un carnet sans insérer de dépôt dans la même transaction :

- **Comportement attendu** : Une erreur de trigger `verify_carnet_has_first_deposit` doit annuler la transaction.

### validation 2 : Montant de Dépôt Invalide

Tentez d'ajouter un dépôt dont le montant n'est pas un multiple de la mise journalière :

- **Comportement attendu** : L'insertion doit échouer en levant l'exception `Le montant du dépôt doit être un multiple exact...`.

### validation 3 : Verrouillage au 31ème Dépot (Slots)

Ajoutez des dépôts successifs atteignant un total de 31 dépôts journaliers pour un carnet :

- **Comportement attendu** : Le carnet passe automatiquement en statut `locked`. Tout dépôt supplémentaire est rejeté.

### validation 4 : Restriction Temporelle (24 heures)

Insérez un carnet, attendez 24 heures (ou simulez en modifiant le champ `created_at` en base), puis essayez de modifier sa mise journalière (`daily_mise`) par le compte de l'agent :

- **Comportement attendu** : La base de données renvoie une erreur temporelle.

### validation 5 : RLS Audit

- Connectez-vous avec un compte Agent : vous devez voir uniquement vos propres clients.
- Connectez-vous avec un compte Superviseur : vous ne devez pas voir les clients des agents d'autres superviseurs.
