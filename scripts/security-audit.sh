#!/bin/bash

# StepFlow Security Audit Script
# This script performs comprehensive security checks across the platform

set -e

echo "🔒 Starting StepFlow Security Audit..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Function to log results
log_result() {
    local status=$1
    local message=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case $status in
        "PASS")
            echo -e "${GREEN}✓ PASS${NC}: $message"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            ;;
        "FAIL")
            echo -e "${RED}✗ FAIL${NC}: $message"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            ;;
        "WARN")
            echo -e "${YELLOW}⚠ WARN${NC}: $message"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            ;;
    esac
}

# Check if required tools are installed
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if command -v npm &> /dev/null; then
        log_result "PASS" "npm is installed"
    else
        log_result "FAIL" "npm is not installed"
        exit 1
    fi
    
    if command -v docker &> /dev/null; then
        log_result "PASS" "Docker is installed"
    else
        log_result "WARN" "Docker is not installed - skipping container security checks"
    fi
    
    if command -v git &> /dev/null; then
        log_result "PASS" "Git is installed"
    else
        log_result "FAIL" "Git is not installed"
    fi
}

# Check for security vulnerabilities in dependencies
check_npm_vulnerabilities() {
    echo ""
    echo "🔍 Checking npm vulnerabilities..."
    
    # Check API package
    if [ -d "packages/api" ]; then
        cd packages/api
        if npm audit --audit-level=high --json > /tmp/api_audit.json 2>/dev/null; then
            vulnerabilities=$(cat /tmp/api_audit.json | grep -o '"high":[0-9]*' | cut -d':' -f2 | head -1)
            if [ "$vulnerabilities" = "0" ] || [ -z "$vulnerabilities" ]; then
                log_result "PASS" "API package has no high-severity vulnerabilities"
            else
                log_result "FAIL" "API package has $vulnerabilities high-severity vulnerabilities"
            fi
        else
            log_result "WARN" "Could not run npm audit for API package"
        fi
        cd ../..
    fi
    
    # Check Web package
    if [ -d "packages/web" ]; then
        cd packages/web
        if npm audit --audit-level=high --json > /tmp/web_audit.json 2>/dev/null; then
            vulnerabilities=$(cat /tmp/web_audit.json | grep -o '"high":[0-9]*' | cut -d':' -f2 | head -1)
            if [ "$vulnerabilities" = "0" ] || [ -z "$vulnerabilities" ]; then
                log_result "PASS" "Web package has no high-severity vulnerabilities"
            else
                log_result "FAIL" "Web package has $vulnerabilities high-severity vulnerabilities"
            fi
        else
            log_result "WARN" "Could not run npm audit for Web package"
        fi
        cd ../..
    fi
}

# Check for hardcoded secrets and sensitive data
check_secrets() {
    echo ""
    echo "🔐 Checking for hardcoded secrets..."
    
    # Common secret patterns
    secret_patterns=(
        "password\s*=\s*['\"][^'\"]*['\"]"
        "api[_-]?key\s*=\s*['\"][^'\"]*['\"]"
        "secret\s*=\s*['\"][^'\"]*['\"]"
        "token\s*=\s*['\"][^'\"]*['\"]"
        "private[_-]?key\s*=\s*['\"][^'\"]*['\"]"
        "aws[_-]?access[_-]?key"
        "aws[_-]?secret[_-]?key"
    )
    
    secrets_found=0
    for pattern in "${secret_patterns[@]}"; do
        if grep -r -i -E "$pattern" packages/ --exclude-dir=node_modules --exclude="*.test.*" --exclude="*.spec.*" > /dev/null 2>&1; then
            secrets_found=$((secrets_found + 1))
        fi
    done
    
    if [ $secrets_found -eq 0 ]; then
        log_result "PASS" "No hardcoded secrets found in source code"
    else
        log_result "FAIL" "Found $secrets_found potential hardcoded secrets"
    fi
    
    # Check for .env files in git
    if git ls-files | grep -E "\.env$" > /dev/null 2>&1; then
        log_result "FAIL" ".env files are tracked in git"
    else
        log_result "PASS" "No .env files tracked in git"
    fi
}

# Check file permissions
check_file_permissions() {
    echo ""
    echo "📁 Checking file permissions..."
    
    # Check for world-writable files
    if find . -type f -perm -002 -not -path "./node_modules/*" -not -path "./.git/*" | head -1 > /dev/null 2>&1; then
        log_result "FAIL" "Found world-writable files"
    else
        log_result "PASS" "No world-writable files found"
    fi
    
    # Check for executable scripts
    script_files=$(find . -name "*.sh" -type f -not -path "./node_modules/*" -not -path "./.git/*")
    if [ -n "$script_files" ]; then
        non_executable=0
        for script in $script_files; do
            if [ ! -x "$script" ]; then
                non_executable=$((non_executable + 1))
            fi
        done
        
        if [ $non_executable -eq 0 ]; then
            log_result "PASS" "All shell scripts are executable"
        else
            log_result "WARN" "$non_executable shell scripts are not executable"
        fi
    fi
}

# Check Docker security
check_docker_security() {
    echo ""
    echo "🐳 Checking Docker security..."
    
    if ! command -v docker &> /dev/null; then
        log_result "WARN" "Docker not available - skipping Docker security checks"
        return
    fi
    
    # Check Dockerfile security
    dockerfiles=$(find . -name "Dockerfile*" -type f)
    for dockerfile in $dockerfiles; do
        # Check for running as root
        if grep -q "USER root" "$dockerfile" || ! grep -q "USER " "$dockerfile"; then
            log_result "WARN" "$dockerfile may run as root user"
        else
            log_result "PASS" "$dockerfile uses non-root user"
        fi
        
        # Check for COPY with --chown
        if grep -q "COPY.*--chown" "$dockerfile"; then
            log_result "PASS" "$dockerfile uses --chown with COPY"
        else
            log_result "WARN" "$dockerfile doesn't use --chown with COPY"
        fi
    done
}

# Check API security configurations
check_api_security() {
    echo ""
    echo "🌐 Checking API security configurations..."
    
    # Check for security middleware
    if [ -f "packages/api/src/index.ts" ]; then
        if grep -q "helmet\|cors\|rate.*limit" packages/api/src/index.ts; then
            log_result "PASS" "API uses security middleware"
        else
            log_result "FAIL" "API missing security middleware"
        fi
    fi
    
    # Check for input validation
    if find packages/api -name "*.ts" -exec grep -l "validate\|sanitize\|joi\|zod" {} \; | head -1 > /dev/null 2>&1; then
        log_result "PASS" "API implements input validation"
    else
        log_result "FAIL" "API missing input validation"
    fi
    
    # Check for authentication middleware
    if find packages/api -name "*auth*middleware*" | head -1 > /dev/null 2>&1; then
        log_result "PASS" "API has authentication middleware"
    else
        log_result "FAIL" "API missing authentication middleware"
    fi
}

# Check web application security
check_web_security() {
    echo ""
    echo "🌍 Checking web application security..."
    
    # Check for CSP headers
    if grep -r "Content-Security-Policy\|CSP" packages/web/ > /dev/null 2>&1; then
        log_result "PASS" "Web app implements Content Security Policy"
    else
        log_result "WARN" "Web app missing Content Security Policy"
    fi
    
    # Check for XSS protection
    if grep -r "dangerouslySetInnerHTML" packages/web/src/ > /dev/null 2>&1; then
        log_result "WARN" "Web app uses dangerouslySetInnerHTML - review for XSS risks"
    else
        log_result "PASS" "Web app doesn't use dangerouslySetInnerHTML"
    fi
    
    # Check for HTTPS enforcement
    if grep -r "https\|ssl\|tls" nginx.conf > /dev/null 2>&1; then
        log_result "PASS" "HTTPS configuration found"
    else
        log_result "WARN" "HTTPS configuration not found in nginx.conf"
    fi
}

# Check database security
check_database_security() {
    echo ""
    echo "🗄️ Checking database security..."
    
    # Check for SQL injection protection
    if find packages/api -name "*.ts" -exec grep -l "prepared.*statement\|parameterized\|query.*bind" {} \; | head -1 > /dev/null 2>&1; then
        log_result "PASS" "Database uses parameterized queries"
    else
        log_result "WARN" "Could not verify parameterized query usage"
    fi
    
    # Check for database connection encryption
    if grep -r "ssl.*true\|sslmode.*require" packages/api/src/config/ > /dev/null 2>&1; then
        log_result "PASS" "Database connection uses SSL"
    else
        log_result "WARN" "Database SSL configuration not found"
    fi
}

# Check Kubernetes security
check_k8s_security() {
    echo ""
    echo "☸️ Checking Kubernetes security..."
    
    if [ ! -d "k8s" ]; then
        log_result "WARN" "No Kubernetes configurations found"
        return
    fi
    
    # Check for security contexts
    if grep -r "securityContext" k8s/ > /dev/null 2>&1; then
        log_result "PASS" "Kubernetes deployments use security contexts"
    else
        log_result "FAIL" "Kubernetes deployments missing security contexts"
    fi
    
    # Check for network policies
    if find k8s -name "*network*policy*" | head -1 > /dev/null 2>&1; then
        log_result "PASS" "Kubernetes network policies configured"
    else
        log_result "WARN" "Kubernetes network policies not found"
    fi
    
    # Check for pod security policies
    if find k8s -name "*pod*security*" | head -1 > /dev/null 2>&1; then
        log_result "PASS" "Kubernetes pod security policies configured"
    else
        log_result "WARN" "Kubernetes pod security policies not found"
    fi
}

# Check CI/CD security
check_cicd_security() {
    echo ""
    echo "🔄 Checking CI/CD security..."
    
    if [ -f ".github/workflows/ci-cd.yml" ]; then
        # Check for secret usage
        if grep -q "secrets\." .github/workflows/ci-cd.yml; then
            log_result "PASS" "CI/CD uses GitHub secrets"
        else
            log_result "WARN" "CI/CD may not be using secrets properly"
        fi
        
        # Check for dependency scanning
        if grep -q "audit\|security.*scan\|vulnerability" .github/workflows/ci-cd.yml; then
            log_result "PASS" "CI/CD includes security scanning"
        else
            log_result "WARN" "CI/CD missing security scanning"
        fi
    else
        log_result "WARN" "No CI/CD configuration found"
    fi
}

# Generate security report
generate_report() {
    echo ""
    echo "📊 Security Audit Summary"
    echo "========================"
    echo "Total Checks: $TOTAL_CHECKS"
    echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
    echo -e "${YELLOW}Warnings: $WARNING_CHECKS${NC}"
    echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
    echo ""
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "${GREEN}✅ Security audit completed successfully!${NC}"
        if [ $WARNING_CHECKS -gt 0 ]; then
            echo -e "${YELLOW}⚠️  Please review the warnings above.${NC}"
        fi
    else
        echo -e "${RED}❌ Security audit found critical issues that need attention.${NC}"
        exit 1
    fi
}

# Main execution
main() {
    check_dependencies
    check_npm_vulnerabilities
    check_secrets
    check_file_permissions
    check_docker_security
    check_api_security
    check_web_security
    check_database_security
    check_k8s_security
    check_cicd_security
    generate_report
}

# Run the audit
main