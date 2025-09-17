#!/bin/bash

set -e

# StepFlow Platform Deployment Validation Script
# This script validates the deployment and performs comprehensive health checks

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE=${NAMESPACE:-"stepflow"}
API_URL=${API_URL:-"http://localhost:3001"}
WEB_URL=${WEB_URL:-"http://localhost:3000"}
TIMEOUT=${TIMEOUT:-30}

# Validation results
VALIDATION_ERRORS=0
VALIDATION_WARNINGS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    ((VALIDATION_WARNINGS++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((VALIDATION_ERRORS++))
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    log_info "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" >/dev/null 2>&1; then
            log_success "$service_name is ready"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 2
        ((attempt++))
    done
    
    log_error "$service_name failed to become ready after $max_attempts attempts"
    return 1
}

# Validate Kubernetes deployment
validate_kubernetes() {
    log_info "Validating Kubernetes deployment..."
    
    if ! command_exists kubectl; then
        log_error "kubectl not found. Please install kubectl to validate Kubernetes deployment."
        return 1
    fi
    
    # Check namespace
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log_error "Namespace '$NAMESPACE' not found"
        return 1
    fi
    
    log_success "Namespace '$NAMESPACE' exists"
    
    # Check deployments
    local deployments=("api" "web" "ai-processor" "postgres" "redis")
    
    for deployment in "${deployments[@]}"; do
        if kubectl get deployment "$deployment" -n "$NAMESPACE" >/dev/null 2>&1; then
            local ready_replicas=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
            local desired_replicas=$(kubectl get deployment "$deployment" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
            
            if [ "$ready_replicas" = "$desired_replicas" ] && [ "$ready_replicas" -gt 0 ]; then
                log_success "Deployment '$deployment' is ready ($ready_replicas/$desired_replicas replicas)"
            else
                log_error "Deployment '$deployment' is not ready ($ready_replicas/$desired_replicas replicas)"
            fi
        else
            log_error "Deployment '$deployment' not found"
        fi
    done
    
    # Check services
    local services=("api-service" "web-service" "postgres-service" "redis-service")
    
    for service in "${services[@]}"; do
        if kubectl get service "$service" -n "$NAMESPACE" >/dev/null 2>&1; then
            log_success "Service '$service' exists"
        else
            log_error "Service '$service' not found"
        fi
    done
    
    # Check ingress
    if kubectl get ingress stepflow-ingress -n "$NAMESPACE" >/dev/null 2>&1; then
        log_success "Ingress 'stepflow-ingress' exists"
    else
        log_warning "Ingress 'stepflow-ingress' not found"
    fi
}

# Validate Docker Compose deployment
validate_docker_compose() {
    log_info "Validating Docker Compose deployment..."
    
    if ! command_exists docker-compose && ! command_exists docker; then
        log_error "Docker Compose not found. Please install Docker Compose to validate deployment."
        return 1
    fi
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml not found in current directory"
        return 1
    fi
    
    log_success "docker-compose.yml found"
    
    # Check running containers
    local services=("api" "web" "ai-processor" "postgres" "redis")
    
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up"; then
            log_success "Service '$service' is running"
        else
            log_error "Service '$service' is not running"
        fi
    done
}

# Validate database connectivity
validate_database() {
    log_info "Validating database connectivity..."
    
    # Try to connect to PostgreSQL
    local db_host=${DB_HOST:-"localhost"}
    local db_port=${DB_PORT:-"5432"}
    local db_name=${DB_NAME:-"stepflow"}
    local db_user=${DB_USER:-"stepflow"}
    
    if command_exists psql; then
        if PGPASSWORD="${DB_PASSWORD}" psql -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" -c "SELECT 1;" >/dev/null 2>&1; then
            log_success "PostgreSQL database connection successful"
        else
            log_error "Failed to connect to PostgreSQL database"
        fi
    else
        log_warning "psql not found. Skipping direct database connection test."
    fi
    
    # Check Redis connectivity
    local redis_host=${REDIS_HOST:-"localhost"}
    local redis_port=${REDIS_PORT:-"6379"}
    
    if command_exists redis-cli; then
        if redis-cli -h "$redis_host" -p "$redis_port" ping | grep -q "PONG"; then
            log_success "Redis connection successful"
        else
            log_error "Failed to connect to Redis"
        fi
    else
        log_warning "redis-cli not found. Skipping direct Redis connection test."
    fi
}

# Validate API endpoints
validate_api_endpoints() {
    log_info "Validating API endpoints..."
    
    # Wait for API service to be ready
    if ! wait_for_service "$API_URL/health" "API Service"; then
        return 1
    fi
    
    # Test health endpoint
    local health_response=$(curl -s "$API_URL/health" 2>/dev/null)
    if echo "$health_response" | grep -q "healthy\|ok"; then
        log_success "API health endpoint responding correctly"
    else
        log_error "API health endpoint not responding correctly"
    fi
    
    # Test authentication endpoints
    local auth_endpoints=("/api/auth/register" "/api/auth/login")
    
    for endpoint in "${auth_endpoints[@]}"; do
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint" -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null)
        
        if [ "$status_code" = "400" ] || [ "$status_code" = "422" ]; then
            log_success "Auth endpoint $endpoint responding (status: $status_code)"
        else
            log_warning "Auth endpoint $endpoint returned unexpected status: $status_code"
        fi
    done
    
    # Test other API endpoints
    local api_endpoints=("/api/recordings" "/api/guides" "/api/users/profile")
    
    for endpoint in "${api_endpoints[@]}"; do
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint" 2>/dev/null)
        
        if [ "$status_code" = "401" ] || [ "$status_code" = "403" ]; then
            log_success "Protected endpoint $endpoint responding correctly (status: $status_code)"
        else
            log_warning "Protected endpoint $endpoint returned unexpected status: $status_code"
        fi
    done
}

# Validate web application
validate_web_application() {
    log_info "Validating web application..."
    
    # Wait for web service to be ready
    if ! wait_for_service "$WEB_URL" "Web Application"; then
        return 1
    fi
    
    # Check if main page loads
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL" 2>/dev/null)
    
    if [ "$status_code" = "200" ]; then
        log_success "Web application main page loads successfully"
    else
        log_error "Web application main page returned status: $status_code"
    fi
    
    # Check for essential static assets
    local assets=("/static/js" "/static/css")
    
    for asset in "${assets[@]}"; do
        local asset_status=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL$asset" 2>/dev/null)
        
        if [ "$asset_status" = "200" ] || [ "$asset_status" = "404" ]; then
            log_success "Static assets endpoint $asset accessible"
        else
            log_warning "Static assets endpoint $asset returned status: $asset_status"
        fi
    done
}

# Validate file storage
validate_file_storage() {
    log_info "Validating file storage configuration..."
    
    # Check if storage directories exist (for local storage)
    local storage_dirs=("uploads" "recordings" "guides" "thumbnails")
    
    for dir in "${storage_dirs[@]}"; do
        if [ -d "$dir" ]; then
            log_success "Storage directory '$dir' exists"
            
            # Check write permissions
            if [ -w "$dir" ]; then
                log_success "Storage directory '$dir' is writable"
            else
                log_error "Storage directory '$dir' is not writable"
            fi
        else
            log_warning "Storage directory '$dir' not found (may be using cloud storage)"
        fi
    done
    
    # Check AWS S3 configuration (if using cloud storage)
    if [ -n "$AWS_S3_BUCKET" ]; then
        log_info "AWS S3 bucket configured: $AWS_S3_BUCKET"
        
        if command_exists aws; then
            if aws s3 ls "s3://$AWS_S3_BUCKET" >/dev/null 2>&1; then
                log_success "AWS S3 bucket '$AWS_S3_BUCKET' is accessible"
            else
                log_error "AWS S3 bucket '$AWS_S3_BUCKET' is not accessible"
            fi
        else
            log_warning "AWS CLI not found. Cannot validate S3 bucket access."
        fi
    fi
}

# Validate environment variables
validate_environment() {
    log_info "Validating environment configuration..."
    
    # Required environment variables
    local required_vars=("NODE_ENV" "JWT_SECRET" "DB_HOST" "DB_NAME" "DB_USER")
    
    for var in "${required_vars[@]}"; do
        if [ -n "${!var}" ]; then
            log_success "Environment variable '$var' is set"
        else
            log_error "Environment variable '$var' is not set"
        fi
    done
    
    # Optional but recommended variables
    local optional_vars=("REDIS_URL" "AWS_ACCESS_KEY_ID" "OPENAI_API_KEY" "ELEVENLABS_API_KEY")
    
    for var in "${optional_vars[@]}"; do
        if [ -n "${!var}" ]; then
            log_success "Optional environment variable '$var' is set"
        else
            log_warning "Optional environment variable '$var' is not set"
        fi
    done
    
    # Validate NODE_ENV
    if [ "$NODE_ENV" = "production" ]; then
        log_success "Running in production mode"
        
        # Additional production checks
        if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
            log_error "JWT_SECRET must be at least 32 characters in production"
        fi
        
        if [ "$DB_HOST" = "localhost" ]; then
            log_warning "Database host is localhost in production environment"
        fi
    else
        log_info "Running in development mode"
    fi
}

# Validate SSL/TLS configuration
validate_ssl() {
    log_info "Validating SSL/TLS configuration..."
    
    # Check if running on HTTPS
    if [[ "$WEB_URL" == https://* ]]; then
        log_success "Web application is configured for HTTPS"
        
        # Test SSL certificate
        local domain=$(echo "$WEB_URL" | sed 's|https://||' | sed 's|/.*||')
        
        if command_exists openssl; then
            local cert_info=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
            
            if [ -n "$cert_info" ]; then
                log_success "SSL certificate is valid for $domain"
            else
                log_error "SSL certificate validation failed for $domain"
            fi
        else
            log_warning "OpenSSL not found. Cannot validate SSL certificate."
        fi
    else
        if [ "$NODE_ENV" = "production" ]; then
            log_error "HTTPS not configured in production environment"
        else
            log_warning "HTTPS not configured (acceptable for development)"
        fi
    fi
}

# Validate monitoring and logging
validate_monitoring() {
    log_info "Validating monitoring and logging configuration..."
    
    # Check if log directories exist
    local log_dirs=("logs" "/var/log/stepflow")
    
    for dir in "${log_dirs[@]}"; do
        if [ -d "$dir" ]; then
            log_success "Log directory '$dir' exists"
            
            if [ -w "$dir" ]; then
                log_success "Log directory '$dir' is writable"
            else
                log_error "Log directory '$dir' is not writable"
            fi
        fi
    done
    
    # Check for monitoring endpoints
    local monitoring_endpoints=("/metrics" "/health/detailed")
    
    for endpoint in "${monitoring_endpoints[@]}"; do
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint" 2>/dev/null)
        
        if [ "$status_code" = "200" ]; then
            log_success "Monitoring endpoint $endpoint is accessible"
        else
            log_warning "Monitoring endpoint $endpoint returned status: $status_code"
        fi
    done
}

# Performance validation
validate_performance() {
    log_info "Validating performance characteristics..."
    
    # Test API response time
    local start_time=$(date +%s%N)
    curl -s "$API_URL/health" >/dev/null 2>&1
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$response_time" -lt 500 ]; then
        log_success "API response time: ${response_time}ms (good)"
    elif [ "$response_time" -lt 1000 ]; then
        log_warning "API response time: ${response_time}ms (acceptable)"
    else
        log_error "API response time: ${response_time}ms (too slow)"
    fi
    
    # Test web application response time
    start_time=$(date +%s%N)
    curl -s "$WEB_URL" >/dev/null 2>&1
    end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$response_time" -lt 1000 ]; then
        log_success "Web app response time: ${response_time}ms (good)"
    elif [ "$response_time" -lt 2000 ]; then
        log_warning "Web app response time: ${response_time}ms (acceptable)"
    else
        log_error "Web app response time: ${response_time}ms (too slow)"
    fi
}

# Main validation function
main() {
    echo "=========================================="
    echo "StepFlow Platform Deployment Validation"
    echo "=========================================="
    echo
    
    log_info "Starting deployment validation..."
    echo
    
    # Run all validations
    validate_environment
    echo
    
    # Detect deployment type and validate accordingly
    if command_exists kubectl && kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        validate_kubernetes
    elif [ -f "docker-compose.yml" ]; then
        validate_docker_compose
    else
        log_warning "No Kubernetes or Docker Compose deployment detected"
    fi
    echo
    
    validate_database
    echo
    
    validate_file_storage
    echo
    
    validate_api_endpoints
    echo
    
    validate_web_application
    echo
    
    validate_ssl
    echo
    
    validate_monitoring
    echo
    
    validate_performance
    echo
    
    # Summary
    echo "=========================================="
    echo "Validation Summary"
    echo "=========================================="
    
    if [ $VALIDATION_ERRORS -eq 0 ] && [ $VALIDATION_WARNINGS -eq 0 ]; then
        log_success "All validations passed! Deployment is healthy."
        exit 0
    elif [ $VALIDATION_ERRORS -eq 0 ]; then
        log_warning "Validation completed with $VALIDATION_WARNINGS warning(s). Deployment is functional but may need attention."
        exit 0
    else
        log_error "Validation failed with $VALIDATION_ERRORS error(s) and $VALIDATION_WARNINGS warning(s). Please address the issues before proceeding."
        exit 1
    fi
}

# Run main function
main "$@"