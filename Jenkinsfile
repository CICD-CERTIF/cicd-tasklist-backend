pipeline {
    agent any

    environment {
        // Configuration de l'utilisateur et de l'image Docker Hub 
        REGISTRY_USER       = 'ndongmo'
        IMAGE_NAME          = 'cicd-tasklist-backend'
        IMAGE_TAG           = "${BUILD_NUMBER}"
        SONAR_PROJECT_KEY   = 'cicd-tasklist-backend'
        
        // Identifiants configurés dans l'interface Jenkins de l'école
        DOCKER_CRED_ID      = 'wilfrid-dockerhub-password'
        SONAR_CRED_ID       = 'wilfrid-sonar-token'
    }

    stages {
        // =====================================================================
        // COMPÉTENCE C16.1 : PROVISIONNEMENT & PRÉPARATION DU WORKSPACE
        // =====================================================================
        stage('1. Installation des dépendances') {
            steps {
                echo 'Installation propre et stricte des dépendances via npm ci...'
                sh 'npm ci'
            }
        }

        stage('2. Génération du client Prisma') {
            steps {
                echo 'Génération du client ORM Prisma...'
                sh 'npx prisma generate'
            }
        }

        // =====================================================================
        // COMPÉTENCE C17.1 & C17.2 : STRATÉGIE DE TESTS AUTOMATISÉS
        // =====================================================================
        stage('3. Exécution des tests unitaires') {
            steps {
                echo 'Exécution de la suite de tests unitaires et génération de la couverture...'
                sh 'npm run test' 
            }
        }

        stage('4. Publication des rapports de tests') {
            steps {
                echo 'Publication graphique du rapport de tests junit dans Jenkins...'
                junit allowEmptyResults: true, testResults: 'reports/junit.xml'
            }
        }

        stage('5. Exécution des tests end-to-end') {
            steps {
                echo 'Lancement d un conteneur éphémère MySQL pour les tests E2E...'
                
                // On utilise 'env -u' pour désactiver DOCKER_CERT_PATH et DOCKER_TLS_VERIFY le temps de lancer le conteneur
                sh 'env -u DOCKER_CERT_PATH -u DOCKER_TLS_VERIFY docker run --name mysql-test -e MYSQL_DATABASE=tasklist_test -e MYSQL_ALLOW_EMPTY_PASSWORD=yes -p 3306:3306 -d mysql:8.0'
                
                // On laisse le temps à MySQL de démarrer
                sh 'sleep 15'
                
                script {
                    try {
                        echo 'Exécution des migrations et des tests E2E sur MySQL...'
                        
                        // Si ton Jenkins local accède à MySQL via localhost :
                        sh 'DATABASE_URL="mysql://root@localhost:3306/tasklist_test" npx prisma db push'
                        sh 'DATABASE_URL="mysql://root@localhost:3306/tasklist_test" npm run test:e2e'
                        
                    } catch (Exception e) {
                        // Si 'localhost' échoue parce que Jenkins tourne lui-même dans un conteneur,
                        // on tente le coup avec l'alias réseau 'docker'
                        echo "Tentative de repli sur l'hôte docker suite à l'échec initial..."
                        sh 'DATABASE_URL="mysql://root@docker:3306/tasklist_test" npx prisma db push'
                        sh 'DATABASE_URL="mysql://root@docker:3306/tasklist_test" npm run test:e2e'
                    } finally {
                        echo 'Nettoyage du conteneur MySQL de test...'
                        // On applique le même nettoyage d'environnement pour détruire le conteneur sans erreur TLS
                        sh 'env -u DOCKER_CERT_PATH -u DOCKER_TLS_VERIFY docker rm -f mysql-test || true'
                    }
                }
            }
        }

    // =====================================================================
    // POST-EXÉCUTION : COLLECTE DES PROUVE, ARCHIVAGE ET NETTOYAGE
    // =====================================================================
    post {
        always {
            echo 'Archivage des rapports de sécurité (Trivy et SBOM)...'
            // Stocke définitivement le rapport Trivy et le JSON SBOM dans l interface du build Jenkins
            archiveArtifacts artifacts: 'trivy-report.txt, sbom.json', allowEmptyArchive: true

            echo 'Nettoyage des images Docker locales pour préserver le stockage de l école...'
            sh "docker rmi ${REGISTRY_USER}/${IMAGE_NAME}:${IMAGE_TAG} || true"
            sh "docker rmi ${REGISTRY_USER}/${IMAGE_NAME}:latest || true"
            
            echo 'Nettoyage complet du dossier de travail (Workspace)...'
            cleanWs()
        }
        success {
            echo 'Félicitations Wilfrid ! Pipeline exécutée avec un succès total.'
        }
        failure {
            echo 'Le build a échoué. Inspectez les logs des étapes ci-dessus.'
        }
    }
}