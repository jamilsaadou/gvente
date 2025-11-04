# Plateforme de Gestion des Ventes

Une plateforme intuitive et esthétique pour gérer un processus de vente en deux étapes avec Next.js, TypeScript et SQLite.

## 🎯 Fonctionnalités

### Gestion des rôles
- **Administrateur** : Gestion complète (utilisateurs, statistiques, ventes)
- **Agent d'accueil** : Enregistrement des ventes avec génération de reçus
- **Contrôleur** : Validation des reçus et autorisation de retrait

### Processus de vente en 2 étapes

#### Étape 1 : Enregistrement par l'agent d'accueil
- Saisie des informations de l'agent acheteur (nom, prénom, matricule, grade)
- Sélection des produits avec calcul automatique du montant total
- Génération et impression du reçu

#### Étape 2 : Validation au point de contrôle
- Vérification du reçu par le contrôleur
- Validation de la commande dans le système
- Autorisation du retrait des produits

### Tableau de bord administrateur
- Statistiques en temps réel (ventes totales, revenus, statuts)
- Graphiques et analyses (par jour, par produit, par agent)
- Gestion des utilisateurs (création, modification, rôles)
- Historique complet des ventes

## 🛒 Produits disponibles

| Produit | Poids | Prix (FCFA) |
|---------|-------|-------------|
| Riz | 50 KG | 16 500 |
| Riz | 25 KG | 8 250 |
| Maïs | 100 KG | 13 500 |
| Mil | 50 KG | 6 750 |
| Mil | 100 KG | 13 500 |
| Sorgho | 50 KG | 6 750 |
| Sorgho | 100 KG | 13 500 |

## 🚀 Installation

1. **Cloner le projet**
   ```bash
   cd "Gestion des ventes"
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Lancer le serveur de développement**
   ```bash
   npm run dev
   ```

4. **Ouvrir l'application**
   ```
   http://localhost:3000
   ```

## 🔐 Connexion par défaut

- **Utilisateur** : `admin`
- **Mot de passe** : `admin123`

## 📚 Stack technique

- **Framework** : Next.js 15 avec App Router
- **Langage** : TypeScript
- **Base de données** : SQLite (better-sqlite3)
- **Authentification** : bcryptjs avec cookies HTTP-only
- **Styling** : Tailwind CSS
- **Icônes** : Lucide React
- **Graphiques** : Recharts

## 🎨 Design

Interface moderne avec :
- Couleurs light et joyeuses
- Design responsive
- Icônes web intuitives
- Impression optimisée pour les reçus
- Animations fluides

## 📁 Structure du projet

```
.
├── app/                    # Pages Next.js (App Router)
│   ├── admin/             # Interface administrateur
│   ├── agent/             # Interface agent d'accueil
│   ├── controller/        # Interface contrôleur
│   ├── login/             # Page de connexion
│   ├── api/               # Routes API
│   │   ├── auth/          # Authentification
│   │   ├── users/         # Gestion utilisateurs
│   │   ├── sales/         # Gestion ventes
│   │   ├── products/      # Liste produits
│   │   └── stats/         # Statistiques
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Page d'accueil
├── components/            # Composants réutilisables
│   └── Navbar.tsx         # Barre de navigation
├── lib/                   # Utilitaires et logique métier
│   ├── database.ts        # Configuration SQLite
│   ├── auth.ts            # Gestion authentification
│   ├── sales.ts           # Logique métier ventes
│   └── types.ts           # Types TypeScript
└── sales.db              # Base de données SQLite (généré automatiquement)
```

## 🔧 Scripts disponibles

```bash
npm run dev      # Lancer en mode développement
npm run build    # Créer un build de production
npm run start    # Lancer en mode production
npm run lint     # Vérifier le code
```

## 📱 Fonctionnalités supplémentaires

- **Reçus imprimables** : Design optimisé pour l'impression
- **Validation en temps réel** : Vérification instantanée des reçus
- **Statistiques détaillées** : Analyses par période, produit et agent
- **Interface intuitive** : Navigation claire et fluide
- **Sécurité** : Authentification par rôle, cookies sécurisés

## 🔒 Sécurité

- Mots de passe hashés avec bcrypt
- Cookies HTTP-only pour les sessions
- Validation des rôles pour chaque route API
- Protection contre les injections SQL avec prepared statements

## 📝 Notes

- La base de données SQLite est créée automatiquement au premier lancement
- Un utilisateur administrateur par défaut est créé (admin/admin123)
- Les produits sont pré-configurés dans la base de données

## 🤝 Support

Pour toute question ou assistance, contactez l'administrateur système.

---

**Version** : 1.0.0  
**Développé avec** ❤️ **et** Next.js
