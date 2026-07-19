# Adonai Épargne

Application de gestion de carnets d'épargne pour l'équipe Adonai.

## Description

Cette application permet de gérer des carnets d'épargne, d'enregistrer des dépôts, de suivre l'avancement des versements et de demander des retraits. Elle est conçue pour un usage mobile et desktop, avec un focus sur une prise en main rapide pour l'équipe terrain.

## Lien de test

- Déploiement de test : https://adonai-epargne.vercel.app/

## Fonctionnalités principales

- affichage des carnets et sélection d'un carnet dans le menu
- création de nouveaux carnets pour les agents
- gestion des dépôts et mise journalière
- demande de retrait pour carnets verrouillés
- affichage des informations clients et des totaux épargnés
- navigation mobile optimisée
- support PWA installable sur mobile et bureau

## Notes techniques

- projet React + TypeScript + Vite
- support PWA installable avec manifest et service worker
- données de démonstration stockées localement quand Supabase n'est pas configuré
- déploiement prévu sur Vercel pour tests rapides

## Comment contribuer

1. cloner le dépôt
2. installer les dépendances avec `npm install`
3. lancer en local avec `npm run dev`
4. valider les changements dans `git`

---

Ce README sera mis à jour au fur et à mesure de l'avancement des fonctionnalités et des retours de l'équipe.
