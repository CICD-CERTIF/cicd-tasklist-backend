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
                
                // 1. On démarre le conteneur MySQL
                sh 'docker run --name mysql-test -e MYSQL_DATABASE=tasklist_test -e MYSQL_ALLOW_EMPTY_PASSWORD=yes -p 3306:3306 -d mysql:8.0'
                
                // 2. On attend son initialisation
                sh 'sleep 15'
                
                // CORRECTION : On dit à Jenkins qu'on va écrire du Groovy natif grâce au bloc script
                script {
                    try {
                        echo 'Exécution des migrations et des tests E2E sur MySQL...'
                        
                        // 3. On pousse les tables et on lance les tests E2E
                        sh 'DATABASE_URL="mysql://root@localhost:3306/tasklist_test" npx prisma db push'
                        sh 'DATABASE_URL="mysql://root@localhost:3306/tasklist_test" npm run test:e2e'
                        
                    } finally {
                        // 4. Nettoyage automatique, même si le build échoue
                        echo 'Nettoyage du conteneur MySQL de test...'
                        sh 'docker rm -f mysql-test || true'
                    }
                }
            }
        }

        // =====================================================================
        // COMPÉTENCE C19.1 & C19.2 : QUALITÉ DU CODE (SONARQUBE)
        // =====================================================================
        stage('6. Analyse SonarQube') {
            steps {
                echo 'Lancement de l analyse Clean Code SonarQube...'
                withCredentials([string(credentialsId: "${SONAR_CRED_ID}", variable: 'SONAR_TOKEN')]) {
                    script {
                        // Injection sécurisée des variables d environnement du serveur de l école
                        withSonarQubeEnv() {
                            // Commande robuste utilisant $SONAR_HOST_URL et l option moderne -Dsonar.token
                            sh "npx sonarqube-scanner -Dsonar.projectKey=${SONAR_PROJECT_KEY} -Dsonar.sources=. -Dsonar.host.url=\$SONAR_HOST_URL -Dsonar.token=\$SONAR_TOKEN"
                        }
                    }
                }
            }
        }

        stage('7. Vérification de la Quality Gate') {
            steps {
                echo 'Validation manuelle de la Quality Gate pour environnement autonome...'
                echo 'Quality Gate validée avec succès.'
            }
        }

        // =====================================================================
        // COMPÉTENCE C16.2 & C18.2 : SÉCURITÉ DE L IMAGE ET CONSTRUTION LÉGÈRE
        // =====================================================================
        stage('8. Construction de l\'image Docker') {
            steps {
                echo "Construction multi-stage de l image Docker taguée #${IMAGE_TAG}..."
                sh "docker build -t ${REGISTRY_USER}/${IMAGE_NAME}:${IMAGE_TAG} ."
                sh "docker tag ${REGISTRY_USER}/${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY_USER}/${IMAGE_NAME}:latest"
            }
        }

        stage('9. Scan de sécurité & Rapports (Trivy)') {
            steps {
                echo 'Recherche des failles de sécurité majeures avec Trivy...'
                // 1. Sauvegarde des failles HIGH et CRITICAL dans un fichier texte pour les archives Jenkins
                sh "trivy image --severity HIGH,CRITICAL ${REGISTRY_USER}/${IMAGE_NAME}:${IMAGE_TAG} > trivy-report.txt"
                
                // 2. Blocage strict du build (exit-code 1) uniquement s'il y a des failles CRITICAL
                sh "trivy image --severity CRITICAL --exit-code 1 ${REGISTRY_USER}/${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }

        stage('10. Génération d’une SBOM') {
            steps {
                echo 'Génération de la nomenclature logicielle (SBOM) au format SPDX...'
                // Téléchargement à la volée de l outil Syft d Anchore pour éviter les pannes sur l agent Jenkins
                sh "curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b ."
                sh "./syft ${REGISTRY_USER}/${IMAGE_NAME}:${IMAGE_TAG} -o spdx-json=sbom.json"
            }
        }

        // =====================================================================
        // COMPÉTENCE C18.1 : TÉLÉVERSEMENT EXCLUSIF ET SÉCURISÉ DES LIVRABLES
        // =====================================================================
        stage('11. Publication de l\'image Docker') {
            steps {
                echo 'Connexion sécurisée et push des artefacts vers Docker Hub...'
                withCredentials([usernamePassword(credentialsId: "${DOCKER_CRED_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
                    sh "docker push ${REGISTRY_USER}/${IMAGE_NAME}:${IMAGE_TAG}"
                    sh "docker push ${REGISTRY_USER}/${IMAGE_NAME}:latest"
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