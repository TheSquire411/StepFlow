#!/bin/bash

set -e

# StepFlow Platform Deployment Script
# This script deploys the complete StepFlow platform to Kubernetes

ENVIRONMENT=${1:-staging}
NAMESPACE="stepflow"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed or not in PATH"
        exit 1
    fi
    
    # Check if we can connect to the cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create namespace if it doesn't exist
create_namespace() {
    log_info "Creating namespace: $NAMESPACE"
    kubectl apply -f "$PROJECT_ROOT/k8s/namespace.yaml"
    log_success "Namespace created/updated"
}

# Deploy secrets and config maps
deploy_config() {
    log_info "Deploying configuration..."
    
    # Check if secrets exist
    if ! kubectl get secret stepflow-secrets -n $NAMESPACE &> /dev/null; then
        log_warning "Secrets not found. Please ensure secrets are properly configured."
        log_info "You can update secrets using: kubectl apply -f k8s/secrets.yaml"
    fi
    
    kubectl apply -f "$PROJECT_ROOT/k8s/configmap.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/secrets.yaml"
    
    log_success "Configuration deployed"
}

# Deploy storage components
deploy_storage() {
    log_info "Deploying storage components..."
    
    kubectl apply -f "$PROJECT_ROOT/k8s/postgres.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/redis.yaml"
    
    # Wait for storage to be ready
    log_info "Waiting for storage components to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
    
    log_success "Storage components deployed and ready"
}

# Deploy application services
deploy_applications() {
    log_info "Deploying application services..."
    
    kubectl apply -f "$PROJECT_ROOT/k8s/api.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/web.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/ai-processor.yaml"
    
    # Wait for applications to be ready
    log_info "Waiting for application services to be ready..."
    kubectl wait --for=condition=ready pod -l app=api -n $NAMESPACE --timeout=600s
    kubectl wait --for=condition=ready pod -l app=web -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=ai-processor -n $NAMESPACE --timeout=600s
    
    log_success "Application services deployed and ready"
}

# Deploy networking
deploy_networking() {
    log_info "Deploying networking components..."
    
    kubectl apply -f "$PROJECT_ROOT/k8s/ingress.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/security/network-policies.yaml"
    
    log_success "Networking components deployed"
}

# Deploy monitoring stack
deploy_monitoring() {
    log_info "Deploying monitoring stack..."
    
    kubectl apply -f "$PROJECT_ROOT/k8s/monitoring/prometheus.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/monitoring/grafana.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/monitoring/alertmanager.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/monitoring/exporters.yaml"
    
    # Wait for monitoring components
    log_info "Waiting for monitoring components to be ready..."
    kubectl wait --for=condition=ready pod -l app=prometheus -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=grafana -n $NAMESPACE --timeout=300s
    
    log_success "Monitoring stack deployed"
}

# Deploy backup infrastructure
deploy_backup() {
    log_info "Deploying backup infrastructure..."
    
    kubectl apply -f "$PROJECT_ROOT/k8s/backup/backup-cronjob.yaml"
    kubectl apply -f "$PROJECT_ROOT/k8s/backup/disaster-recovery.yaml"
    
    log_success "Backup infrastructure deployed"
}

# Deploy security policies
deploy_security() {
    log_info "Deploying security policies..."
    
    kubectl apply -f "$PROJECT_ROOT/k8s/security/pod-security-policies.yaml"
    
    log_success "Security policies deployed"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check pod status
    echo "Pod Status:"
    kubectl get pods -n $NAMESPACE
    
    # Check service status
    echo -e "\nService Status:"
    kubectl get services -n $NAMESPACE
    
    # Check ingress status
    echo -e "\nIngress Status:"
    kubectl get ingress -n $NAMESPACE
    
    # Run health checks
    log_info "Running health checks..."
    
    # Wait a bit for services to stabilize
    sleep 30
    
    # Check API health
    API_POD=$(kubectl get pods -n $NAMESPACE -l app=api -o jsonpath='{.items[0].metadata.name}')
    if kubectl exec -n $NAMESPACE $API_POD -- wget -qO- http://localhost:3000/health | grep -q "healthy"; then
        log_success "API health check passed"
    else
        log_warning "API health check failed"
    fi
    
    # Check if all deployments are ready
    if kubectl get deployments -n $NAMESPACE -o jsonpath='{.items[*].status.readyReplicas}' | grep -q "0"; then
        log_warning "Some deployments are not ready"
    else
        log_success "All deployments are ready"
    fi
}

# Main deployment function
main() {
    log_info "Starting StepFlow platform deployment to $ENVIRONMENT environment"
    
    check_prerequisites
    create_namespace
    deploy_config
    deploy_security
    deploy_storage
    deploy_applications
    deploy_networking
    deploy_monitoring
    deploy_backup
    verify_deployment
    
    log_success "StepFlow platform deployment completed successfully!"
    
    echo -e "\n${GREEN}Deployment Summary:${NC}"
    echo "Environment: $ENVIRONMENT"
    echo "Namespace: $NAMESPACE"
    echo "Services deployed: API, Web, AI Processor, PostgreSQL, Redis"
    echo "Monitoring: Prometheus, Grafana, AlertManager"
    echo "Backup: Automated daily backups configured"
    echo "Security: Network policies and pod security policies applied"
    
    echo -e "\n${BLUE}Access Information:${NC}"
    echo "Web Application: https://stepflow.com (after DNS configuration)"
    echo "API: https://api.stepflow.com (after DNS configuration)"
    echo "Grafana: kubectl port-forward svc/grafana-service 3000:3000 -n stepflow"
    echo "Prometheus: kubectl port-forward svc/prometheus-service 9090:9090 -n stepflow"
}

# Handle script arguments
case "$1" in
    staging|production)
        main
        ;;
    --help|-h)
        echo "Usage: $0 [staging|production]"
        echo "Deploy StepFlow platform to specified environment"
        exit 0
        ;;
    *)
        log_error "Invalid environment. Use 'staging' or 'production'"
        echo "Usage: $0 [staging|production]"
        exit 1
        ;;
esac