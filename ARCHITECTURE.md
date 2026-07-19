# Architecture Système - Épargne à la Carte

Ce document présente l'architecture globale, le schéma de base de données PostgreSQL, la configuration RLS, les triggers, et l'implémentation des workflows métier pour le système "Épargne à la Carte".

---

## 1. Vue d'ensemble du Système

Le système "Épargne à la Carte" est un outil de micro-finance hiérarchisé permettant de gérer les carnets d'épargne des clients via des agents de terrain, supervisés par des superviseurs, sous la direction d'administrateurs et d'un super-administrateur.

```
                              [ Super Admin ]
                                     │ (Gère et crée)
                                     ▼
                             [ Admin Principal ]
                                     │ (Gère et crée)
                                     ▼
                               [ Superviseur ]
                                     │ (Gère et crée)
                                     ▼
                              [ Agent Terrain ]
                                     │ (Gère et crée)
                                     ▼
                                 [ Client ]
                                     │ (Possède)
                                     ▼
                             [ Carnet d'Épargne ] ──(500 FC Frais Fixes)
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
            [ Dépôts (Max 31) ]               [ Retrait Archivé ]
             - Règle: k × daily_mise           - Montant: Total - Premier Dépôt
                                               - Split: 50% Agent / 50% Org
```

---

## 2. Dictionnaire des Rôles

Le système met en œuvre une hiérarchie stricte via Supabase Auth et un profil utilisateur :

1. **Super Admin (`super_admin`)** :
   - Rôle sommital.
   - Peut créer et supprimer les **Admin Principaux**.
   - A un accès complet en lecture et écriture sur l'ensemble de la base de données.

2. **Admin Principal (`admin_principal`)** :
   - Gère le niveau régional ou organisationnel.
   - Peut créer et supprimer les **Superviseurs**.
   - Accès complet aux rapports, validations des retraits, exports, et à toutes les données opérationnelles.

3. **Superviseur (`supervisor`)** :
   - Encadre une équipe d'agents.
   - Peut créer des **Agents de Terrain**.
   - **Visibilité restreinte** : Ne voit que ses agents, les clients associés à ses agents, et les carnets de ces clients.

4. **Agent de Terrain (`agent`)** :
   - En contact direct avec les clients.
   - Peut modifier son profil, créer les clients, ouvrir des carnets (avec premier dépôt obligatoire), enregistrer des dépôts, et initier des demandes de retrait.
   - **Visibilité restreinte** : Ne voit que lui-même, ses clients, ses carnets, et ses retraits.
   - **Règle temporelle** : Ne peut modifier un carnet que durant les premières 24 heures suivant sa création.

---

## 3. Schéma Relationnel de la Base de Données

Les entités fondamentales sont modélisées ci-dessous :

```
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│    auth.users        │      │    user_profiles     │      │     supervisors      │
├──────────────────────┤      ├──────────────────────┤      ├──────────────────────┤
│ id (PK)              │─────>│ id (PK, FK)          │─────>│ id (PK, FK)          │
│ email                │      │ role (enum)          │      │ admin_id (FK)        │
└──────────────────────┘      │ full_name            │      └──────────────────────┘
                              │ phone                │                  │
                              └──────────────────────┘                  │
                                         ▲                              │
                                         │                              ▼
                              ┌──────────────────────┐      ┌──────────────────────┐
                              │    terrain_agents    │<─────│    savings_carnets   │
                              ├──────────────────────┤      ├──────────────────────┤
                              │ id (PK, FK)          │      │ id (PK)              │
                              │ supervisor_id (FK)   │<─────│ carnet_number (Unique)│
                              └──────────────────────┘      │ client_id (FK)       │
                                         ▲                  │ daily_mise           │
                                         │                  │ agent_id (FK)        │
                                         │                  │ supervisor_id (FK)   │
                                         │                  │ status (enum)        │
                                         │                  └──────────────────────┘
                                         │                              │
                                         │                              ▼
                              ┌──────────────────────┐      ┌──────────────────────┐
                              │       clients        │      │   carnet_deposits    │
                              ├──────────────────────┤      ├──────────────────────┤
                              │ id (PK)              │<─────│ id (PK)              │
                              │ name                 │      │ carnet_id (FK)       │
                              │ phone                │      │ amount               │
                              │ address              │      │ slots_count (Int)    │
                              │ created_by (FK)      │      └──────────────────────┘
                              └──────────────────────┘
```

### Autres tables comptables et administratives

- **`withdrawal_requests`** : Demandes de retrait soumises par les agents, validées par les admins.
- **`withdrawals`** : Retraits effectués après validation.
- **`ledger`** : Grand livre comptable enregistrant les flux financiers :
  - Vente de carnets (500 FC).
  - Commission Agent (50% du premier dépôt).
  - Revenu Organisation (50% du premier dépôt).
- **`agent_monthly_rewards`** : Récompenses calculées mensuellement pour les agents basées sur leurs carnets échus.
- **`org_revenue_snapshots`** : Instantanés mensuels des revenus de l'organisation.

---

## 4. Règles de Gestion et Algorithmes Métiers

### 4.1 Premier Dépôt Obligatoire à la Création du Carnet

Pour éviter les carnets fantômes, la base de données valide qu'un dépôt est inséré en même temps que le carnet.

- **Solution PostgreSQL** : Un trigger de contrainte `DEFERRABLE INITIALLY DEFERRED` vérifie au moment du `COMMIT` que la table `carnet_deposits` possède au moins une ligne correspondant au nouveau carnet. Si ce n'est pas le cas, le transaction est annulée.

### 4.2 Règle Temporelle de Modification

Les agents ne peuvent modifier les détails d'un carnet (comme le montant de la mise quotidienne) que dans un délai de 24h après création.

- **Solution PostgreSQL** : Une règle `BEFORE UPDATE` vérifie que `NOW() - created_at < INTERVAL '24 hours'`.

### 4.3 Validation des Dépôts

Chaque dépôt doit respecter la formule `Amount = daily_mise * k`.

- **Solution PostgreSQL** : Un trigger ou une contrainte valide que `amount % daily_mise = 0`.
- De plus, pour le **Modèle A (Slots par colonne - Par défaut)**, si un dépôt contient `k` slots, le système ajoute `k` au compteur de slots du carnet. Si la somme dépasse 31, le dépôt est intercepté et rejeté.
- Dès que le carnet atteint exactement 31 slots, le carnet change d'état pour devenir `locked` (Verrouillé). Aucun dépôt n'est plus autorisé dans cet état.

### 4.4 Flow de Retrait et Calcul des Gains

1. L'agent effectue une demande de retrait (`withdrawal_requests`) sur un carnet verrouillé.
2. Le montant retirable est calculé ainsi :
   $$\text{Montant Retirable} = \text{Total des Dépôts} - \text{Premier Dépôt}$$
3. L'Admin Principal ou le Super Admin valide la demande.
4. À la validation :
   - Une ligne est ajoutée dans `withdrawals`.
   - Le statut du carnet passe à `archived`.
   - Le Grand Livre (`ledger`) est alimenté :
     - **Part Agent** : $50\% \times \text{Premier Dépôt}$ créditée en gain agent.
     - **Part Organisation** : $50\% \times \text{Premier Dépôt}$ créditée en part organisation.
     - **Vente Carnet** : La ligne de 500 FC a déjà été enregistrée à la création du carnet.
