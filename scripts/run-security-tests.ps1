# StepFlow Security Test Runner (PowerShell)
# Orchestrates all security testing including penetration tests and audits

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$ApiUrl = "http://localhost:3001",
    [int]$Timeout = 10000
)

Write-Host "🔒 StepFlow Security Test Suite" -ForegroundColor Blue
Write-Host "===============================" -ForegroundColor Blue

# Function to check service availability
function Test-ServiceAvailability {
    Write-Host "📡 Checking service availability..." -ForegroundColor Cyan
    
    $apiRunning = $false
    $webRunning = $false
    
    try {
        $apiResponse = Invoke-WebRequest -Uri "$ApiUrl/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($apiResponse.StatusCode -eq 200) {
            Write-Host "✓ API service is running" -ForegroundColor Green
            $apiRunning = $true
        }
    }
    catch {
        Write-Host "⚠ API service not running - some tests will be skipped" -ForegroundColor Yellow
    }
    
    try {
        $webResponse = Invoke-WebRequest -Uri $BaseUrl -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($webResponse.StatusCode -eq 200) {
            Write-Host "✓ Web service is running" -ForegroundColor Green
            $webRunning = $true
        }
    }
    catch {
        Write-Host "⚠ Web service not running - some tests will be skipped" -ForegroundColor Yellow
    }
    
    return @{
        ApiRunning = $apiRunning
        WebRunning = $webRunning
    }
}

# Function to run static security checks
function Invoke-StaticSecurityAudit {
    Write-Host "`n🔍 Running static security audit..." -ForegroundColor Cyan
    
    $totalChecks = 0
    $passedChecks = 0
    $failedChecks = 0
    $warningChecks = 0
    
    function Write-TestResult {
        param($Status, $Message)
        $script:totalChecks++
        
        switch ($Status) {
            "PASS" {
                Write-Host "✓ PASS: $Message" -ForegroundColor Green
                $script:passedChecks++
            }
            "FAIL" {
                Write-Host "✗ FAIL: $Message" -ForegroundColor Red
                $script:failedChecks++
            }
            "WARN" {
                Write-Host "⚠ WARN: $Message" -ForegroundColor Yellow
                $script:warningChecks++
            }
        }
    }
    
    # Check for hardcoded secrets
    Write-Host "🔐 Checking for hardcoded secrets..."
    $secretPatterns = @(
        'password\s*=\s*["`''][^"`'']*["`'']',
        'api[_-]?key\s*=\s*["`''][^"`'']*["`'']',
        'secret\s*=\s*["`''][^"`'']*["`'']',
        'token\s*=\s*["`''][^"`'']*["`'']'
    )
    
    $secretsFound = 0
    foreach ($pattern in $secretPatterns) {
        $matches = Get-ChildItem -Path "packages" -Recurse -Include "*.ts", "*.js" -Exclude "*test*", "*spec*" | 
                   Select-String -Pattern $pattern -ErrorAction SilentlyContinue
        if ($matches) {
            $secretsFound += $matches.Count
        }
    }
    
    if ($secretsFound -eq 0) {
        Write-TestResult "PASS" "No hardcoded secrets found in source code"
    } else {
        Write-TestResult "FAIL" "Found $secretsFound potential hardcoded secrets"
    }
    
    # Check for .env files in git
    $envFiles = git ls-files | Where-Object { $_ -match "\.env$" }
    if ($envFiles) {
        Write-TestResult "FAIL" ".env files are tracked in git"
    } else {
        Write-TestResult "PASS" "No .env files tracked in git"
    }
    
    # Check for security middleware
    if (Test-Path "packages/api/src/index.ts") {
        $indexContent = Get-Content "packages/api/src/index.ts" -Raw
        if ($indexContent -match "helmet|cors|rate.*limit") {
            Write-TestResult "PASS" "API uses security middleware"
        } else {
            Write-TestResult "FAIL" "API missing security middleware"
        }
    }
    
    # Check for input validation
    $validationFiles = Get-ChildItem -Path "packages/api" -Recurse -Include "*.ts" | 
                       Where-Object { (Get-Content $_.FullName -Raw) -match "validate|sanitize|joi|zod" }
    if ($validationFiles) {
        Write-TestResult "PASS" "API implements input validation"
    } else {
        Write-TestResult "FAIL" "API missing input validation"
    }
    
    # Check for authentication middleware
    $authFiles = Get-ChildItem -Path "packages/api" -Recurse -Include "*auth*middleware*"
    if ($authFiles) {
        Write-TestResult "PASS" "API has authentication middleware"
    } else {
        Write-TestResult "FAIL" "API missing authentication middleware"
    }
    
    # Check Docker security
    Write-Host "🐳 Checking Docker security..."
    $dockerFiles = Get-ChildItem -Path "." -Include "Dockerfile*" -Recurse
    foreach ($dockerfile in $dockerFiles) {
        $content = Get-Content $dockerfile.FullName -Raw
        if ($content -match "USER root" -or $content -notmatch "USER ") {
            Write-TestResult "WARN" "$($dockerfile.Name) may run as root user"
        } else {
            Write-TestResult "PASS" "$($dockerfile.Name) uses non-root user"
        }
    }
    
    # Check Kubernetes security
    if (Test-Path "k8s") {
        Write-Host "☸️ Checking Kubernetes security..."
        $k8sFiles = Get-ChildItem -Path "k8s" -Recurse -Include "*.yaml", "*.yml"
        $hasSecurityContext = $false
        $hasNetworkPolicies = $false
        
        foreach ($file in $k8sFiles) {
            $content = Get-Content $file.FullName -Raw
            if ($content -match "securityContext") {
                $hasSecurityContext = $true
            }
            if ($file.Name -match "network.*policy") {
                $hasNetworkPolicies = $true
            }
        }
        
        if ($hasSecurityContext) {
            Write-TestResult "PASS" "Kubernetes deployments use security contexts"
        } else {
            Write-TestResult "FAIL" "Kubernetes deployments missing security contexts"
        }
        
        if ($hasNetworkPolicies) {
            Write-TestResult "PASS" "Kubernetes network policies configured"
        } else {
            Write-TestResult "WARN" "Kubernetes network policies not found"
        }
    }
    
    Write-Host "`n📊 Security Audit Summary" -ForegroundColor Blue
    Write-Host "========================" -ForegroundColor Blue
    Write-Host "Total Checks: $totalChecks"
    Write-Host "Passed: $passedChecks" -ForegroundColor Green
    Write-Host "Warnings: $warningChecks" -ForegroundColor Yellow
    Write-Host "Failed: $failedChecks" -ForegroundColor Red
    
    return @{
        Total = $totalChecks
        Passed = $passedChecks
        Warnings = $warningChecks
        Failed = $failedChecks
    }
}

# Function to run penetration tests
function Invoke-PenetrationTests {
    param($ServicesStatus)
    
    Write-Host "`n🎯 Running penetration tests..." -ForegroundColor Cyan
    
    if ($ServicesStatus.ApiRunning -and $ServicesStatus.WebRunning) {
        $env:BASE_URL = $BaseUrl
        $env:API_URL = $ApiUrl
        $env:TIMEOUT = $Timeout
        
        node scripts/penetration-test.js
    } else {
        Write-Host "⚠ Skipping penetration tests - services not running" -ForegroundColor Yellow
        Write-Host "To run penetration tests:"
        Write-Host "1. Start the API service: cd packages/api && npm start"
        Write-Host "2. Start the Web service: cd packages/web && npm start"
        Write-Host "3. Re-run this script"
    }
}

# Function to run dependency vulnerability scan
function Invoke-DependencyVulnerabilityScan {
    Write-Host "`n📦 Running dependency vulnerability scan..." -ForegroundColor Cyan
    
    $packages = @("packages/api", "packages/web", "packages/extension")
    
    foreach ($package in $packages) {
        if (Test-Path $package) {
            Write-Host "Scanning $package dependencies..." -ForegroundColor Yellow
            Push-Location $package
            try {
                npm audit --audit-level=moderate 2>$null
            }
            catch {
                Write-Host "Could not run npm audit for $package" -ForegroundColor Yellow
            }
            finally {
                Pop-Location
            }
        }
    }
}

# Function to generate comprehensive report
function New-SecurityReport {
    param($AuditResults, $ServicesStatus)
    
    Write-Host "`n📊 Generating comprehensive security report..." -ForegroundColor Cyan
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $reportFile = "security-test-report-$timestamp.md"
    
    $reportContent = @"
# StepFlow Security Test Report

**Generated:** $(Get-Date)
**Test Suite Version:** 1.0.0

## Executive Summary

This report contains the results of comprehensive security testing performed on the StepFlow platform, including:
- Static security audit
- Penetration testing
- Dependency vulnerability scanning

## Test Environment

- API Service: $(if ($ServicesStatus.ApiRunning) { "Running" } else { "Not Running" })
- Web Service: $(if ($ServicesStatus.WebRunning) { "Running" } else { "Not Running" })
- Test Date: $(Get-Date)

## Security Audit Results

- Total Checks: $($AuditResults.Total)
- Passed: $($AuditResults.Passed)
- Warnings: $($AuditResults.Warnings)
- Failed: $($AuditResults.Failed)

$(if (Test-Path "security-report.json") { "See security-report.json for detailed penetration test results" } else { "Penetration tests were not executed" })

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
"@

    $reportContent | Out-File -FilePath $reportFile -Encoding UTF8
    Write-Host "✅ Security report generated: $reportFile" -ForegroundColor Green
}

# Main execution
function Main {
    $servicesStatus = Test-ServiceAvailability
    $auditResults = Invoke-StaticSecurityAudit
    Invoke-PenetrationTests -ServicesStatus $servicesStatus
    Invoke-DependencyVulnerabilityScan
    New-SecurityReport -AuditResults $auditResults -ServicesStatus $servicesStatus
    
    Write-Host "`n🎉 Security testing completed!" -ForegroundColor Green
    Write-Host "Review the generated reports for detailed findings."
}

# Run the main function
Main