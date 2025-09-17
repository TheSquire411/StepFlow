#!/bin/bash

set -e

# StepFlow Platform Rollback Script
# This script performs rollback operations for the StepFlow platform

NAMESPACE="stepflow"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Show deployment history
show_history() {
    local service=$1
    log_info "Deployment history for $service:"
    kubectl rollout history deployment/$service -n $NAMESPACE
}

# Rollback to previous version
rollback_service() {
    local service=$1
    local revision=$2
    
    log_info "Rolling back $service..."
    
    if [ -n "$revision" ]; then
        kubectl rollout undo deployment/$service --to-revision=$revision -n $NAMESPACE
    else
        kubectl rollout undo deployment/$service -n $NAMESPACE
    fi
    
    # Wait for rollback to complete
    kubectl rollout status deployment/$service -n $NAMESPACE --timeout=300s
    
    log_success "$service rollback completed"
}

# Rollback all services
rollback_all() {
    local revision=$1
    
    log_warning "Rolling back all services..."
    
    # Rollback in reverse order of dependencies
    rollback_service "ai-processor" "$revision"
    rollback_service "api" "$revision"
    rollback_service "web" "$revision"
    
    log_success "All services rolled back"
}

# Rollback database
rollback_database() {
    local backup_file=$1
    
    if [ -z "$backup_file" ]; then
        log_error "Backup file name is required for database rollback"
        echo "Available backups:"
        aws s3 ls s3://stepflow-backups/postgres-backups/ | tail -10
        exit 1
    fi
    
    log_warning "Rolling back database to backup: $backup_file"
    log_warning "This will stop all services and restore the database"
    
    read -p "Are you sure you want to proceed? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Database rollback cancelled"
        exit 0
    fi
    
    # Create disaster recovery job
    kubectl apply -f "$SCRIPT_DIR/../k8s/backup/disaster-recovery.yaml"
    
    # Wait for job to be ready
    kubectl wait --for=condition=ready pod -l job-name=disaster-recovery-job -n $NAMESPACE --timeout=60s
    
    # Execute restore script
    DR_POD=$(kubectl get pods -n $NAMESPACE -l job-name=disaster-recovery-job -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n $NAMESPACE $DR_POD -- /scripts/restore-postgres.sh $backup_file
    
    log_success "Database rollback completed"
}

# Emergency rollback
emergency_rollback() {
    log_error "EMERGENCY ROLLBACK INITIATED"
    
    # Scale down all services immediately
    log_info "Scaling down all services..."
    kubectl scale deployment api --replicas=0 -n $NAMESPACE
    kubectl scale deployment web --replicas=0 -n $NAMESPACE
    kubectl scale deployment ai-processor --replicas=0 -n $NAMESPACE
    
    # Wait for pods to terminate
    sleep 30
    
    # Rollback to previous versions
    log_info "Rolling back to previous versions..."
    rollback_all
    
    # Verify rollback
    verify_rollback
    
    log_success "Emergency rollback completed"
}

# Verify rollback
verify_rollback() {
    log_info "Verifying rollback..."
    
    # Check pod status
    kubectl get pods -n $NAMESPACE
    
    # Wait for services to be ready
    kubectl wait --for=condition=ready pod -l app=api -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=web -n $NAMESPACE --timeout=300s
    kubectl wait --for=condition=ready pod -l app=ai-processor -n $NAMESPACE --timeout=300s
    
    # Run health checks
    sleep 30
    API_POD=$(kubectl get pods -n $NAMESPACE -l app=api -o jsonpath='{.items[0].metadata.name}')
    if kubectl exec -n $NAMESPACE $API_POD -- wget -qO- http://localhost:3000/health | grep -q "healthy"; then
        log_success "API health check passed after rollback"
    else
        log_error "API health check failed after rollback"
    fi
    
    log_success "Rollback verification completed"
}

# Show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  history [service]           Show deployment history for service (api, web, ai-processor)"
    echo "  service [service] [rev]     Rollback specific service to revision (optional)"
    echo "  all [revision]              Rollback all services to revision (optional)"
    echo "  database [backup-file]      Rollback database to specific backup"
    echo "  emergency                   Emergency rollback - immediate rollback of all services"
    echo "  verify                      Verify current deployment status"
    echo ""
    echo "Examples:"
    echo "  $0 history api"
    echo "  $0 service api 3"
    echo "  $0 all"
    echo "  $0 database stepflow-backup-20231201-020000.sql.gz"
    echo "  $0 emergency"
}

# Main function
main() {
    case "$1" in
        history)
            if [ -z "$2" ]; then
                show_history "api"
                show_history "web"
                show_history "ai-processor"
            else
                show_history "$2"
            fi
            ;;
        service)
            if [ -z "$2" ]; then
                log_error "Service name is required"
                show_usage
                exit 1
            fi
            rollback_service "$2" "$3"
            verify_rollback
            ;;
        all)
            rollback_all "$2"
            verify_rollback
            ;;
        database)
            rollback_database "$2"
            ;;
        emergency)
            emergency_rollback
            ;;
        verify)
            verify_rollback
            ;;
        --help|-h)
            show_usage
            ;;
        *)
            log_error "Invalid command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if we can connect to the cluster
if ! kubectl cluster-info &> /dev/null; then
    log_error "Cannot connect to Kubernetes cluster"
    exit 1
fi

# Run main function with all arguments
main "$@"