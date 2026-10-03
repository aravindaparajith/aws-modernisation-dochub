resource "aws_ecr_repository" "api" {
  name                 = "${var.project}-api"
  image_tag_mutability = "IMMUTABLE" # a tag can never be overwritten
  force_delete         = true        # dev only: lets destroy remove a repo with images

  image_scanning_configuration {
    scan_on_push = true # free basic CVE scan on every push
  }
}

# Keep storage costs down: only keep the 5 most recent images
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}