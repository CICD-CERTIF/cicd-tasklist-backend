# =========================================================================
# ÉTAPE 1 : COMPILATION ET PRÉPARATION (BUILD STAGE)
# =========================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copie des fichiers de configuration des dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installation de TOUTES les dépendances (y compris Prisma et TypeScript)
RUN npm ci

# Génération du client Prisma spécifique à l'architecture Alpine
RUN npx prisma generate

# Copie du reste du code source backend
COPY . .

# Compilation du code TypeScript en JavaScript (génère le dossier dist/)
RUN npm run build

# Nettoyage : On ne garde que les dépendances de production pour alléger l'image finale
RUN npm prune --production

# =========================================================================
# ÉTAPE 2 : IMAGE DE PRODUCTION ULTRA-LÉGÈRE (RUN STAGE)
# =========================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Récupération des fichiers légers et optimisés depuis l'étape précédente
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Variable d'environnement par défaut pour la production
ENV NODE_ENV=production
# Port exposé par le conteneur du backend
EXPOSE 3000

# Commande de démarrage de l'application
CMD ["node", "dist/server.js"]