data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

# --- IAM role for the EC2 instance ------------------------------------
resource "aws_iam_role" "web" {
  name = "${var.project}-web-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "read_db_param" {
  name = "read-db-url"
  role = aws_iam_role.web.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameter"]
      Resource = aws_ssm_parameter.database_url.arn
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "*"
        Condition = {
          StringEquals = { "kms.ViaService" = "ssm.${var.region}.amazonaws.com" }
        }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.web.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "web" {
  name = "${var.project}-web-profile"
  role = aws_iam_role.web.name
}

# --- EC2 instance -----------------------------------------------------
resource "aws_instance" "web" {
  ami                    = data.aws_ssm_parameter.al2023.value
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.web.id]
  iam_instance_profile   = aws_iam_instance_profile.web.name
  key_name               = "dochub-key"

  user_data_replace_on_change = true
  user_data                   = <<-EOT
        #!/bin/bash
        set -euxo pipefail

        dnf install -y git python3.11 python3.11-pip postgresql16
        git clone https://github.com/aravindaparajith/aws-modernisation-dochub.git /opt/dochub
        cd /opt/dochub
        python3.11 -m venv .venv
        .venv/bin/pip install -r requirements.txt gunicorn

        DB_URL=$(aws ssm get-parameter --name "${aws_ssm_parameter.database_url.name}" \
            --with-decryption --query Parameter.Value --output text --region ${var.region})
        
        printf 'DATABASE_URL=%s\nUPLOAD_DIR=/opt/dochub/uploads\n' "$DB_URL" > .env
        chmod 600 .env
        mkdir -p uploads

        psql "$DB_URL" -f schema.sql
        chown -R ec2-user:ec2-user /opt/dochub

        cat > /etc/systemd/system/dochub.service <<'UNIT'
        [Unit]
        Description=DocHub Flask app
        After=network-online.target

        [Service]
        User=ec2-user
        WorkingDirectory=/opt/dochub
        ExecStart=/opt/dochub/.venv/bin/gunicorn -b 0.0.0.0:5000 app:app
        Restart=always

        [Install]
        WantedBy=multi-user.target
        UNIT

        systemctl daemon-reload
        systemctl enable --now dochub
    EOT

  tags = { Name = "${var.project}-web" }
}