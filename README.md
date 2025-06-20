# KRO sample with AWS CDK
This repository is a sample project to deploy EKS Cluster with [KRO](https://kro.run) using AWS CDK.

## Architecture
![](docs/kro.svg)

* platform team deploys EKS Cluster with KRO and prepares ResourceGraphDefinition
* application teams deploy Application Stack with KRO

## Usage
### 1. Deploy EKS Cluster Auto Mode with KRO

```bash
cd infra

npm ci

# get latest KRO version
export KRO_VERSION=$(curl -sL \
    https://api.github.com/repos/kro-run/kro/releases/latest | \
    jq -r '.tag_name | ltrimstr("v")'
  )

# deploy Cluster with KRO
npx cdk deploy --require-approval never
```

### 2.deploy ResourceGraphDefinition

```bash
cd yml

# update kubeconfig for EKS Cluster (acutual command get from CDK output)
aws eks update-kubeconfig --region ${region} --name ${clusterName} --role-arn ${eksAdminRole}

# create ResourceGraphDefinition
kubectl apply -f rg.yaml
```

### 3. Deploy Application Stacks

```bash
# deploy Application Stacks
kubectl apply -f instance_team_a.yaml
kubectl apply -f instance_team_b.yaml

# get ALB addresses
kubectl get ingress --all-namespaces -o custom-columns="NAMESPACE:.metadata.namespace,NAME:.metadata.name,ALB_ADDRESS:.status.loadBalancer.ingress[0].hostname,RULES:.spec.rules[*].host"
```

## Cleanup
### delete ResourceGraphDefinition and Application Instances

```bash
cd yml

# delete Application instances
kubectl delete -f instance_team_a.yaml
kubectl delete -f instance_team_b.yaml
```

### delete EKS Cluster

```bash
cd infra

# delete Cluster
npx cdk destroy --force
```

