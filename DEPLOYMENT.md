# Guide de déploiement en production

## Problème résolu : Erreur 401 après connexion

### Cause du problème
Le problème était lié à la configuration des cookies de session. En production, l'application était configurée pour utiliser des cookies "secure" (qui nécessitent HTTPS), mais le serveur tourne sur HTTP (`http://82.25.116.60:3090`). Résultat : le navigateur refusait d'envoyer le cookie, causant une erreur 401 sur `/api/auth/me`.

### Solution appliquée
Le code a été modifié pour utiliser une variable d'environnement `USE_SECURE_COOKIES` au lieu de se baser sur `NODE_ENV`.

## Instructions de déploiement

### 1. Sur le serveur de production

Assurez-vous que votre fichier `.env` sur le serveur contient :

```env
DATABASE_URL="votre_url_de_base_de_données"
USE_SECURE_COOKIES=false
```

**Important** : 
- Si votre serveur utilise HTTP (comme actuellement), `USE_SECURE_COOKIES` doit être `false`
- Si vous migrez vers HTTPS (recommandé pour la production), mettez `USE_SECURE_COOKIES=true`

### 2. Rebuild et redémarrage

Après avoir mis à jour le code et le fichier `.env` sur le serveur :

```bash
# Installer les dépendances (si nécessaire)
npm install

# Rebuild l'application
npm run build

# Redémarrer l'application
# (La commande dépend de votre configuration : pm2, systemd, docker, etc.)
pm2 restart app-name
# ou
npm start
```

### 3. Vérification

Après le redémarrage :

1. Ouvrez `http://82.25.116.60:3090/login`
2. Connectez-vous avec vos identifiants
3. Vérifiez que vous êtes redirigé vers `/admin` sans erreur 401
4. Vérifiez dans la console du navigateur qu'il n'y a plus d'erreur

## Recommandations de sécurité

Pour une application en production, il est **fortement recommandé** d'utiliser HTTPS :

1. Obtenez un certificat SSL (Let's Encrypt gratuit avec Certbot)
2. Configurez votre serveur web (Nginx/Apache) pour HTTPS
3. Mettez à jour `.env` avec `USE_SECURE_COOKIES=true`
4. Redéployez l'application

### Exemple de configuration Nginx avec SSL

```nginx
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name votre-domaine.com;
    return 301 https://$server_name$request_uri;
}
```

## Résolution de problèmes

### Les cookies ne sont toujours pas envoyés ?

1. Vérifiez que `USE_SECURE_COOKIES=false` est bien dans le `.env` du serveur
2. Vérifiez que l'application a été rebuild après les modifications
3. Videz les cookies du navigateur pour le site
4. Consultez les logs du serveur pour d'éventuelles erreurs

### Erreur de base de données ?

Vérifiez que `DATABASE_URL` dans le `.env` du serveur pointe vers la bonne base de données de production.
