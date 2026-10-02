variable "region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-2"
}

variable "project" {
  description = "Name prefix for all resources"
  type        = string
  default     = "dochub-tf"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.1.0.0/16"
}