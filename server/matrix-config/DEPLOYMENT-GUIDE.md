# Matrix Federation Deployment Guide

**Version**: 1.0
**Target Audience**: System administrators, DevOps engineers
**Difficulty**: Intermediate to Advanced

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Installation Steps](#installation-steps)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Synapse Homeserver Setup](#synapse-homeserver-setup)
7. [CIA Web Configuration](#cia-web-configuration)
8. [Testing the Deployment](#testing-the-deployment)
9. [Production Hardening](#production-hardening)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Backup & Recovery](#backup--recovery)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4 GB | 8+ GB |
| **Disk** | 20 GB | 50+ GB SSD |
| **OS** | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| **Network** | 100 Mbps | 1 Gbps |

### Software Dependencies

- **Node.js**: v18.x or higher
- **PostgreSQL**: v14.x or higher
- **Redis**: v6.x or higher (for BullMQ)
- **Docker**: v20.x or higher (for Synapse)
- **nginx**: v1.18+ (reverse proxy)

### Domain Requirements

- **Primary domain**: `cia-web.yourcompany.com`
- **Matrix domain**: `matrix.yourcompany.com`
- **SSL certificates**: Required for both domains

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└──────────────┬──────────────────────────────┬───────────────┘
               │                               │
               │ HTTPS                         │ HTTPS/Matrix Protocol
               ▼                               ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│   nginx Reverse Proxy    │      │  External Matrix Servers │
│  (SSL Termination)       │      │  (matrix.org, etc.)      │
└──────────────┬───────────┘      └─────────────┬────────────┘
               │                                  │
               │                                  │
┌──────────────▼───────────┐                     │
│    CIA Web Server        │                     │
│  (Node.js/Express)       │                     │
│                          │                     │
│  ┌────────────────────┐  │                     │
│  │  Matrix Bridge     │  │◄────────────────────┘
│  │  Service           │  │
│  └────────┬───────────┘  │
│           │              │
│  ┌────────▼───────────┐  │
│  │  Y.js Persistence  │  │
│  └────────┬───────────┘  │
└───────────┼──────────────┘
            │
            │
┌───────────▼──────────────────────────────┐
│         PostgreSQL Database              │
│  - CIA Web data                          │
│  - Matrix room mappings                  │
│  - Federated user cache                  │
└──────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│   Synapse Homeserver (Docker)           │
│  - Matrix Protocol server                │
│  - Federation with external servers      │
│  - Application Service (CIA Bridge)      │
└─────────────────────────────────────────┘
```

---

## Installation Steps

### Step 1: System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Step 2: Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x
```

### Step 3: Install PostgreSQL

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Install PostgreSQL 14
sudo apt install -y postgresql-14 postgresql-contrib-14

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 4: Install Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis for production
sudo sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
sudo sed -i 's/# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sudo sed -i 's/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

# Restart Redis
sudo systemctl restart redis
sudo systemctl enable redis
```

### Step 5: Clone CIA Web Repository

```bash
# Create application directory
sudo mkdir -p /opt/cia-web
sudo chown $USER:$USER /opt/cia-web

# Clone repository
cd /opt/cia-web
git clone https://github.com/your-org/cia-web.git .

# Install dependencies
cd server
npm install --production
```

---

## Configuration

### Environment Variables

Create `/opt/cia-web/server/.env`:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://cia_user:secure_password@localhost:5432/cia_web
PGHOST=localhost
PGPORT=5432
PGDATABASE=cia_web
PGUSER=cia_user
PGPASSWORD=secure_password

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=your-very-long-secure-secret-key-change-this
JWT_EXPIRY=24h

# Matrix Federation Configuration
MATRIX_FEDERATION_ENABLED=true
MATRIX_HOMESERVER_URL=http://localhost:8008
MATRIX_SERVER_NAME=matrix.yourcompany.com
MATRIX_AS_TOKEN=your-application-service-token-change-this
MATRIX_HS_TOKEN=your-homeserver-token-change-this
MATRIX_SENDER_LOCALPART=cia_bridge

# Storage (MinIO)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=cia-web-files

# Application
BASE_URL=https://cia-web.yourcompany.com
MATRIX_BASE_URL=https://matrix.yourcompany.com
```

**Security Notes**:
- Change all default passwords and tokens
- Use strong, randomly generated values
- Never commit `.env` to version control
- Restrict file permissions: `chmod 600 .env`

---

## Database Setup

### Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL console:
CREATE USER cia_user WITH PASSWORD 'secure_password';
CREATE DATABASE cia_web OWNER cia_user;
GRANT ALL PRIVILEGES ON DATABASE cia_web TO cia_user;

# Exit PostgreSQL
\q
```

### Run Migrations

```bash
cd /opt/cia-web/server

# Run database initialization
psql -U cia_user -d cia_web -f database/init.sql

# Verify tables created
psql -U cia_user -d cia_web -c "\dt"

# Expected output should include:
# - matrix_room_mappings
# - matrix_event_log
# - federated_user_cache
# - chat_messages (with Matrix columns)
```

### Verify Matrix Schema

```bash
# Check Matrix-specific tables
psql -U cia_user -d cia_web -c "
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE 'matrix_%'
  AND table_schema = 'public'
ORDER BY table_name;
"

# Should return:
# matrix_event_log
# matrix_room_mappings
```

---

## Synapse Homeserver Setup

### Step 1: Generate Synapse Configuration

```bash
cd /opt/cia-web/server/matrix-config

# Create Synapse data directory
mkdir -p synapse-data

# Generate config
docker run -it --rm \
  -v $(pwd)/synapse-data:/data \
  -e SYNAPSE_SERVER_NAME=matrix.yourcompany.com \
  -e SYNAPSE_REPORT_STATS=no \
  matrixdotorg/synapse:v1.97.0 generate
```

### Step 2: Configure Application Service

Create `/opt/cia-web/server/matrix-config/cia-bridge-registration.yaml`:

```yaml
# Application Service Registration for CIA Web Bridge
id: cia-web-bridge
url: http://host.docker.internal:3000
as_token: your-application-service-token-change-this
hs_token: your-homeserver-token-change-this
sender_localpart: cia_bridge

namespaces:
  users:
    - exclusive: true
      regex: "@cia_.*:matrix.yourcompany.com"
  aliases:
    - exclusive: true
      regex: "#cia_.*:matrix.yourcompany.com"
  rooms: []

rate_limited: false
```

**Important**:
- `as_token` and `hs_token` must match `.env` values
- Change default tokens to secure random strings
- Use `openssl rand -hex 32` to generate tokens

### Step 3: Update Synapse Configuration

Edit `/opt/cia-web/server/matrix-config/synapse-data/homeserver.yaml`:

```yaml
# Server name (must match MATRIX_SERVER_NAME in .env)
server_name: "matrix.yourcompany.com"

# Public baseurl
public_baseurl: https://matrix.yourcompany.com/

# Registration
enable_registration: false
enable_registration_without_verification: false

# Federation
federation_domain_whitelist:
  - matrix.org
  - mozilla.org
  # Add other trusted servers

# Application services
app_service_config_files:
  - /data/cia-bridge-registration.yaml

# Database (PostgreSQL for production)
database:
  name: psycopg2
  args:
    user: synapse_user
    password: synapse_password
    database: synapse
    host: host.docker.internal
    port: 5432
    cp_min: 5
    cp_max: 10

# Logging
log_config: "/data/log.config"

# Media storage
media_store_path: "/data/media_store"
max_upload_size: "50M"

# Rate limiting
rc_message:
  per_second: 10
  burst_count: 50

rc_login:
  address:
    per_second: 1
    burst_count: 3

# URL preview
url_preview_enabled: true
url_preview_ip_range_blacklist:
  - '127.0.0.0/8'
  - '10.0.0.0/8'
  - '172.16.0.0/12'
  - '192.168.0.0/16'

# Turn servers (optional, for VoIP)
# turn_uris: []
# turn_shared_secret: ""
```

### Step 4: Create Synapse Database

```bash
# Create Synapse database
sudo -u postgres psql -c "CREATE USER synapse_user WITH PASSWORD 'synapse_password';"
sudo -u postgres psql -c "CREATE DATABASE synapse ENCODING 'UTF8' LC_COLLATE='C' LC_CTYPE='C' TEMPLATE=template0 OWNER synapse_user;"
```

### Step 5: Start Synapse

Create `/opt/cia-web/server/matrix-config/docker-compose.yml`:

```yaml
version: '3.8'

services:
  synapse:
    image: matrixdotorg/synapse:v1.97.0
    container_name: synapse
    restart: unless-stopped
    ports:
      - "8008:8008"
      - "8448:8448"  # Federation port
    volumes:
      - ./synapse-data:/data
      - ./cia-bridge-registration.yaml:/data/cia-bridge-registration.yaml:ro
    environment:
      - SYNAPSE_SERVER_NAME=matrix.yourcompany.com
      - SYNAPSE_REPORT_STATS=no
      - UID=1000
      - GID=1000
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - matrix-net

networks:
  matrix-net:
    driver: bridge
```

Start Synapse:

```bash
cd /opt/cia-web/server/matrix-config
docker-compose up -d

# Check logs
docker-compose logs -f synapse

# Verify Synapse is running
curl http://localhost:8008/_matrix/client/versions
```

---

## CIA Web Configuration

### Step 1: Create SystemD Service

Create `/etc/systemd/system/cia-web.service`:

```ini
[Unit]
Description=CIA Web Collaborative Analytics Platform
After=network.target postgresql.service redis.service docker.service
Requires=postgresql.service redis.service

[Service]
Type=simple
User=cia-web
Group=cia-web
WorkingDirectory=/opt/cia-web/server
Environment="NODE_ENV=production"
EnvironmentFile=/opt/cia-web/server/.env
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cia-web

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/cia-web/server/logs

[Install]
WantedBy=multi-user.target
```

### Step 2: Create CIA Web User

```bash
# Create system user
sudo useradd -r -s /bin/false -d /opt/cia-web cia-web

# Set ownership
sudo chown -R cia-web:cia-web /opt/cia-web
```

### Step 3: Start CIA Web

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start cia-web

# Enable auto-start
sudo systemctl enable cia-web

# Check status
sudo systemctl status cia-web

# View logs
sudo journalctl -u cia-web -f
```

---

## Testing the Deployment

### 1. Test CIA Web Server

```bash
# Health check
curl http://localhost:3000/health

# Should return: { "status": "healthy", "timestamp": "..." }
```

### 2. Test Matrix Federation

```bash
# Check Matrix status
curl http://localhost:3000/api/matrix/status | jq

# Expected response:
# {
#   "enabled": true,
#   "initialized": true,
#   "connected": true,
#   "userId": "@cia_bridge:matrix.yourcompany.com",
#   ...
# }
```

### 3. Test Room Creation

```bash
# Create a test room (requires authentication)
curl -X POST http://localhost:3000/api/projects/test-project/rooms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Room",
    "description": "Testing Matrix federation"
  }'

# Verify Matrix room created
curl http://localhost:3000/api/matrix/status | jq '.roomMappings'
```

### 4. Test Federation

```bash
# Search for external rooms
curl "http://localhost:3000/api/matrix/directory/search?query=matrix&limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return list of public Matrix rooms
```

---

## Production Hardening

### 1. nginx Reverse Proxy

Create `/etc/nginx/sites-available/cia-web`:

```nginx
# CIA Web Application
server {
    listen 443 ssl http2;
    server_name cia-web.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/cia-web.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cia-web.yourcompany.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}

# Matrix Homeserver
server {
    listen 443 ssl http2;
    listen 8448 ssl http2;  # Matrix federation port
    server_name matrix.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/matrix.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/matrix.yourcompany.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Proxy to Synapse
    location / {
        proxy_pass http://localhost:8008;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }

    # Federation endpoint
    location /_matrix {
        proxy_pass http://localhost:8008;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

Enable the configuration:

```bash
sudo ln -s /etc/nginx/sites-available/cia-web /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. SSL Certificates

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d cia-web.yourcompany.com
sudo certbot --nginx -d matrix.yourcompany.com

# Auto-renewal
sudo certbot renew --dry-run
```

### 3. Firewall Configuration

```bash
# Install UFW
sudo apt install ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Matrix federation
sudo ufw allow 8448/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 4. PostgreSQL Hardening

Edit `/etc/postgresql/14/main/pg_hba.conf`:

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     peer
host    cia_web         cia_user        127.0.0.1/32           scram-sha-256
host    synapse         synapse_user    127.0.0.1/32           scram-sha-256
host    all             all             127.0.0.1/32           reject
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

---

## Monitoring & Maintenance

### 1. Log Rotation

Create `/etc/logrotate.d/cia-web`:

```
/opt/cia-web/server/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 cia-web cia-web
    sharedscripts
    postrotate
        systemctl reload cia-web > /dev/null 2>&1 || true
    endscript
}
```

### 2. Health Check Script

Create `/opt/cia-web/scripts/health-check.sh`:

```bash
#!/bin/bash

# CIA Web health check
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ $response -ne 200 ]; then
    echo "CIA Web health check failed: HTTP $response"
    systemctl restart cia-web
fi

# Matrix status check
status=$(curl -s http://localhost:3000/api/matrix/status | jq -r '.connected')
if [ "$status" != "true" ]; then
    echo "Matrix federation not connected"
    # Alert admin
fi
```

Add to cron:

```bash
# Edit crontab
crontab -e

# Add health check every 5 minutes
*/5 * * * * /opt/cia-web/scripts/health-check.sh
```

### 3. Monitoring Endpoints

- **CIA Web Health**: `GET /health`
- **Matrix Status**: `GET /api/matrix/status`
- **Synapse Health**: `GET https://matrix.yourcompany.com/_matrix/client/versions`

### 4. Log Monitoring

```bash
# CIA Web logs
sudo journalctl -u cia-web -f

# Synapse logs
docker logs -f synapse

# nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Backup & Recovery

### 1. Database Backup

Create `/opt/cia-web/scripts/backup-database.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/opt/cia-web/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup CIA Web database
pg_dump -U cia_user cia_web | gzip > $BACKUP_DIR/cia_web_$DATE.sql.gz

# Backup Synapse database
pg_dump -U synapse_user synapse | gzip > $BACKUP_DIR/synapse_$DATE.sql.gz

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Make executable and add to cron:

```bash
chmod +x /opt/cia-web/scripts/backup-database.sh

# Add to crontab (daily at 2 AM)
0 2 * * * /opt/cia-web/scripts/backup-database.sh
```

### 2. Configuration Backup

```bash
# Backup critical config files
tar -czf /opt/cia-web/backups/config_$(date +%Y%m%d).tar.gz \
  /opt/cia-web/server/.env \
  /opt/cia-web/server/matrix-config/ \
  /etc/nginx/sites-available/cia-web
```

### 3. Recovery Procedure

```bash
# Stop services
sudo systemctl stop cia-web
docker-compose -f /opt/cia-web/server/matrix-config/docker-compose.yml down

# Restore database
gunzip < cia_web_20260113.sql.gz | psql -U cia_user cia_web
gunzip < synapse_20260113.sql.gz | psql -U synapse_user synapse

# Restore configuration
tar -xzf config_20260113.tar.gz -C /

# Restart services
docker-compose -f /opt/cia-web/server/matrix-config/docker-compose.yml up -d
sudo systemctl start cia-web
```

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed troubleshooting guide.

**Common Issues**:
- Matrix bridge not connecting: Check AS token configuration
- Database connection errors: Verify PostgreSQL credentials
- SSL certificate errors: Ensure Certbot ran successfully
- High memory usage: Tune PostgreSQL and Redis memory limits

---

## Next Steps

After successful deployment:

1. ✅ Test all functionality (room creation, federation, search)
2. ✅ Configure monitoring and alerting
3. ✅ Set up regular backups
4. ✅ Review security settings
5. ✅ Train users on federation features
6. ✅ Plan capacity scaling

---

## Support & Resources

- **API Documentation**: `API-DOCUMENTATION.md`
- **Troubleshooting Guide**: `TROUBLESHOOTING.md`
- **Phase Documentation**: `PHASE1-COMPLETE.md` through `PHASE8-COMPLETE.md`
- **Matrix Documentation**: https://matrix.org/docs/
- **Synapse Admin Guide**: https://matrix-org.github.io/synapse/latest/

---

**Deployment Checklist**:
- [ ] System requirements met
- [ ] All dependencies installed
- [ ] Database initialized with Matrix schema
- [ ] Synapse configured and running
- [ ] CIA Web service running
- [ ] SSL certificates configured
- [ ] Firewall rules applied
- [ ] Monitoring configured
- [ ] Backups automated
- [ ] Testing completed
- [ ] Documentation reviewed
