terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# Main AWS region where the resources should be created in
# Should be close to where your Next.js deployment is located
provider "aws" {
  region = "us-west-1"
}

module "next_image_optimizer" {
  source = "milliHQ/next-js-image-optimization/aws"

  next_image_domains = ["connextscan.io", "www.connextscan.io", "staging.connextscan.io", "testnet.connextscan.io", "bridge.connext.network", "staging.bridge.connext.network", "testnet.bridge.connext.network", "amarok.connextscan.io", "staging.amarok.connextscan.io", "testnet.amarok.connextscan.io", "amarok.bridge.connext.network", "staging.amarok.bridge.connext.network", "testnet.amarok.bridge.connext.network"]
}

output "domain" {
  value = module.next_image_optimizer.cloudfront_domain_name
}