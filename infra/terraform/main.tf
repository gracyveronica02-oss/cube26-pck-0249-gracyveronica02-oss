terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Application = var.app_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# 1. VPC and Networking
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.app_name}-vpc"
  }
}

# 2. S3 Object Storage for Package Photography and Evidence
resource "aws_kms_key" "s3_kms" {
  description             = "KMS key for Pack Manager evidence storage encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_s3_bucket" "evidence_storage" {
  bucket = "${var.app_name}-evidence-${var.environment}"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "s3_encryption" {
  bucket = aws_s3_bucket.evidence_storage.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3_kms.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "block_public" {
  bucket = aws_s3_bucket.evidence_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 3. RDS Multi-AZ PostgreSQL 16
resource "aws_db_instance" "postgres" {
  identifier             = "${var.app_name}-postgres-${var.environment}"
  engine                 = "postgres"
  engine_version         = "16.2"
  instance_class         = var.postgres_instance_class
  allocated_storage      = 100
  max_allocated_storage  = 1000
  storage_type           = "gp3"
  multi_az               = true
  publicly_accessible    = false
  storage_encrypted      = true
  skip_final_snapshot    = true
  deletion_protection    = true

  db_name  = "pack_manager_db"
  username = "pack_admin"
  manage_master_user_password = true
}

# 4. Redis Cluster (BullMQ & Cache)
resource "aws_elasticache_subnet_group" "redis_subnets" {
  name       = "${var.app_name}-redis-subnet-group"
  subnet_ids = []
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "${var.app_name}-redis-${var.environment}"
  description                   = "BullMQ Queue and Idempotency Cache"
  node_type                     = var.redis_node_type
  num_cache_clusters            = 2
  parameter_group_name          = "default.redis7"
  port                          = 6379
  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = true
  automatic_failover_enabled    = true
}

# 5. ECS Cluster & Fargate Tasks
resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ECS Auto-scaling Worker Service
resource "aws_appautoscaling_target" "worker_scaling" {
  max_capacity       = 50
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${var.app_name}-worker"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "worker_cpu_policy" {
  name               = "worker-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.worker_scaling.resource_id
  scalable_dimension = aws_appautoscaling_target.worker_scaling.scalable_dimension
  service_namespace  = aws_appautoscaling_target.worker_scaling.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 60
    scale_out_cooldown = 30
  }
}
