# AI Use Case Navigator

Outil interactif de cartographie et d'évaluation des usages IA en entreprise.

**[Voir la démo en ligne](https://lb-66.github.io/ai-use-case-navigator/)**

---

## À quoi ça sert ?

La plupart des organisations ne savent pas quels outils IA leurs équipes utilisent,
sur quelles données, et avec quels risques. Ce projet répond à cette question.

L'AI Use Case Navigator permet de cartographier les usages IA existants,
d'évaluer automatiquement leur valeur et leur niveau de risque,
et de prioriser les déploiements de façon responsable.

---

## Fonctionnalités

- Formulaire de déclaration d'usage par département
- Estimation automatique du temps IA par analyse sémantique de la description
- Scoring automatique : valeur (0–10) et risque (0–10)
- Analyse gain vs risque avec conseil personnalisé
- Recommandations alignées EU AI Act et RGPD
- 5 visualisations interactives
- Base de connaissances métiers intégrée
- Sauvegarde automatique des données

---

## Les 5 visualisations

| Graphique | Ce qu'il montre |
|---|---|
| Diagramme Camembert | Répartition des usages par département |
| Barres groupées | Valeur vs Risque par usage |
| Jauge | Niveau de risque global de l'organisation |
| Barres horizontales | Gain de temps humain vs IA par usage |
| Matrice scatter | Aide à la décision — quel usage déployer en priorité |

---

## Base de connaissances métiers

Le projet intègre une base de données métiers structurée (`data/use_cases.json`)
qui enrichit le scoring automatiquement selon le contexte du poste.

Profil actuellement intégré :

**Chargé de mission RH**
- Niveau de confidentialité des données : Très élevé
- Risque IA inhérent : Élevé
- Raison : données personnelles sensibles, encadrées par le RGPD Art.22
  et l'EU AI Act (haut risque pour les décisions automatisées RH)
- 5 tâches analysées avec gain estimé et niveau de risque

Conséquence concrète sur le scoring : tout usage RH a un plancher
de risque minimum de 6/10, même si l'utilisateur ne coche aucune donnée sensible.
C'est le reflet du risque inhérent au métier, indépendamment de la tâche.

---

## Stack technique

| Technologie | Usage |
|---|---|
| HTML / CSS | Structure et design |
| JavaScript vanilla | Logique métier et interactivité |
| Chart.js | Visualisations graphiques |
| localStorage | Persistance des données |
| JSON | Base de connaissances métiers |
| GitHub Pages | Hébergement gratuit |

---

## Axes d'amélioration

- [ ] Export PDF — rapport prêt à présenter en CODIR
- [ ] Export CSV — données exportables pour Excel
- [ ] Connexion API Claude (Anthropic) — estimation du temps IA en temps réel
      par un vrai LLM au lieu de la simulation par mots-clés
- [ ] Enrichissement de la base métiers — Finance, Juridique, Marketing, IT,
      Direction (fiches déjà structurées dans use_cases.json)
- [ ] Suggestions de tâches — quand on sélectionne RH, proposer les tâches
      connues de la fiche métier pour guider l'utilisateur
- [ ] Pré-remplissage intelligent — temps humain pré-rempli depuis la fiche métier
- [ ] Authentification multi-utilisateurs
- [ ] Base de données serveur pour partage entre équipes

---


## Contexte

Projet développé dans le cadre de la formation **Référent IA** — emlyon business school.

Objectif : démontrer concrètement les compétences de cartographie,
gouvernance et pilotage des usages IA en entreprise.

---

*Projet open source — contributions bienvenues*
