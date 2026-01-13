# Matrix Federation - Quick Start Guide

Get the Matrix homeserver running in 5 minutes.

## Prerequisites

- Docker Desktop installed and running
- Node.js installed (for token generation)
- CIA Web server code checked out

## Step-by-Step Setup

### 1. Generate Security Tokens

```bash
cd server/matrix-config
node generate-tokens.js
```

This will output three tokens:
- `MATRIX_REGISTRATION_SECRET`
- `MATRIX_AS_TOKEN`
- `MATRIX_HS_TOKEN`

**Save these tokens** - you'll need them in the next steps.

### 2. Create Environment File

Copy the example and add your tokens:

```bash
cd ..  # Back to server directory
cp .env.example .env
```

Edit `.env` and update these lines with the tokens from step 1:

```bash
MATRIX_REGISTRATION_SECRET="<your-registration-secret>"
MATRIX_AS_TOKEN="<your-as-token>"
MATRIX_HS_TOKEN="<your-hs-token>"
MATRIX_POSTGRES_PASSWORD="your-secure-password"
```

### 3. Update Configuration Files

#### Edit `matrix-config/homeserver.yaml`

Find line 71 and replace the placeholder:

```yaml
registration_shared_secret: "your-actual-registration-secret-from-step-1"
```

#### Edit `matrix-config/cia-bridge-registration.yaml`

Replace the placeholders on lines 16 and 20:

```yaml
as_token: "your-actual-as-token-from-step-1"
hs_token: "your-actual-hs-token-from-step-1"
```

### 4. Start Matrix Infrastructure

```bash
docker-compose -f docker-compose.matrix.yml up -d
```

This starts:
- Synapse Matrix homeserver (port 8008)
- PostgreSQL database (port 5433)
- Redis cache

### 5. Wait for Startup

Give it 30-60 seconds for all containers to initialize.

### 6. Test the Setup

```bash
cd matrix-config
./test-synapse.sh
```

All tests should pass. If any fail, check the logs:

```bash
docker-compose -f docker-compose.matrix.yml logs -f synapse
```

### 7. Create Admin User

```bash
docker exec -it cia_matrix_synapse \
  register_new_matrix_user \
  -c /data/homeserver.yaml \
  -a \
  http://localhost:8008
```

Follow the prompts to create your admin username and password.

### 8. Verify with Health Check

```bash
curl http://localhost:8008/health
```

Expected response: `{"status":"OK"}`

## What's Running?

After setup, you have:

- **Synapse homeserver** at `http://localhost:8008`
  - Client-Server API for Matrix clients
  - Federation API for server-to-server communication

- **PostgreSQL** at `localhost:5433`
  - Stores all Matrix data (rooms, messages, users)

- **Redis** (internal)
  - Caching and worker support

## Testing with Element Client

1. Download Element from https://element.io
2. Click "Edit" when selecting homeserver
3. Enter homeserver URL: `http://localhost:8008`
4. Login with the admin user you created

## Next: Build the Bridge

Phase 1 (Infrastructure) is complete!

Next steps:
1. Implement Matrix bridge service (`server/src/services/matrixBridge.js`)
2. Connect Y.js chat to Matrix federation
3. Test bidirectional message sync

See the full plan in `/Users/innominata/.claude/plans/effervescent-mixing-ocean.md`

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose -f docker-compose.matrix.yml logs synapse

# Common fix: restart all containers
docker-compose -f docker-compose.matrix.yml restart
```

### Port already in use

```bash
# Check what's using port 8008
lsof -i :8008

# Either stop the other service or change ports in docker-compose.matrix.yml
```

### Database locale error

```bash
# Clean restart
docker-compose -f docker-compose.matrix.yml down -v
docker-compose -f docker-compose.matrix.yml up -d
```

### Can't connect to bridge

Make sure the URL in `cia-bridge-registration.yaml` matches your setup:
- **Mac/Windows**: `http://host.docker.internal:3000`
- **Linux**: `http://172.17.0.1:3000`

## Useful Commands

```bash
# View all logs
docker-compose -f docker-compose.matrix.yml logs -f

# Restart a specific service
docker-compose -f docker-compose.matrix.yml restart synapse

# Stop everything
docker-compose -f docker-compose.matrix.yml down

# Stop and remove volumes (clean slate)
docker-compose -f docker-compose.matrix.yml down -v

# Check container status
docker-compose -f docker-compose.matrix.yml ps

# Access Synapse container
docker exec -it cia_matrix_synapse bash

# Access PostgreSQL
docker exec -it cia_matrix_postgres psql -U synapse_user -d synapse
```

## Security Notes

This configuration is for **development only**.

For production, you must:
- Use HTTPS with valid certificates
- Change all default passwords
- Set up proper firewall rules
- Enable additional security features
- Use secrets management

See `README.md` for production considerations.

## Getting Help

- View logs: `docker-compose -f docker-compose.matrix.yml logs`
- Test infrastructure: `./test-synapse.sh`
- Full documentation: `README.md`
- Matrix docs: https://matrix-org.github.io/synapse/latest/
