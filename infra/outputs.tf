output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "web_sg_id" {
  value = aws_security_group.web.id
}

output "db_sg_id" {
  value = aws_security_group.db.id
}

output "app_url" {
  value = "http://${aws_instance.web.public_ip}:5000"
}

output "health_url" {
  value = "http://${aws_instance.web.public_ip}:5000/health"
}

output "rds_endpoint" {
  value = aws_db_instance.main.address
}

output "ssh_command" {
  value = "ssh -i ~/.ssh/dochub-key.pem ec2-user@${aws_instance.web.public_ip}"
}

output "site_url" {
  value = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "uploads_bucket" {
  value = aws_s3_bucket.uploads.bucket
}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}