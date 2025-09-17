#!/bin/bash

# StepFlow Security Test Runner
# Orchestrates all security testing including penetration tests and audits

set -e

echo "🔒 StepFlow Security Test Suite"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if services are running
check_services() {
    echo -e "${BLUE}📡 Checking service availability...${NC}"
    
    # Check API service
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API service is running${NC}"
        API_RUNNING=true
    else
        echo -e "${YELLOW}⚠ API service not running - some tests will be skipped${NC}"
        API_RUNNING=false
    fi
    
    # Check Web service
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Web service is running${NC}"
        WEB_RUNNING=true
    else
        echo -e "${YELLOW}⚠ Web service not running - some tests will be skipped${NC}"
        WEB_RUNNING=false
    fi
}

# Run static security audit
run_security_audit() {
    echo -e "\n${BLUE}🔍 Running static security audit...${NC}"
    if [ -f "scripts/security-audit.sh" ]; then
        chmod +x scripts/security-audit.sh
        ./scripts/security-audit.sh
    else
        echo -e "${RED}❌ Security audit script not found${NC}"
        return 1
    fi
}

# Run penetration tests
run_penetration_tests() {
    echo -e "\n${BLUE}🎯 Running penetration tests...${NC}"
    
    if [ "$API_RUNNING" = true ] && [ "$WEB_RUNNING" = true ]; then
        node scripts/penetration-test.js
    else
        echo -e "${YELLOW}⚠ Skipping penetration tests - services not running${NC}"
        echo "To run penetration tests:"
        echo "1. Start the API service: cd packages/api && npm start"
        echo "2. Start the Web service: cd packages/web && npm start"
        echo "3. Re-run this script"
    fi
}

# Run dependency vulnerability scan
run_dependency_scan() {
    echo -e "\n${BLUE}📦 Running dependency vulnerability scan...${NC}"
    
    # Scan API dependencies
    if [ -d "packages/api" ]; then
        echo "Scanning API dependencies..."
        cd packages/api
        npm audit --audit-level=moderate || true
        cd ../..
    fi
    
    # Scan Web dependencies
    if [ -d "packages/web" ]; then
        echo "Scanning Web dependencies..."
        cd packages/web
        npm audit --audit-level=moderate || true
        cd ../..
    fi
    
    # Scan Extension dependencies
    if [ -d "packages/extension" ]; then
        echo "Scanning Extension dependencies..."
        cd packages/extension
        npm audit --audit-level=moderate || true
        cd ../..
    fi
}

# Generate comprehensive report
generate_final_report() {
    echo -e "\n${BLUE}📊 Generating comprehensive security report...${NC}"
    
    REPORT_FILE="security-test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# StepFlow Security Test Report

**Generated:** $(date)
**Test Suite Version:** 1.0.0

## Executive Summary

This report contains the results of comprehensive security testing performed on the StepFlow platform, including:
- Static security audit
- Penetration testing
- Dependency vulnerability scanning

## Test Environment

- API Service: $([ "$API_RUNNING" = true ] && echo "Running" || echo "Not Running")
- Web Service: $([ "$WEB_RUNNING" = true ] && echo "Running" || echo "Not Running")
- Test Date: $(date)

## Security Audit Results

$([ -f "security-report.json" ] && echo "See security-report.json for detailed penetration test results" || echo "Penetration tests were not executed")

## Recommendations

### High Priority
1. Ensure all services are running during security testing
2. Implement automated security testing in CI/CD pipeline
3. Regular dependency updates and vulnerability scanning
4. Periodic penetration testing by security professionals

### Medium Priority
1. Implement security headers across all services
2. Add rate limiting to all public endpoints
3. Enhance input validation and sanitization
4. Implement comprehensive audit logging

### Low Priority
1. Security awareness training for development team
2. Regular security code reviews
3. Implement security monitoring and alerting

## Next Steps

1. Address any critical vulnerabilities found
2. Implement recommended security measures
3. Schedule regular security assessments
4. Update security documentation

---
*This report was generated automatically by the StepFlow security test suite.*
EOF

    echo -e "${GREEN}✅ Security report generated: $REPORT_FILE${NC}"
}

# Main execution
main() {
    check_services
    run_security_audit
    run_penetration_tests
    run_dependency_scan
    generate_final_report
    
    echo -e "\n${GREEN}🎉 Security testing completed!${NC}"
    echo "Review the generated reports for detailed findings."
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi