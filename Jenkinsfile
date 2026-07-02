pipeline {
    agent any

    environment {
        DOCKER_CREDENTIALS_ID = 'wilfrid-dockerhub-password'
        SONAR_HOST_URL = 'https://sonarqube.cicd.kits.ext.educentre.fr'
        SONAR_PROJECT_KEY = 'wilfrid-cicd-tasklist-backend'
        DOCKER_USERNAME = 'ndongmo'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Generate Prisma client') {
            steps {
                sh 'npm run prisma:generate'
            }
        }

        stage('Run tests') {
            steps {
                sh 'npm run test:all:coverage'
            }
            post {
                always {
                    junit 'reports/junit.xml'
                }
            }
        }

        stage('SonarQube analysis') {
            steps {
                withSonarQubeEnv('sonar-wilfrid') {
                    withCredentials([
                        string(credentialsId: 'wilfrid-sonar-token-backend', variable: 'SONAR_TOKEN')
                    ]) {
                        sh '''
                            npx --yes sonar-scanner \
                              -Dsonar.projectKey=$SONAR_PROJECT_KEY \
                              -Dsonar.sources=src \
                              -Dsonar.test.inclusions=**/*.test.ts \
                              -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                              -Dsonar.sourceEncoding=UTF-8 \
                              -Dsonar.host.url=$SONAR_HOST_URL \
                              -Dsonar.token=$SONAR_TOKEN
                        '''
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build Docker image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: DOCKER_CREDENTIALS_ID,
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )]) {
                    sh '''
                        docker build \
                          -t ${DOCKER_USERNAME}/cicd-tasklist-backend:${BUILD_NUMBER} \
                          -t ${DOCKER_USERNAME}/cicd-tasklist-backend:latest \
                          .
                    '''
                }
            }
        }

        stage('Trivy scan') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: DOCKER_CREDENTIALS_ID,
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )]) {
                    // Remplacement de 'ndongmo' en dur par la variable dynamique
                    sh '''
                        trivy image \
                          --format json \
                          --output trivy-report.json \
                          --severity HIGH,CRITICAL \
                          ${DOCKER_USERNAME}/cicd-tasklist-backend:${BUILD_NUMBER} || true

                        trivy image \
                          --format table \
                          --severity HIGH,CRITICAL \
                          ${DOCKER_USERNAME}/cicd-tasklist-backend:${BUILD_NUMBER} || true
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                }
            }
        }

        stage('Check Trivy vulnerabilities') {
            steps {
                sh '''
                    CRITICAL_COUNT=$(grep -o '"Severity":"CRITICAL"' trivy-report.json | wc -l || echo 0)
                    HIGH_COUNT=$(grep -o '"Severity":"HIGH"' trivy-report.json | wc -l || echo 0)
                    echo "Found ${CRITICAL_COUNT} CRITICAL and ${HIGH_COUNT} HIGH vulnerabilities"
                    if [ ${CRITICAL_COUNT} -gt 0 ] || [ ${HIGH_COUNT} -gt 0 ]; then
                        echo "Blocking pipeline due to HIGH or CRITICAL vulnerabilities!"
                        exit 1
                    fi
                '''
            }
        }

        stage('Generate SBOM') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: DOCKER_CREDENTIALS_ID,
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )]) {
                    sh '''
                        trivy image \
                          --format spdx-json \
                          --output sbom.spdx.json \
                          ${DOCKER_USERNAME}/cicd-tasklist-backend:${BUILD_NUMBER}
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'sbom.spdx.json', allowEmptyArchive: true
                }
            }
        }

        stage('Push Docker image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: DOCKER_CREDENTIALS_ID,
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )]) {
                    sh '''
                        echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin
                        docker push ${DOCKER_USERNAME}/cicd-tasklist-backend:${BUILD_NUMBER}
                        docker push ${DOCKER_USERNAME}/cicd-tasklist-backend:latest
                        docker logout
                    '''
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}