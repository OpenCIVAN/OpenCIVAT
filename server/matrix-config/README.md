# Matrix Federation Infrastructure

This directory contains configuration files for the Synapse Matrix homeserver that enables federated chat for CIA Web.

## Architecture Overview

```
CIA Web Client (Y.js)
    ↓
Y.js WebSocket Server
    ↓
Matrix Bridge Service ← → Synapse Homeserver
    ↓
PostgreSQL (Source of Truth)
```

## Files in This Directory

- **`homeserver.yaml`** - Main Synapse configuration file
- **`cia-bridge-registration.yaml`** - Application service registration for CIA Web bridge
- **`init-synapse-db.sql`** - PostgreSQL initialization script
- **`log.config`** - Synapse logging configuration

## Setup Instructions

### 1. Generate Security Tokens

Before starting Synapse, you must generate secure random tokens. Run these commands:

```bash
# Generate registration shared secret (for creating initial users)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate AS token (Synapse -> Bridge)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate HS token (Bridge -> Synapse)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Update Configuration Files

#### `homeserver.yaml` (line 71)
Replace `CHANGE_ME_registration_secret_64_chars_long_random_string_here` with the registration shared secret.

#### `cia-bridge-registration.yaml` (lines 16 and 20)
- Replace `as_token` with the AS token
- Replace `hs_token` with the HS token

### 3. Set Environment Variables

Create or update `.env` in the server directory:

```bash
# Matrix Configuration
MATRIX_SERVER_NAME=matrix.cia-web.local
MATRIX_POSTGRES_PASSWORD=your-secure-password-here

# Matrix Bridge Tokens (same as in cia-bridge-registration.yaml)
MATRIX_AS_TOKEN=your-as-token-here
MATRIX_HS_TOKEN=your-hs-token-here
```

### 4. Generate Signing Key

Synapse needs a signing key for federation. This will be auto-generated on first run, or you can pre-generate it:

```bash
docker run --rm \
  -v $(pwd)/matrix-data:/data \
  matrixdotorg/synapse:v1.97.0 \
  generate-keys \
  -c /data/homeserver.yaml
```

### 5. Start the Matrix Infrastructure

```bash
# Start Synapse, PostgreSQL, and Redis
docker-compose -f docker-compose.matrix.yml up -d

# Check logs
docker-compose -f docker-compose.matrix.yml logs -f synapse

# Check health
curl http://localhost:8008/health
```

### 6. Create Initial Admin User

After Synapse is running, create an admin user:

```bash
docker exec -it cia_matrix_synapse \
  register_new_matrix_user \
  -c /data/homeserver.yaml \
  -a \
  http://localhost:8008
```

Follow the prompts to create username and password.

## Verification

### Test Synapse is Running

```bash
# Health check
curl http://localhost:8008/health
# Expected: {"status": "OK"}

# Server version
curl http://localhost:8008/_matrix/federation/v1/version
# Expected: {"server": {"name": "Synapse", "version": "1.97.0"}}
```

### Test Federation

```bash
# Check well-known (used for federation discovery)
curl http://matrix.cia-web.local:8008/.well-known/matrix/server
```

### View Logs

```bash
# All logs
docker-compose -f docker-compose.matrix.yml logs -f

# Synapse only
docker-compose -f docker-compose.matrix.yml logs -f synapse

# PostgreSQL only
docker-compose -f docker-compose.matrix.yml logs -f matrix_postgres
```

## Troubleshooting

### "Database locale is not C"

If you see this error, the database was created with wrong locale. Fix:

```bash
# Stop containers
docker-compose -f docker-compose.matrix.yml down

# Remove volume
docker volume rm cia_matrix_postgres_data

# Start again (init script will run)
docker-compose -f docker-compose.matrix.yml up -d
```

### "Application service not reachable"

The bridge URL in `cia-bridge-registration.yaml` must point to CIA Web server. For Docker on Mac/Windows:

```yaml
url: "http://host.docker.internal:3000"
```

For Linux:

```yaml
url: "http://172.17.0.1:3000"  # Docker bridge network
```

### Port Conflicts

If ports 8008 or 5433 are already in use:

```bash
# Check what's using the port
lsof -i :8008
lsof -i :5433

# Stop conflicting service or change ports in docker-compose.matrix.yml
```

## Security Considerations

### Development vs Production

**Development** (current configuration):
- `federation_verify_certificates: true` (but using `http://`)
- No TLS on client-server API
- Default passwords in comments

**Production** requirements:
1. Use HTTPS with valid certificates
2. Change all default passwords
3. Enable firewall rules
4. Use environment variables for secrets
5. Enable rate limiting (already configured)
6. Set up monitoring

### Network Configuration

Current setup uses:
- `8008` - HTTP client-server API (should be HTTPS in production)
- `8448` - Federation API (should be HTTPS in production)
- `5433` - PostgreSQL (should not be exposed in production)

## Next Steps

After infrastructure is running, proceed to **Phase 2: Bridge Service Core**:

1. Create `server/src/services/matrixBridge.js` - Core bridge logic
2. Create `server/src/services/matrixUserResolver.js` - User resolution
3. Modify `server/src/index.js` - Initialize bridge service
4. Test bidirectional message sync

## Resources

- [Synapse Documentation](https://matrix-org.github.io/synapse/latest/)
- [Matrix Specification](https://spec.matrix.org/)
- [Application Service API](https://spec.matrix.org/latest/application-service-api/)
- [Federation API](https://spec.matrix.org/latest/server-server-api/)
