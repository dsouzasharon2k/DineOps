pipeline {
    agent any

    // Poll SCM every 5 minutes for changes
    triggers {
        pollSCM('H/5 * * * *')
    }

    environment {
        // Docker image names
        BACKEND_IMAGE  = 'dineops-backend'
        FRONTEND_IMAGE = 'dineops-frontend'
        IMAGE_TAG      = "${env.BUILD_NUMBER}"
        KIND_CLUSTER   = 'dineops'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('Backend - Build & Test') {
            steps {
                dir('backend') {
                    echo 'Building backend and running unit tests...'
                    sh './mvnw clean verify -B'
                }
            }
            post {
                always {
                    // Publish JUnit test results
                    junit allowEmptyResults: true,
                          testResults: 'backend/target/surefire-reports/*.xml'
                    // Publish JaCoCo coverage report
                    jacoco(
                        execPattern: 'backend/target/jacoco.exec',
                        classPattern: 'backend/target/classes',
                        sourcePattern: 'backend/src/main/java'
                    )
                }
            }
        }

        stage('Frontend - Build & Test') {
            steps {
                dir('frontend') {
                    echo 'Installing dependencies and running frontend tests...'
                    sh 'npm ci'
                    sh 'npm run test -- --run'
                    sh 'npm run build'
                }
            }
        }

        stage('SonarCloud Analysis') {
            steps {
                dir('backend') {
                    echo 'Running SonarCloud analysis...'
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        sh '''
                            ./mvnw sonar:sonar \
                                -Dsonar.projectKey=dsouzasharon2k_DineOps \
                                -Dsonar.organization=dsouzasharon2k \
                                -Dsonar.host.url=https://sonarcloud.io \
                                -Dsonar.token=$SONAR_TOKEN \
                                -B
                        '''
                    }
                }
            }
        }

        stage('Docker - Build Images') {
            steps {
                echo 'Building Docker images...'
                sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest backend/"
                sh "docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} -t ${FRONTEND_IMAGE}:latest frontend/"
            }
        }

        stage('Kind - Load Images') {
            steps {
                echo 'Loading Docker images into Kind cluster...'
                sh "kind load docker-image ${BACKEND_IMAGE}:latest --name ${KIND_CLUSTER}"
                sh "kind load docker-image ${FRONTEND_IMAGE}:latest --name ${KIND_CLUSTER}"
            }
        }

        stage('Kubernetes - Deploy') {
            steps {
                echo 'Applying Kubernetes manifests...'
                sh 'kubectl apply -f k8s/'
                echo 'Waiting for rollout to complete...'
                sh 'kubectl rollout status deployment/backend  -n dineops --timeout=120s'
                sh 'kubectl rollout status deployment/frontend -n dineops --timeout=120s'
            }
        }

        stage('Smoke Test') {
            steps {
                echo 'Running post-deploy smoke test...'
                // Port-forward in background, run curl, then kill
                sh '''
                    kubectl port-forward -n dineops svc/backend 8082:8080 &
                    PF_PID=$!
                    sleep 5
                    curl -sf http://localhost:8082/actuator/health | grep '"status":"UP"'
                    kill $PF_PID
                '''
            }
        }

        stage('k6 - Smoke Test') {
            steps {
                echo 'Running k6 smoke test against deployed backend...'
                sh '''
                    kubectl port-forward -n dineops svc/backend 8082:8080 &
                    PF_PID=$!
                    sleep 5
                    K6_BASE_URL=http://localhost:8082 k6 run k6/smoke-test.js
                    kill $PF_PID
                '''
            }
        }

    }

    post {
        success {
            echo "✅ Pipeline passed - Build #${env.BUILD_NUMBER}"
        }
        failure {
            echo "❌ Pipeline failed - Build #${env.BUILD_NUMBER}"
        }
        always {
            // Clean up dangling Docker images to save disk space
            sh 'docker image prune -f || true'
        }
    }
}
