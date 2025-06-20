import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as eks from '@aws-cdk/aws-eks-v2-alpha';
import { KubectlV32Layer } from '@aws-cdk/lambda-layer-kubectl-v32';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'EksVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // Create the EKS cluster with Auto Mode
    const cluster = new eks.Cluster(this, 'EksCluster', {
      version: eks.KubernetesVersion.V1_32,
      defaultCapacityType: eks.DefaultCapacityType.AUTOMODE,
      vpc,
      compute: {
        nodePools: ['system', 'general-purpose'],
      },
      albController: {
        version: eks.AlbControllerVersion.V2_8_2,
      },
      kubectlProviderOptions: {
        kubectlLayer: new KubectlV32Layer(this, 'kubectl'),
      },
    });

    const eksAdminRole = new iam.Role(this, 'EksAdminRole', {
      roleName: 'EksAdminRole',
      assumedBy: new iam.AccountRootPrincipal(),
      description: 'Role for EKS cluster administration',
    });

    cluster.grantAccess('eksAdminRoleAccess', eksAdminRole.roleArn, [
      eks.AccessPolicy.fromAccessPolicyName('AmazonEKSClusterAdminPolicy', {
        accessScopeType: eks.AccessScopeType.CLUSTER,
      }),
    ]);

    // install KRO
    cluster.addHelmChart('KRO', {
      chart: 'kro',
      repository: 'oci://ghcr.io/kro-run/kro/kro',
      namespace: 'kro',
      release: 'kro',
      createNamespace: true,
      version: process.env.KRO_VERSION,
    });

    // Output
    new cdk.CfnOutput(this, 'ClusterName', { value: cluster.clusterName });

    new cdk.CfnOutput(this, 'ClusterEndpoint', {
      value: cluster.clusterEndpoint,
    });

    new cdk.CfnOutput(this, 'KubectlConfigCommand', {
      value: `aws eks update-kubeconfig --region ${this.region} --name ${cluster.clusterName} --role-arn ${eksAdminRole.roleArn}`,
    });

    new cdk.CfnOutput(this, 'VerifyConnectionCommand', {
      value: 'kubectl get nodes && kubectl get pods --all-namespaces',
    });
  }
}
