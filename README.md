# CodeAlpha E-commerce Store

Application e-commerce full stack pensée pour un projet CodeAlpha. Le dépôt est organisé en deux parties distinctes :

- frontend : interface React + TypeScript + Vite
- backend : API Express + TypeScript + Mongoose

## Architecture

- Frontend : React, Vite, React Router, Tailwind CSS, Zustand-like local cart state via Context API
- Backend : Node.js, Express, TypeScript, Mongoose, JWT, Zod, bcrypt
- Base de données : MongoDB Atlas avec la base `codealpha_ecommerce`

## Prérequis

- Node.js `^20.19.0` ou `>=22.12.0` (requis par la chaîne Vite actuelle)
- npm
- MongoDB Atlas URI une fois fournie

## Installation

```bash
npm install
```

## Configuration

### Backend

Copiez le fichier d'exemple :

```bash
cp backend/.env.example backend/.env
```

Renseignez au minimum :

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `FRONTEND_URL`

### Frontend

```bash
cp frontend/.env.example frontend/.env
```

Le fichier frontend ne doit pas contenir de secret serveur, uniquement `VITE_API_URL`.

## Lancement en développement

```bash
npm run dev
```

## Scripts disponibles

```bash
npm run build
npm run test
npm run lint
npm run typecheck
```

## Structure
documents et la codebase sont organisés en modules backend/frontend.

## MongoDB Atlas

L'application est préparée pour utiliser MongoDB Atlas. Le backend exige une URI valide avant de démarrer en production. Sans le secret Atlas, la connexion est refusée en production et les scripts seed/check-db signalent clairement l'absence de configuration.

### Vérifier la connexion

Configurez `backend/.env` localement, puis lancez le contrôle non destructif :

```bash
npm run verify:mongodb --workspace backend
```

Le contrôle charge explicitement `backend/.env`, refuse les marqueurs de remplacement avant toute connexion, envoie un ping MongoDB et n'affiche jamais l'URI. Le résultat de compilation ne prouve pas la connectivité Atlas.

Pour inventorier sans modification les collections et leurs volumes dans la base cible :

```bash
npm run inspect:mongodb --workspace backend
```

Audit des images produits réellement stockées dans Atlas (lecture seule ; affiche les noms, catégories et identifiants d'assets sans écrire ni afficher les URLs complètes) :

```bash
npm run audit:product-images --workspace backend
```

La commande `npm run images:apply-approved --workspace backend` applique uniquement la liste de 14 SKU explicitement approuvée dans le script `backend/src/scripts/apply-approved-product-images.ts`. Elle vérifie les URLs, les SKU/catégories et les anciennes images avant mise à jour, ne modifie que `images`, puis relit les documents. Elle n'appelle pas le seed général.

Dans les formulaires modaux de gestion des produits et des catégories, les images peuvent être fournies par URL ou téléversées depuis l’appareil. L’upload est réservé aux admins authentifiés, accepte JPG/PNG/WebP jusqu’à 5 Mo et vérifie la signature réelle du fichier. Les nouvelles images téléversées sont stockées comme données binaires dans MongoDB, dans la collection `productimageassets`, puis servies sous une URL stable `/api/products/images/:imageId`. Les anciennes URL `/uploads/product-images/` restent servies pour compatibilité ; le frontend redirige les URL d’upload absolues historiques vers l’hôte API configuré. Les fichiers historiques qui n’existent plus sur le disque ne peuvent pas être reconstruits à partir de leur URL.

Dans le storefront, les images de démonstration dont l'association a été vérifiée comme erronée sont remplacées par une illustration locale correspondant à la catégorie. Les enregistrements existants dans Atlas restent inchangés ; toute correction persistante des champs `images` doit être réalisée via une modification produit relue et approuvée par l'administrateur.

### Seed et preuve de persistance Atlas

Après avoir configuré un compte Atlas autorisé, ces commandes ciblent exclusivement `codealpha_ecommerce` :

```bash
npm run seed:atlas --workspace backend
npm run verify:atlas --workspace backend
```

Le seed crée les collections/index des modèles, puis ajoute uniquement les catégories et produits de démonstration manquants. Les documents existants sont ignorés, jamais mis à jour ou supprimés. La vérification ouvre une connexion distincte après fermeture de la première, relit les enregistrements directement dans Atlas, contrôle les références catégorie-produit, puis teste les opérations CRUD sur une catégorie temporaire et ne supprime que ce document créé pour le test. Les noms de collections et compteurs affichés ne contiennent aucune donnée personnelle.

### Création du premier administrateur

Depuis un terminal interactif, lancez :

```bash
npm run admin:create --workspace backend
```

Le script demande prénom, nom et email, puis le mot de passe deux fois avec saisie masquée. Il cible `codealpha_ecommerce`, refuse les URI incomplètes, n'écrase jamais un email existant, utilise le hash bcrypt du modèle `User`, puis relit le compte et vérifie le hash depuis Atlas. Aucun mot de passe n'est affiché. L'inscription publique demeure réservée au rôle `customer`; aucun formulaire ou endpoint public d'inscription Admin n'existe. La connexion Admin se fait sur `/admin/login` et l'accès aux routes Admin est aussi contrôlé par le backend.

### Migration des données

Aucune source locale de données métier ni aucun script de migration n'a été trouvé lors de l'audit. `backend/src/scripts/seed.ts` contient uniquement des données de démonstration (4 catégories et 21 produits) ; ce n'est pas une migration de données métier.

## Services e-commerce

### E-mails transactionnels

Le backend utilise Nodemailer/SMTP. L'envoi est désactivé tant que `SMTP_HOST`, `SMTP_USER` et `SMTP_PASS` ne sont pas configurés dans `backend/.env`. `SMTP_FROM` doit être une adresse expéditrice autorisée par le fournisseur, `SMTP_PORT` le port fourni, et `SMTP_SECURE=true` pour TLS implicite (généralement 465) ou `false` pour STARTTLS (généralement 587). Ne copiez jamais les identifiants dans le dépôt.

Les confirmations de commande sont déclenchées après création effective de la commande. Les notifications d'expédition et de livraison sont déclenchées après l'enregistrement de la transition d'état par un administrateur. Les erreurs SMTP sont signalées comme échecs, sans journaliser les secrets ni le contenu du message. Aucun fournisseur de paiement en ligne ni webhook n'est intégré. Après livraison et réception effective des espèces, un administrateur peut confirmer la collecte depuis le détail de commande ; cette action exige une note/référence, enregistre l'identité de l'administrateur et l'horodatage, puis déclenche la confirmation de paiement si SMTP fonctionne. Ne confirmez jamais la collecte avant de l'avoir vérifiée.

Après avoir configuré SMTP, connectez-vous avec un compte administrateur et :

1. appelez `GET /api/admin/email/smtp-check` pour vérifier la connexion SMTP sans envoyer de message ;
2. appelez `POST /api/admin/email/test` pour envoyer un message de contrôle uniquement à l'adresse du compte administrateur connecté.

Le message de contrôle n'est jamais envoyé à une adresse fournie dans la requête. Cette procédure ne déclenche aucun e-mail client ni aucun paiement. L'endpoint renvoie `sent: false` et une erreur HTTP si SMTP est indisponible ou si l'envoi échoue.

### Panier persistant

Les visiteurs utilisent le panier invité enregistré dans le `localStorage` du navigateur. À l'authentification, `POST /api/cart/merge` fusionne les articles invités avec le panier associé au compte, combine les produits identiques et limite les quantités au stock consulté côté serveur. La requête comporte un identifiant stable pour qu'une réponse réseau perdue puis rejouée ne double pas la fusion. Le panier d'un compte n'est accessible que via une route authentifiée, et le backend renvoie les prix et produits actuellement disponibles. Les commandes recalculent encore tous les prix et le stock au moment de leur création. Une erreur de synchronisation n'est pas silencieuse : elle est signalée dans l'interface du panier.

### Expédition et suivi

Les destinations et règles tarifaires sont configurables via `SHIPPING_COUNTRIES`, `SHIPPING_COST_EUR` et `FREE_SHIPPING_THRESHOLD_EUR` dans `backend/.env`. Par défaut, seul le Maroc (`MA`) est activé, avec un tarif fixe de projet de 15 EUR et la gratuité à partir de 200 EUR ; ces valeurs ne sont pas des devis de transporteur et doivent être validées par l'exploitant. Le checkout récupère une cotation calculée à partir des prix et du stock backend, puis la commande recalcule et enregistre ses montants. Les statuts et horodatages de traitement/expédition/livraison sont conservés dans la commande. Il n'y a pas d'intégration transporteur ni de suivi GPS ou de numéro de suivi.

### Devise et paiements

Les prix catalogue et commandes sont facturés en EUR, et l'interface formate les montants dans cette devise. Les anciens taux USD/GBP codés en dur ont été retirés ; aucune conversion ou sélection de devise n'est proposée sans source de taux fiable. La seule méthode de paiement actuellement acceptée est le paiement à la livraison. Son statut passe de `pending` à `paid` uniquement lorsqu'un administrateur confirme la réception réelle après livraison et fournit une note de preuve ; l'action est auditée et protégée par les permissions admin. Toute future intégration de paiement en ligne devra vérifier explicitement la devise EUR et s'appuyer sur un webhook ou un mécanisme fournisseur authentifié.

## Notes

- Aucun secret réel ne doit être versionné.
- Les fichiers d'exemple ne contiennent que des valeurs fictives.
- Les données de démonstration sont préparées dans le script de seed.
