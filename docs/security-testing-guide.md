# StepFlow Security Testing Guide

This guide provides comprehensive instructions for conducting security testing on the StepFlow platform.

## Overview

The StepFlow security testing suite includes:
- **Static Security Audit**: Code analysis and configuration review
- **Penetration Testing**: Automated vulnerability scanning
- **Dependency Scanning**: Third-party package vulnerability assessment

## Prerequisites

### Required Tools
- Node.js (v16 or higher)
- npm or yarn
- Docker (for container security testing)
- curl (for service availability checks)
- Git

### Environment Setup
1. Ensure all services are running:
   ```bash
   # Start API service
   cd packages/api && npm start &
   
   # Start Web service  
   cd packages/web && npm start &
   
   # Wait for services to initialize
   sleep 10
   ```

2. Verify service availability:
   ```bash
   curl http://localhost:3001/health  # API health check
   curl http://localhost:3000         # Web service check
   ```

## Running Security Tests

### Quick Start
Run all security tests with a single command:
```bash
chmod +x scripts/run-security-tests.sh
./scripts/run-security-tests.sh
```

### Individual Test Components

#### 1. Static Security Audit
```bash
chmod +x scripts/security-audit.sh
./scripts/security-audit.sh
```

**What it checks:**
- Hardcoded secrets and credentials
- File permissions and access controls
- Docker security configurations
- API security middleware
- Database security settings
- Kubernetes security policies
- CI/CD security practices

#### 2. Penetration Testing
```bash
node scripts/penetration-test.js
```

**What it tests:**
- SQL injection vulnerabilities
- Cross-site scripting (XSS)
- Authentication bypass attempts
- CSRF protection
- Rate limiting effectiveness
- File upload security
- Session management
- Input validation
- Privilege escalation

#### 3. Dependency Vulnerability Scanning
```bash
# Scan all packages
npm audit --audit-level=moderate

# Or scan individual packages
cd packages/api && npm audit
cd packages/web && npm audit
cd packages/extension && npm audit
```

## Test Configuration

### Environment Variables
Configure testing parameters using environment variables:

```bash
# Penetration testing configuration
export BASE_URL="http://localhost:3000"
export API_URL="http://localhost:3001"
export TIMEOUT="10000"

# Run tests with custom configuration
node scripts/penetration-test.js
```

### Custom Test Targets
Modify the penetration test script to target different environments:

```javascript
const config = {
  baseUrl: 'https://staging.stepflow.com',
  apiUrl: 'https://api-staging.stepflow.com',
  timeout: 15000
};
```

## Understanding Test Results

### Security Audit Results
The security audit provides color-coded results:
- 🟢 **PASS**: Security check passed
- 🟡 **WARN**: Potential security concern (review recommended)
- 🔴 **FAIL**: Security vulnerability found (immediate action required)

### Penetration Test Results
Penetration test results are categorized by severity:
- **HIGH**: Critical vulnerabilities requiring immediate attention
- **MEDIUM**: Important security issues to address
- **LOW**: Minor security improvements

### Report Files
Tests generate the following reports:
- `security-report.json`: Detailed penetration test results
- `security-test-report-[timestamp].md`: Comprehensive test summary

## Common Vulnerabilities and Fixes

### SQL Injection
**Detection**: Penetration test attempts SQL injection payloads
**Fix**: Use parameterized queries and input validation
```typescript
// Bad
const query = `SELECT * FROM users WHERE email = '${email}'`;

// Good  
const query = 'SELECT * FROM users WHERE email = ?';
db.query(query, [email]);
```

### Cross-Site Scripting (XSS)
**Detection**: Test injects script tags in user inputs
**Fix**: Sanitize user input and use Content Security Policy
```typescript
// Sanitize input
import DOMPurify from 'dompurify';
const cleanInput = DOMPurify.sanitize(userInput);

// Set CSP headers
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"]
  }
}));
```

### Authentication Bypass
**Detection**: Test accesses protected endpoints without valid tokens
**Fix**: Implement proper authentication middleware
```typescript
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
```

### Rate Limiting
**Detection**: Test sends rapid requests to endpoints
**Fix**: Implement rate limiting middleware
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Continuous Security Testing

### CI/CD Integration
Add security testing to your CI/CD pipeline:

```yaml
# .github/workflows/security.yml
name: Security Tests
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Run security audit
        run: ./scripts/security-audit.sh
      - name: Run dependency scan
        run: npm audit --audit-level=high
```

### Scheduled Testing
Set up regular security testing:
```bash
# Add to crontab for weekly security scans
0 2 * * 1 /path/to/stepflow/scripts/run-security-tests.sh
```

## Security Best Practices

### Development
1. **Input Validation**: Validate all user inputs
2. **Authentication**: Use strong authentication mechanisms
3. **Authorization**: Implement proper access controls
4. **Encryption**: Encrypt sensitive data in transit and at rest
5. **Logging**: Log security events for monitoring

### Deployment
1. **HTTPS**: Use HTTPS for all communications
2. **Security Headers**: Implement security headers
3. **Secrets Management**: Use secure secret management
4. **Network Security**: Implement network segmentation
5. **Monitoring**: Set up security monitoring and alerting

### Maintenance
1. **Updates**: Keep dependencies updated
2. **Patches**: Apply security patches promptly
3. **Audits**: Conduct regular security audits
4. **Training**: Provide security training for team
5. **Incident Response**: Have incident response procedures

## Troubleshooting

### Common Issues

#### Services Not Running
```bash
# Check if ports are in use
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001

# Start services manually
cd packages/api && npm start
cd packages/web && npm start
```

#### Permission Errors
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Fix file permissions
find . -type f -name "*.sh" -exec chmod +x {} \;
```

#### Network Connectivity
```bash
# Test local connectivity
curl -v http://localhost:3001/health
curl -v http://localhost:3000

# Check firewall settings
sudo ufw status
```

## Getting Help

For security-related questions or to report vulnerabilities:
1. Check the troubleshooting section above
2. Review the security documentation
3. Contact the security team
4. For critical vulnerabilities, follow responsible disclosure practices

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)