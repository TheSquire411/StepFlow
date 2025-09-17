# StepFlow Platform Deployment Guide

This guide provides comprehensive instructions for deploying the StepFlow platform to production and staging environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Application Deployment](#application-deployment)
4. [Monitoring and Alerting](#monitoring-and-alerting)
5. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
6. [Security Configuration](#security-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

## Prerequisites

### Required Tools

- **AWS CLI** (v2.0+): For AWS resource management
- **kubectl** (v1.28+): For Kubernetes cluster management
- **eksctl** (v0.150+): For EKS cluster creation and management
- **Helm** (v3.0+): For package management
- **Docker** (v20.0+): For container operations

### AWS Account Setup

1. **IAM Permissions**: Ensure your AWS user has the following permissions:
   - EKS Full Access
   - EC2 Full Access
   - S3 Full Access
   - RDS Full Access
   - IAM Full Access
   - CloudWatch Full Access

2. **AWS CLI Configuration**:
   ```bash
   aws configure
   # Enter your Access Key ID, Secret Access Key, and default region
   ```

3. **Verify Access**:
   ```bash
   aws sts get-caller-identity
   ```

### Environment Variables

Set the following environment variables:

```bash
export AWS_REGION=us-east-1
export CLUSTER_NAME=stepflow-production
export S3_BUCKET_MEDIA=stepflow-media-files
export S3_BUCKET_BACKUPS=stepflow-backups
```

## Infrastructure Setup

### 1. Automated Infrastructure Setup

Run the infrastructure setup script:

```bash
./scripts/infrastructure-setup.sh
```

This script will:
- Create S3 buckets for media files and backups
- Set up EKS cluster with managed node groups
- Install essential add-ons (Load Balancer Controller, NGINX Ingress, cert-manager)
- Configure IAM roles and policies
- Set up monitoring infrastructure
- Create RDS instance for production database

### 2. Manual Infrastructure Setup (Alternative)

If you prefer manual setup or need to customize the infrastructure:

#### Create S3 Buckets

```bash
# Media files bucket
aws s3 mb s3://stepflow-media-files --region us-east-1
aws s3api put-bucket-versioning --bucket stepflow-media-files --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket stepflow-media-files --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Backups bucket
aws s3 mb s3://stepflow-backups --region us-east-1
aws s3api put-bucket-versioning --bucket stepflow-backups --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket stepflow-backups --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

#### Create EKS Cluster

```bash
eksctl create cluster \
  --name stepflow-production \
  --region us-east-1 \
  --version 1.28 \
  --nodegroup-name stepflow-nodes \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed
```

#### Install Add-ons

```bash
# AWS Load Balancer Controller
eksctl create iamserviceaccount \
  --cluster=stepflow-production \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess \
  --approve

helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=stepflow-production \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# cert-manager
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true
```

## Application Deployment

### 1. Configure Secrets

Before deploying, update the secrets in `k8s/secrets.yaml` with actual values:

```bash
# Generate base64 encoded secrets
echo -n "your-postgres-password" | base64
echo -n "your-redis-password" | base64
echo -n "your-jwt-secret" | base64
# ... etc for all secrets
```

Update the secrets file and apply:

```bash
kubectl apply -f k8s/secrets.yaml
```

### 2. Automated Deployment

Use the deployment script for a complete deployment:

```bash
./scripts/deploy.sh production
```

This will deploy:
- Namespace and configuration
- Security policies
- Storage components (PostgreSQL, Redis)
- Application services (API, Web, AI Processor)
- Networking (Ingress, Network Policies)
- Monitoring stack (Prometheus, Grafana, AlertManager)
- Backup infrastructure

### 3. Manual Deployment Steps

If you prefer manual deployment:

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Apply configuration
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# 3. Deploy security policies
kubectl apply -f k8s/security/

# 4. Deploy storage
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml

# 5. Wait for storage to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n stepflow --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n stepflow --timeout=300s

# 6. Deploy applications
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/web.yaml
kubectl apply -f k8s/ai-processor.yaml

# 7. Deploy networking
kubectl apply -f k8s/ingress.yaml

# 8. Deploy monitoring
kubectl apply -f k8s/monitoring/

# 9. Deploy backup infrastructure
kubectl apply -f k8s/backup/
```

### 4. Verify Deployment

```bash
# Check pod status
kubectl get pods -n stepflow

# Check services
kubectl get services -n stepflow

# Check ingress
kubectl get ingress -n stepflow

# Run health checks
kubectl exec -n stepflow deployment/api -- wget -qO- http://localhost:3000/health
```

## Monitoring and Alerting

### Access Monitoring Dashboards

#### Grafana
```bash
kubectl port-forward svc/grafana-service 3000:3000 -n stepflow
# Access at http://localhost:3000
# Default credentials: admin/admin (change on first login)
```

#### Prometheus
```bash
kubectl port-forward svc/prometheus-service 9090:9090 -n stepflow
# Access at http://localhost:9090
```

### Configure Alerting

1. **Update AlertManager Configuration**:
   Edit `k8s/monitoring/alertmanager.yaml` to configure:
   - Slack webhook URLs
   - Email SMTP settings
   - PagerDuty integration (if needed)

2. **Apply Updated Configuration**:
   ```bash
   kubectl apply -f k8s/monitoring/alertmanager.yaml
   ```

### Key Metrics to Monitor

- **API Response Time**: 95th percentile should be < 500ms
- **Error Rate**: Should be < 1%
- **Memory Usage**: Should be < 80% of limits
- **CPU Usage**: Should be < 70% of limits
- **Database Connections**: Monitor connection pool usage
- **Queue Length**: Monitor Redis queue lengths

## Backup and Disaster Recovery

### Automated Backups

The platform includes automated backup jobs:

- **PostgreSQL**: Daily backups at 2 AM UTC
- **Redis**: Daily backups at 3 AM UTC
- **Volume Snapshots**: Weekly snapshots on Sunday at 4 AM UTC

### Manual Backup

```bash
# Trigger manual PostgreSQL backup
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%Y%m%d-%H%M%S) -n stepflow

# Trigger manual Redis backup
kubectl create job --from=cronjob/redis-backup manual-redis-backup-$(date +%Y%m%d-%H%M%S) -n stepflow
```

### Disaster Recovery

#### Database Restore

```bash
# List available backups
aws s3 ls s3://stepflow-backups/postgres-backups/

# Restore from backup
./scripts/rollback.sh database stepflow-backup-20231201-020000.sql.gz
```

#### Application Rollback

```bash
# Rollback specific service
./scripts/rollback.sh service api

# Rollback all services
./scripts/rollback.sh all

# Emergency rollback (immediate)
./scripts/rollback.sh emergency
```

#### Volume Restore

```bash
# List available snapshots
aws ec2 describe-snapshots --owner-ids self --filters "Name=tag:Service,Values=stepflow"

# Restore from snapshot
./scripts/rollback.sh restore-from-snapshot snap-1234567890abcdef0 postgres
```

## Security Configuration

### Network Security

- **Network Policies**: Implemented to restrict pod-to-pod communication
- **Ingress Security**: HTTPS enforcement, rate limiting
- **Pod Security**: Non-root containers, read-only root filesystem where possible

### Secrets Management

- **Kubernetes Secrets**: All sensitive data stored as Kubernetes secrets
- **Encryption**: Secrets encrypted at rest
- **Rotation**: Regular rotation of JWT secrets and API keys

### Access Control

- **RBAC**: Role-based access control for Kubernetes resources
- **Service Accounts**: Dedicated service accounts with minimal permissions
- **Pod Security Policies**: Enforce security standards for pods

### Security Monitoring

- **Vulnerability Scanning**: Automated scanning in CI/CD pipeline
- **Audit Logging**: Kubernetes audit logs enabled
- **Security Alerts**: Configured in AlertManager

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n stepflow

# Check logs
kubectl logs <pod-name> -n stepflow

# Check events
kubectl get events -n stepflow --sort-by='.lastTimestamp'
```

#### Database Connection Issues

```bash
# Check PostgreSQL pod
kubectl exec -it deployment/postgres -n stepflow -- psql -U stepflow -d stepflow -c "SELECT 1;"

# Check network connectivity
kubectl exec -it deployment/api -n stepflow -- nc -zv postgres-service 5432
```

#### Ingress Issues

```bash
# Check ingress status
kubectl describe ingress stepflow-ingress -n stepflow

# Check NGINX controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

#### Performance Issues

```bash
# Check resource usage
kubectl top pods -n stepflow
kubectl top nodes

# Check HPA status
kubectl get hpa -n stepflow
```

### Log Analysis

```bash
# API logs
kubectl logs -f deployment/api -n stepflow

# Web server logs
kubectl logs -f deployment/web -n stepflow

# AI processor logs
kubectl logs -f deployment/ai-processor -n stepflow

# Database logs
kubectl logs -f deployment/postgres -n stepflow
```

## Maintenance

### Regular Maintenance Tasks

#### Weekly
- Review monitoring dashboards
- Check backup success
- Review security alerts
- Update dependencies (if needed)

#### Monthly
- Review resource usage and scaling
- Update Kubernetes cluster
- Review and rotate secrets
- Performance optimization review

#### Quarterly
- Disaster recovery testing
- Security audit
- Cost optimization review
- Capacity planning

### Scaling Operations

#### Manual Scaling

```bash
# Scale API service
kubectl scale deployment api --replicas=5 -n stepflow

# Scale AI processor
kubectl scale deployment ai-processor --replicas=4 -n stepflow
```

#### Auto-scaling Configuration

HPA (Horizontal Pod Autoscaler) is configured for:
- API: 3-10 replicas based on CPU (70%) and memory (80%)
- Web: 2-5 replicas based on CPU (70%)
- AI Processor: 2-8 replicas based on CPU (75%) and memory (85%)

### Updates and Upgrades

#### Application Updates

Updates are handled through the CI/CD pipeline. For manual updates:

```bash
# Update image tag
kubectl set image deployment/api api=stepflow/api:new-tag -n stepflow

# Monitor rollout
kubectl rollout status deployment/api -n stepflow
```

#### Kubernetes Cluster Updates

```bash
# Update EKS cluster
eksctl update cluster --name stepflow-production --region us-east-1

# Update node groups
eksctl update nodegroup --cluster stepflow-production --name stepflow-nodes --region us-east-1
```

### Cost Optimization

#### Resource Right-sizing

Regularly review resource requests and limits:

```bash
# Check resource usage
kubectl top pods -n stepflow
kubectl describe nodes
```

#### Storage Optimization

- Monitor PVC usage
- Clean up old snapshots
- Optimize S3 storage classes

#### Compute Optimization

- Use spot instances for non-critical workloads
- Implement cluster autoscaling
- Review instance types and sizes

## Support and Documentation

### Getting Help

- **Logs**: Always check application and system logs first
- **Monitoring**: Use Grafana dashboards for performance insights
- **Documentation**: Refer to this guide and inline comments in YAML files

### Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

### Emergency Contacts

In case of critical issues:
1. Check monitoring dashboards
2. Review recent deployments
3. Execute emergency rollback if needed
4. Contact the development team with logs and error details