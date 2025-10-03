# Deployment Guide - Rust Backend

## Production Deployment

### Building for Production

1. **Build optimized binary:**
   ```bash
   cargo build --release
   ```

2. **Binary location:**
   ```
   target/release/raddle-server
   ```

3. **Binary size:** ~15-20 MB (includes all dependencies)

### Deployment Options

## Option 1: Direct Binary Deployment

### Prerequisites
- Linux server (x86_64 or ARM64)
- No Rust required on server!
- PostgreSQL (recommended) or SQLite

### Steps

1. **Build on your machine:**
   ```bash
   cargo build --release
   ```

2. **Copy binary to server:**
   ```bash
   scp target/release/raddle-server user@server:/opt/raddle/
   ```

3. **Copy static files:**
   ```bash
   scp -r ../static user@server:/opt/raddle/
   ```

4. **Create .env on server:**
   ```bash
   ssh user@server
   cd /opt/raddle
   cat > .env << EOF
   ADMIN_PASSWORD=your_secure_password
   DATABASE_URL=postgresql://user:pass@localhost/raddle
   RADDLE_HOST=0.0.0.0
   RADDLE_PORT=9001
   RUST_LOG=info
   EOF
   ```

5. **Run the server:**
   ```bash
   ./raddle-server
   ```

### Systemd Service

Create `/etc/systemd/system/raddle-rust.service`:

```ini
[Unit]
Description=Raddle Teams Rust Backend
After=network.target postgresql.service

[Service]
Type=simple
User=raddle
WorkingDirectory=/opt/raddle
EnvironmentFile=/opt/raddle/.env
ExecStart=/opt/raddle/raddle-server
Restart=always
RestartSec=10

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/raddle/databases /opt/raddle/logs

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable raddle-rust
sudo systemctl start raddle-rust
sudo systemctl status raddle-rust
```

## Option 2: Docker Deployment

### Dockerfile

Create `Dockerfile` in `backend-rust/`:

```dockerfile
# Build stage
FROM rust:1.75-slim as builder

WORKDIR /app

# Copy manifests
COPY Cargo.toml Cargo.lock ./
COPY cli ./cli
COPY src ./src

# Build release binary
RUN cargo build --release --bin raddle-server

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/raddle-server .

# Copy static files (must be built first)
COPY ../static ./static

# Create directories
RUN mkdir -p databases logs

# Expose port
EXPOSE 9001

# Run server
CMD ["./raddle-server"]
```

### Build and Run

```bash
# Build image
docker build -t raddle-rust:latest .

# Run container
docker run -d \
  --name raddle-rust \
  -p 9001:9001 \
  -e ADMIN_PASSWORD=your_password \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  -v /opt/raddle/databases:/app/databases \
  -v /opt/raddle/logs:/app/logs \
  raddle-rust:latest
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: raddle_teams
      POSTGRES_USER: raddle
      POSTGRES_PASSWORD: your_db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U raddle"]
      interval: 5s
      timeout: 5s
      retries: 5

  raddle-rust:
    build: .
    ports:
      - "9001:9001"
    environment:
      ADMIN_PASSWORD: your_admin_password
      DATABASE_URL: postgresql://raddle:your_db_password@postgres/raddle_teams
      RADDLE_HOST: 0.0.0.0
      RADDLE_PORT: 9001
      RUST_LOG: info
    volumes:
      - ./logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  postgres_data:
```

Run with:
```bash
docker-compose up -d
```

## Option 3: Cloud Deployment

### Fly.io

1. **Install flyctl:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create fly.toml:**
   ```toml
   app = "raddle-rust"
   primary_region = "iad"

   [build]
   dockerfile = "Dockerfile"

   [env]
   RADDLE_HOST = "0.0.0.0"
   RADDLE_PORT = "8080"
   RUST_LOG = "info"

   [[services]]
   http_checks = []
   internal_port = 8080
   processes = ["app"]
   protocol = "tcp"

   [[services.ports]]
   handlers = ["http"]
   port = 80
   force_https = true

   [[services.ports]]
   handlers = ["tls", "http"]
   port = 443

   [services.concurrency]
   type = "connections"
   hard_limit = 1000
   soft_limit = 500
   ```

3. **Deploy:**
   ```bash
   fly launch
   fly secrets set ADMIN_PASSWORD=your_password
   fly secrets set DATABASE_URL=your_postgres_url
   fly deploy
   ```

### Railway

1. **Create railway.json:**
   ```json
   {
     "build": {
       "builder": "DOCKERFILE",
       "dockerfilePath": "backend-rust/Dockerfile"
     },
     "deploy": {
       "startCommand": "./raddle-server",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

2. **Deploy:**
   ```bash
   railway login
   railway link
   railway up
   ```

### DigitalOcean App Platform

1. Create app.yaml:
   ```yaml
   name: raddle-rust
   services:
   - name: api
     dockerfile_path: backend-rust/Dockerfile
     github:
       repo: your-org/raddle-teams
       branch: main
     envs:
     - key: ADMIN_PASSWORD
       scope: RUN_TIME
       value: ${ADMIN_PASSWORD}
     - key: DATABASE_URL
       scope: RUN_TIME
       value: ${DATABASE_URL}
     http_port: 9001
     instance_count: 2
     instance_size_slug: basic-xxs
   databases:
   - name: postgres
     engine: PG
     version: "16"
   ```

## Reverse Proxy Setup

### Nginx

```nginx
upstream raddle_rust {
    server 127.0.0.1:9001;
}

server {
    listen 80;
    server_name raddle.example.com;

    location / {
        proxy_pass http://raddle_rust;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy

```
raddle.example.com {
    reverse_proxy localhost:9001
}
```

## Database Setup

### PostgreSQL (Recommended for Production)

1. **Create database:**
   ```bash
   psql -U postgres
   CREATE DATABASE raddle_teams;
   CREATE USER raddle WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE raddle_teams TO raddle;
   ```

2. **Connection string:**
   ```env
   DATABASE_URL=postgresql://raddle:secure_password@localhost/raddle_teams
   ```

### Connection Pooling

For high traffic, consider using PgBouncer:

```bash
# Install PgBouncer
apt-get install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
raddle_teams = host=localhost port=5432 dbname=raddle_teams

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

Update DATABASE_URL:
```env
DATABASE_URL=postgresql://raddle:pass@localhost:6432/raddle_teams
```

## Monitoring

### Logging

Logs are written to:
- Console (stdout/stderr)
- File: `logs/server_TIMESTAMP.log` (JSON format)

Use log aggregation tools:
- **Loki** (Grafana)
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **CloudWatch Logs** (AWS)
- **Papertrail**

### Metrics

Consider adding metrics:
- **Prometheus** + **Grafana**
- **DataDog**
- **New Relic**

Add to Cargo.toml:
```toml
metrics = "0.22"
metrics-exporter-prometheus = "0.13"
```

### Health Checks

Add health check endpoint (in main.rs):
```rust
app = app.route("/health", get(|| async { "OK" }));
```

## Performance Tuning

### Environment Variables

```env
# Increase connection pool
MAX_CONNECTIONS=100

# Adjust for your workload
RUST_LOG=info  # Use warn in production for less overhead
```

### System Settings

Increase file descriptor limits:
```bash
# /etc/security/limits.conf
raddle soft nofile 65536
raddle hard nofile 65536
```

### Database Tuning

PostgreSQL configuration:
```
# postgresql.conf
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

## Security Checklist

- [ ] Use strong ADMIN_PASSWORD
- [ ] Use HTTPS/WSS in production
- [ ] Enable firewall (ufw/iptables)
- [ ] Regular security updates
- [ ] Use secrets management (Vault, AWS Secrets Manager)
- [ ] Enable database SSL
- [ ] Rate limiting at reverse proxy
- [ ] Regular backups
- [ ] Monitor logs for suspicious activity

## Backup Strategy

### Database Backups

```bash
# Automated PostgreSQL backup
pg_dump -U raddle raddle_teams | gzip > backup_$(date +%Y%m%d).sql.gz

# Cron job for daily backups
0 2 * * * /usr/local/bin/backup-raddle.sh
```

### Application Backups

- Static files
- Configuration files (.env)
- Logs (optional, for debugging)

## Rollback Procedure

If issues occur:

1. **Stop new backend:**
   ```bash
   systemctl stop raddle-rust
   ```

2. **Start Python backend:**
   ```bash
   systemctl start raddle-python
   ```

3. **Update reverse proxy** to route to Python backend

4. **Investigate issues** in logs

5. **Fix and redeploy** Rust backend

## Zero-Downtime Deployment

Use blue-green deployment:

1. Deploy new version on port 9002
2. Health check new version
3. Update load balancer to route to 9002
4. Wait for connections to drain from 9001
5. Stop old version
6. Next deployment uses 9001

## Cost Comparison

| Deployment | Specs | Cost/Month |
|------------|-------|------------|
| VPS (Hetzner) | 2 vCPU, 4GB RAM | $5-10 |
| DigitalOcean | Basic Droplet | $12 |
| Fly.io | Shared CPU | $3-10 |
| Railway | Starter | $5-20 |
| AWS ECS | t3.micro | $10-20 |

Rust's low resource usage means you can run on smaller/cheaper instances compared to Python.

## Troubleshooting Production

### High CPU Usage

- Check RUST_LOG level (use warn or error)
- Profile with `perf` or `flamegraph`
- Increase instance size

### High Memory Usage

- Check connection pool size
- Monitor WebSocket connections
- Look for memory leaks (unlikely in Rust)

### Slow Database Queries

- Enable query logging
- Add indexes
- Use EXPLAIN ANALYZE
- Consider read replicas

### Connection Issues

- Check firewall rules
- Verify DNS resolution
- Test with curl/wscat
- Check load balancer health checks

## Support

For issues:
1. Check logs: `journalctl -u raddle-rust -f`
2. Review [GETTING_STARTED.md](GETTING_STARTED.md)
3. Check GitHub issues
4. Contact maintainers
