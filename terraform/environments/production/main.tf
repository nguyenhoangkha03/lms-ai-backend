terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# EKS Cluster
module "eks" {
  source = "../../modules/eks"
  
  cluster_name    = "lms-ai-production"
  cluster_version = "1.28"
  
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnets
  
  node_groups = {
    main = {
      instance_types = ["t3.medium"]
      scaling_config = {
        desired_size = 3
        max_size     = 10
        min_size     = 2
      }
    }
  }
  
  tags = local.common_tags
}

# RDS Database
module "rds" {
  source = "../../modules/rds"
  
  identifier = "lms-ai-production"
  engine     = "mysql"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  
  instance_class = "db.t3.medium"
  
  db_name  = "lms_ai_production"
  username = "admin"
  
  vpc_security_group_ids = [module.security_groups.rds_sg_id]
  db_subnet_group_name   = module.vpc.database_subnet_group
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "Sun:04:00-Sun:05:00"
  
  tags = local.common_tags
}

# ElastiCache Redis
module "redis" {
  source = "../../modules/elasticache"
  
  cluster_id       = "lms-ai-production"
  node_type        = "cache.t3.micro"
  num_cache_nodes  = 1
  
  subnet_group_name = module.vpc.elasticache_subnet_group
  security_group_ids = [module.security_groups.redis_sg_id]
  
  tags = local.common_tags
}