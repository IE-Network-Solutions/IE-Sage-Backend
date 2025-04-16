pipeline {
    agent any

    stages {
        stage('Git Pull') {
            steps {

                dir('/home/ubuntu/projects/sage-backend') {
                    git branch: 'main', credentialsId: 'gitHub-Credentials', url: 'https://github.com/IE-Network-Solutions/IE-Sage-Backend.git'

                }
            }
        }

        stage('Install Dependencies') {
            steps {

                dir('/home/ubuntu/projects/sage-backend') {

                    script {
                        def nodejsHome = tool 'Node-20.10'
                        def npmHome = "${nodejsHome}/bin"
                        env.PATH = "${npmHome}:${env.PATH}"
                        sh 'npm install -f'
                      
                    }
                }
            }
        }
        stage('Run Nodejs') {
            steps {

                dir('/home/ubuntu/projects/sage-backend') {
                    sh 'sudo pm2 delete sage-app || true'

                    sh 'sudo npm run start'
                }
            }
        }

        stage('Finalize') {
            steps {
                echo 'Deployment Completed'
            }
        }
    }
}