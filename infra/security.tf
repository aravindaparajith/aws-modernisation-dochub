# --- Web tier (EC2) --------------------------------------------------
resource "aws_security_group" "web" {
  name        = "${var.project}-web-sg"
  description = "DocHub web server - SSH and app from my IP"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${var.project}-web-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "web_ssh" {
  security_group_id = aws_security_group.web.id
  description       = "SSH from my IP"
  cidr_ipv4         = var.my_ip_cidr
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
}

resource "aws_vpc_security_group_ingress_rule" "web_app" {
  security_group_id = aws_security_group.web.id
  description       = "DocHub app from my IP"
  cidr_ipv4         = var.my_ip_cidr
  ip_protocol       = "tcp"
  from_port         = 5000
  to_port           = 5000
}

resource "aws_vpc_security_group_egress_rule" "web_all_out" {
  security_group_id = aws_security_group.web.id
  description       = "Allow all outbound (updates, GitHub, RDS)"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

# --- Database tier (RDS) ---------------------------------------------
resource "aws_security_group" "db" {
  name        = "${var.project}-db-sg"
  description = "DocHub RDS - PostgreSQL from web-sg only"
  vpc_id      = aws_vpc.main.id
  tags        = { Name = "${var.project}-db-sg" }
}

resource "aws_vpc_security_group_ingress_rule" "db_from_web" {
  security_group_id            = aws_security_group.db.id
  description                  = "PostgreSQL from web tier only"
  referenced_security_group_id = aws_security_group.web.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_vpc_security_group_ingress_rule" "web_from_cloudfront" {
  security_group_id = aws_security_group.web.id
  description       = "AWS traffic from CloudFront only"
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
  ip_protocol       = "tcp"
  from_port         = 5000
  to_port           = 5000
}