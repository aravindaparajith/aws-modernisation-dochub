FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first so this layer is cached when only code changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the app code (filtered by .dockerignore)
COPY . .

# Run as a non-root user
RUN useradd --create-home appuser \
    && mkdir -p uploads \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

CMD ["gunicorn", "--workers", "2", "--threads", "4", "--timeout", "60", \
     "--access-logfile", "-", "-b", "0.0.0.0:5000", "app:app"]