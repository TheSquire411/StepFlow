#!/bin/bash

set -e

# StepFlow Infrastructure Setup Script
# This script sets up the complete AWS infrastructure for StepFlow platform

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
CLUSTER_NAME="stepflow-production"
NODE_GROUP_NAME="stepflow-nodes"
VPC_NAME="stepflow-vpc"
S3_BUCKET_MEDIA="stepflow-media-files"
S3_BUCKET_BACKUPS="stepflow-backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check eksctl
    if ! command -v eksctl &> /dev/null; then
        log_error "eksctl is not installed"
        exit 1
    fi
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create S3 buckets
create_s3_buckets() {
    log_info "Creating S3 buckets..."
    
    # Media files bucket
    if ! aws s3 ls "s3://$S3_BUCKET_MEDIA" &> /dev/null; then
        aws s3 mb "s3://$S3_BUCKET_MEDIA" --region $AWS_REGION
        
        # Configure bucket for media files
        aws s3api put-bucket-versioning \
            --bucket $S3_BUCKET_MEDIA \
            --versioning-configuration Status=Enabled
        
        aws s3api put-bucket-encryption \
            --bucket $S3_BUCKET_MEDIA \
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }]
            }'
        
        # Configure CORS for media bucket
        aws s3api put-bucket-cors \
            --bucket $S3_BUCKET_MEDIA \
            --cors-configuration '{
                "CORSRules": [{
                    "AllowedHeaders": ["*"],
                    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
                    "AllowedOrigins": ["https://stepflow.com", "https://*.stepflow.com"],
                    "MaxAgeSeconds": 3000
                }]
            }'
        
        log_success "Media bucket created: $S3_BUCKET_MEDIA"
    else
        log_info "Media bucket already exists: $S3_BUCKET_MEDIA"
    fi
    
    # Backups bucket
    if ! aws s3 ls "s3://$S3_BUCKET_BACKUPS" &> /dev/null; then
        aws s3 mb "s3://$S3_BUCKET_BACKUPS" --region $AWS_REGION
        
        # Configure bucket for backups
        aws s3api put-bucket-versioning \
            --bucket $S3_BUCKET_BACKUPS \
            --versioning-configuration Status=Enabled
        
        aws s3api put-bucket-encryption \
            --bucket $S3_BUCKET_BACKUPS \
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }]
            }'
        
        # Configure lifecycle policy for backups
        aws s3api put-bucket-lifecycle-configuration \
            --bucket $S3_BUCKET_BACKUPS \
            --lifecycle-configuration '{
                "Rules": [{
                    "ID": "BackupRetention",
                    "Status": "Enabled",
                    "Filter": {"Prefix": ""},
                    "Transitions": [{
                        "Days": 30,
                        "StorageClass": "STANDARD_IA"
                    }, {
                        "Days": 90,
                        "StorageClass": "GLACIER"
                    }, {
                        "Days": 365,
                        "StorageClass": "DEEP_ARCHIVE"
                    }]
                }]
            }'
        
        log_success "Backup bucket created: $S3_BUCKET_BACKUPS"
    else
        log_info "Backup bucket already exists: $S3_BUCKET_BACKUPS"
    fi
}

# Create EKS cluster
create_eks_cluster() {
    log_info "Creating EKS cluster..."
    
    if ! eksctl get cluster --name $CLUSTER_NAME --region $AWS_REGION &> /dev/null; then
        # Create cluster configuration
        cat > cluster-config.yaml << EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: $CLUSTER_NAME
  region: $AWS_REGION
  version: "1.28"

vpc:
  enableDnsHostnames: true
  enableDnsSupport: true

iam:
  withOIDC: true

addons:
- name: vpc-cni
  version: latest
- name: coredns
  version: latest
- name: kube-proxy
  version: latest
- name: aws-ebs-csi-driver
  version: latest

nodeGroups:
- name: $NODE_GROUP_NAME
  instanceType: t3.medium
  desiredCapacity: 3
  minSize: 2
  maxSize: 10
  volumeSize: 50
  volumeType: gp3
  amiFamily: AmazonLinux2
  iam:
    attachPolicyARNs:
    - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
    - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
    - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
    - arn:aws:iam::aws:policy/AmazonEBSCSIDriverPolicy
  ssh:
    enableSsm: true
  tags:
    Environment: production
    Project: stepflow
  
managedNodeGroups:
- name: stepflow-managed-nodes
  instanceTypes: ["t3.medium", "t3.large"]
  minSize: 2
  maxSize: 8
  desiredCapacity: 3
  volumeSize: 50
  ssh:
    enableSsm: true
  tags:
    Environment: production
    Project: stepflow

cloudWatch:
  clusterLogging:
    enable: ["audit", "authenticator", "controllerManager"]
EOF

        # Create the cluster
        eksctl create cluster -f cluster-config.yaml
        
        # Clean up config file
        rm cluster-config.yaml
        
        log_success "EKS cluster created: $CLUSTER_NAME"
    else
        log_info "EKS cluster already exists: $CLUSTER_NAME"
    fi
    
    # Update kubeconfig
    aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME
}

# Install cluster add-ons
install_addons() {
    log_info "Installing cluster add-ons..."
    
    # Install AWS Load Balancer Controller
    log_info "Installing AWS Load Balancer Controller..."
    
    # Create IAM role for AWS Load Balancer Controller
    eksctl create iamserviceaccount \
        --cluster=$CLUSTER_NAME \
        --namespace=kube-system \
        --name=aws-load-balancer-controller \
        --role-name "AmazonEKSLoadBalancerControllerRole" \
        --attach-policy-arn=arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess \
        --approve \
        --region=$AWS_REGION || true
    
    # Install AWS Load Balancer Controller using Helm
    helm repo add eks https://aws.github.io/eks-charts || true
    helm repo update
    
    helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName=$CLUSTER_NAME \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller \
        --set region=$AWS_REGION \
        --set vpcId=$(aws eks describe-cluster --name $CLUSTER_NAME --query "cluster.resourcesVpcConfig.vpcId" --output text --region $AWS_REGION)
    
    # Install NGINX Ingress Controller
    log_info "Installing NGINX Ingress Controller..."
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx || true
    helm repo update
    
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --set controller.service.type=LoadBalancer \
        --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"="nlb"
    
    # Install cert-manager for SSL certificates
    log_info "Installing cert-manager..."
    helm repo add jetstack https://charts.jetstack.io || true
    helm repo update
    
    helm upgrade --install cert-manager jetstack/cert-manager \
        --namespace cert-manager \
        --create-namespace \
        --set installCRDs=true
    
    # Install Cluster Autoscaler
    log_info "Installing Cluster Autoscaler..."
    
    # Create IAM role for Cluster Autoscaler
    eksctl create iamserviceaccount \
        --cluster=$CLUSTER_NAME \
        --namespace=kube-system \
        --name=cluster-autoscaler \
        --attach-policy-arn=arn:aws:iam::aws:policy/AutoScalingFullAccess \
        --approve \
        --region=$AWS_REGION || true
    
    # Deploy Cluster Autoscaler
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml
    
    # Patch the deployment
    kubectl patch deployment cluster-autoscaler \
        -n kube-system \
        -p '{"spec":{"template":{"metadata":{"annotations":{"cluster-autoscaler.kubernetes.io/safe-to-evict":"false"}}}}}'
    
    kubectl patch deployment cluster-autoscaler \
        -n kube-system \
        -p '{"spec":{"template":{"spec":{"containers":[{"name":"cluster-autoscaler","command":["./cluster-autoscaler","--v=4","--stderrthreshold=info","--cloud-provider=aws","--skip-nodes-with-local-storage=false","--expander=least-waste","--node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/'$CLUSTER_NAME'"]}]}}}}'
    
    log_success "Cluster add-ons installed"
}

# Create IAM roles and policies
create_iam_resources() {
    log_info "Creating IAM resources..."
    
    # Create policy for S3 access
    cat > stepflow-s3-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::$S3_BUCKET_MEDIA",
                "arn:aws:s3:::$S3_BUCKET_MEDIA/*",
                "arn:aws:s3:::$S3_BUCKET_BACKUPS",
                "arn:aws:s3:::$S3_BUCKET_BACKUPS/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "ec2:CreateSnapshot",
                "ec2:DeleteSnapshot",
                "ec2:DescribeSnapshots",
                "ec2:CreateTags"
            ],
            "Resource": "*"
        }
    ]
}
EOF
    
    # Create IAM policy
    aws iam create-policy \
        --policy-name StepFlowS3Policy \
        --policy-document file://stepflow-s3-policy.json || true
    
    # Create service account with IAM role
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    eksctl create iamserviceaccount \
        --cluster=$CLUSTER_NAME \
        --namespace=stepflow \
        --name=stepflow-service-account \
        --attach-policy-arn=arn:aws:iam::$ACCOUNT_ID:policy/StepFlowS3Policy \
        --approve \
        --region=$AWS_REGION || true
    
    # Clean up policy file
    rm stepflow-s3-policy.json
    
    log_success "IAM resources created"
}

# Setup monitoring and logging
setup_monitoring() {
    log_info "Setting up monitoring and logging..."
    
    # Install Prometheus Operator
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts || true
    helm repo update
    
    helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --create-namespace \
        --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
        --set grafana.persistence.enabled=true \
        --set grafana.persistence.size=10Gi
    
    # Install Fluent Bit for log aggregation
    helm repo add fluent https://fluent.github.io/helm-charts || true
    helm repo update
    
    helm upgrade --install fluent-bit fluent/fluent-bit \
        --namespace logging \
        --create-namespace \
        --set config.outputs="[OUTPUT]\n    Name cloudwatch_logs\n    Match *\n    region $AWS_REGION\n    log_group_name /aws/eks/$CLUSTER_NAME\n    log_stream_prefix fluent-bit-\n    auto_create_group true"
    
    log_success "Monitoring and logging setup completed"
}

# Create RDS instance for production database
create_rds_instance() {
    log_info "Creating RDS instance..."
    
    # Get VPC ID from EKS cluster
    VPC_ID=$(aws eks describe-cluster --name $CLUSTER_NAME --query "cluster.resourcesVpcConfig.vpcId" --output text --region $AWS_REGION)
    
    # Create DB subnet group
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:kubernetes.io/role/internal-elb,Values=1" --query "Subnets[].SubnetId" --output text --region $AWS_REGION)
    
    aws rds create-db-subnet-group \
        --db-subnet-group-name stepflow-db-subnet-group \
        --db-subnet-group-description "Subnet group for StepFlow RDS" \
        --subnet-ids $SUBNET_IDS \
        --region $AWS_REGION || true
    
    # Create security group for RDS
    SG_ID=$(aws ec2 create-security-group \
        --group-name stepflow-rds-sg \
        --description "Security group for StepFlow RDS" \
        --vpc-id $VPC_ID \
        --query 'GroupId' \
        --output text \
        --region $AWS_REGION) || true
    
    # Allow access from EKS nodes
    NODE_SG_ID=$(aws eks describe-cluster --name $CLUSTER_NAME --query "cluster.resourcesVpcConfig.clusterSecurityGroupId" --output text --region $AWS_REGION)
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 5432 \
        --source-group $NODE_SG_ID \
        --region $AWS_REGION || true
    
    # Create RDS instance
    aws rds create-db-instance \
        --db-instance-identifier stepflow-production \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version 15.4 \
        --master-username stepflow \
        --master-user-password $(openssl rand -base64 32) \
        --allocated-storage 20 \
        --storage-type gp2 \
        --storage-encrypted \
        --vpc-security-group-ids $SG_ID \
        --db-subnet-group-name stepflow-db-subnet-group \
        --backup-retention-period 7 \
        --multi-az \
        --region $AWS_REGION || true
    
    log_success "RDS instance creation initiated"
}

# Main function
main() {
    log_info "Starting StepFlow infrastructure setup..."
    
    check_prerequisites
    create_s3_buckets
    create_eks_cluster
    install_addons
    create_iam_resources
    setup_monitoring
    create_rds_instance
    
    log_success "StepFlow infrastructure setup completed!"
    
    echo -e "\n${GREEN}Infrastructure Summary:${NC}"
    echo "EKS Cluster: $CLUSTER_NAME"
    echo "Region: $AWS_REGION"
    echo "Media Bucket: $S3_BUCKET_MEDIA"
    echo "Backup Bucket: $S3_BUCKET_BACKUPS"
    echo "RDS Instance: stepflow-production"
    echo ""
    echo "Next steps:"
    echo "1. Update DNS records to point to the load balancer"
    echo "2. Configure secrets in Kubernetes"
    echo "3. Deploy the StepFlow application using scripts/deploy.sh"
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0"
        echo "Set up complete AWS infrastructure for StepFlow platform"
        exit 0
        ;;
    *)
        main
        ;;
esac