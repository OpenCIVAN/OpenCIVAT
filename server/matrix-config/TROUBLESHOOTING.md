# Matrix Federation Troubleshooting Runbook

**Version**: 1.0
**Last Updated**: 2026-01-13

---

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Connection Issues](#connection-issues)
3. [Message Sync Problems](#message-sync-problems)
4. [Circuit Breaker Issues](#circuit-breaker-issues)
5. [Database Problems](#database-problems)
6. [Performance Issues](#performance-issues)
7. [Federation Failures](#federation-failures)
8. [Common Error Messages](#common-error-messages)
9. [Debugging Tools](#debugging-tools)
10. [Emergency Procedures](#emergency-procedures)

---

## Quick Diagnostics

### Health Check Commands

```bash
# 1. Check CIA Web service status
sudo systemctl status cia-web

# 2. Check Matrix bridge status
curl http://localhost:3000/api/matrix/status | jq

# 3. Check Synapse homeserver
curl http://localhost:8008/_matrix/client/versions

# 4. Check database connectivity
psql -U cia_user -d cia_web -c "SELECT 1"

# 5. Check Redis
redis-cli ping  # Should return "PONG"

# 6. Check Docker containers
docker ps | grep synapse
```

### Quick Status Check Script

Create `/opt/cia-web/scripts/quick-check.sh`:

```bash
#!/bin/bash

echo "=== CIA Web Health Check ==="
echo ""

# CIA Web
echo -n "CIA Web Service: "
systemctl is-active cia-web

# Matrix Status
echo -n "Matrix Federation: "
curl -s http://localhost:3000/api/matrix/status | jq -r '.connected' | \
  awk '{if($1=="true") print "✓ Connected"; else print "✗ Disconnected"}'

# Circuit Breaker
echo -n "Circuit Breaker: "
curl -s http://localhost:3000/api/matrix/status | jq -r '.circuitBreaker.state'

# Retry Queue
echo -n "Retry Queue Size: "
curl -s http://localhost:3000/api/matrix/status | jq -r '.retryQueue.size'

# Synapse
echo -n "Synapse Homeserver: "
curl -s http://localhost:8008/_matrix/client/versions > /dev/null 2>&1 && \
  echo "✓ Running" || echo "✗ Down"

# Database
echo -n "PostgreSQL: "
psql -U cia_user -d cia_web -c "SELECT 1" > /dev/null 2>&1 && \
  echo "✓ Connected" || echo "✗ Connection Failed"

# Redis
echo -n "Redis: "
redis-cli ping > /dev/null 2>&1 && \
  echo "✓ Running" || echo "✗ Down"

echo ""
echo "=== Recent Errors (last 10) ==="
sudo journalctl -u cia-web -p err -n 10 --no-pager
```

---

## Connection Issues

### Issue: Matrix Bridge Not Connecting

**Symptoms**:
- `connected: false` in status endpoint
- Log message: "Failed to initialize Matrix bridge"
- Circuit breaker stuck in OPEN state

**Diagnosis**:

```bash
# Check Synapse is running
docker ps | grep synapse

# Check Synapse logs
docker logs synapse | tail -50

# Test Matrix homeserver connectivity
curl -v http://localhost:8008/_matrix/client/versions

# Check application service registration
docker exec synapse cat /data/cia-bridge-registration.yaml
```

**Common Causes**:

1. **Synapse not running**
   ```bash
   # Solution: Start Synapse
   cd /opt/cia-web/server/matrix-config
   docker-compose up -d synapse
   ```

2. **Wrong AS token**
   ```bash
   # Verify tokens match
   grep MATRIX_AS_TOKEN /opt/cia-web/server/.env
   docker exec synapse grep as_token /data/cia-bridge-registration.yaml

   # If different, update and restart
   sudo systemctl restart cia-web
   ```

3. **Synapse not ready**
   ```bash
   # Wait for Synapse to finish initializing
   docker logs synapse | grep "Synapse now listening"

   # Restart CIA Web after Synapse is ready
   sudo systemctl restart cia-web
   ```

4. **Network connectivity**
   ```bash
   # Test from CIA Web container
   curl http://host.docker.internal:3000/health

   # Check Docker networking
   docker network inspect matrix-config_matrix-net
   ```

**Solution Steps**:

```bash
# 1. Stop services
sudo systemctl stop cia-web
docker-compose -f /opt/cia-web/server/matrix-config/docker-compose.yml down

# 2. Verify configuration
diff /opt/cia-web/server/.env /opt/cia-web/server/matrix-config/cia-bridge-registration.yaml

# 3. Start Synapse first
docker-compose -f /opt/cia-web/server/matrix-config/docker-compose.yml up -d

# 4. Wait for Synapse to be ready (check logs)
docker logs -f synapse

# 5. Start CIA Web
sudo systemctl start cia-web

# 6. Verify connection
curl http://localhost:3000/api/matrix/status | jq '.connected'
```

---

### Issue: Synapse Database Connection Failed

**Symptoms**:
- Synapse logs: "could not connect to database"
- Container exits immediately

**Diagnosis**:

```bash
# Check Synapse logs
docker logs synapse

# Test database connectivity from host
psql -U synapse_user -d synapse -c "SELECT 1"

# Check if Synapse can reach database
docker exec synapse psql -U synapse_user -h host.docker.internal -d synapse -c "SELECT 1"
```

**Solutions**:

```bash
# 1. Check PostgreSQL is running
sudo systemctl status postgresql

# 2. Verify database exists
sudo -u postgres psql -c "\l" | grep synapse

# 3. Test credentials
psql -U synapse_user -d synapse -h localhost

# 4. Check pg_hba.conf allows connections from Docker
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host synapse synapse_user 172.17.0.0/16 scram-sha-256

# 5. Restart PostgreSQL
sudo systemctl restart postgresql

# 6. Restart Synapse
docker-compose -f /opt/cia-web/server/matrix-config/docker-compose.yml restart
```

---

## Message Sync Problems

### Issue: Messages Not Syncing to Matrix

**Symptoms**:
- Messages appear in CIA Web chat
- Messages don't appear in Matrix clients (Element, etc.)
- No errors in logs

**Diagnosis**:

```bash
# Check bridge status
curl http://localhost:3000/api/matrix/status | jq

# Check recent chat messages
psql -U cia_user -d cia_web -c "
SELECT id, message, matrix_event_id, federation_source
FROM chat_messages
ORDER BY timestamp DESC
LIMIT 10;
"

# Check event log
psql -U cia_user -d cia_web -c "
SELECT matrix_event_id, direction, processed_at
FROM matrix_event_log
WHERE direction = 'outbound'
ORDER BY processed_at DESC
LIMIT 10;
"

# Check circuit breaker state
curl http://localhost:3000/api/matrix/status | jq '.circuitBreaker'
```

**Common Causes**:

1. **Circuit breaker is OPEN**
   ```bash
   # Check state
   curl http://localhost:3000/api/matrix/status | jq '.circuitBreaker.state'

   # If OPEN, wait for timeout (60 seconds) or restart service
   sudo systemctl restart cia-web
   ```

2. **No room mapping**
   ```bash
   # Check mappings
   psql -U cia_user -d cia_web -c "SELECT * FROM matrix_room_mappings;"

   # If empty, room wasn't created with federation
   # Solution: Create new room or manually create mapping
   ```

3. **Message in retry queue**
   ```bash
   # Check retry queue
   curl http://localhost:3000/api/matrix/status | jq '.retryQueue'

   # If size > 0, messages are queued for retry
   # Wait for automatic retry or restart to force immediate retry
   ```

**Solution Steps**:

```bash
# 1. Reset circuit breaker
sudo systemctl restart cia-web

# 2. Verify room has Matrix mapping
psql -U cia_user -d cia_web -c "
SELECT r.name, m.matrix_room_id, m.matrix_alias
FROM rooms r
LEFT JOIN matrix_room_mappings m ON r.id = m.cia_room_id::uuid
WHERE r.project_id = 'YOUR_PROJECT_ID';
"

# 3. Test message send
# Send a test message via CIA Web UI

# 4. Check Matrix event created
psql -U cia_user -d cia_web -c "
SELECT * FROM chat_messages WHERE matrix_event_id IS NOT NULL ORDER BY timestamp DESC LIMIT 1;
"

# 5. Verify message in Matrix
# Use Element or other Matrix client to check room
```

---

### Issue: Messages Not Syncing FROM Matrix

**Symptoms**:
- Messages sent in Matrix client (Element) don't appear in CIA Web
- Federated users' messages missing

**Diagnosis**:

```bash
# Check inbound events in log
psql -U cia_user -d cia_web -c "
SELECT matrix_event_id, matrix_user_id, processed_at
FROM matrix_event_log
WHERE direction = 'inbound'
ORDER BY processed_at DESC
LIMIT 10;
"

# Check if bridge is receiving events
sudo journalctl -u cia-web | grep "Received Matrix message"

# Check federated user cache
psql -U cia_user -d cia_web -c "SELECT * FROM federated_user_cache;"
```

**Common Causes**:

1. **Bridge not listening to room events**
   ```bash
   # Check if bridge joined Matrix room
   # In Element, check room members for @cia_bridge:matrix.yourcompany.com

   # Manually join bridge to room
   docker exec synapse register_new_matrix_user -u cia_bridge -p password -a
   ```

2. **Event deduplication issue**
   ```bash
   # Check if event was marked as duplicate
   psql -U cia_user -d cia_web -c "
   SELECT COUNT(*) FROM matrix_event_log WHERE direction = 'inbound';
   "

   # If count seems wrong, clear deduplication cache
   sudo systemctl restart cia-web
   ```

**Solution Steps**:

```bash
# 1. Verify bridge bot is in room
# Check Matrix room members

# 2. Check Matrix event listener is active
sudo journalctl -u cia-web | grep "setupEventListeners"

# 3. Restart CIA Web to reset event listeners
sudo systemctl restart cia-web

# 4. Test by sending message from Matrix

# 5. Check CIA Web logs for "Received Matrix message"
sudo journalctl -u cia-web -f
```

---

## Circuit Breaker Issues

### Issue: Circuit Breaker Stuck OPEN

**Symptoms**:
- All Matrix operations fail with "Circuit breaker is OPEN"
- Status shows circuit in OPEN state for extended period
- Synapse is actually running and healthy

**Diagnosis**:

```bash
# Check circuit breaker state and last change
curl http://localhost:3000/api/matrix/status | jq '.circuitBreaker'

# Check if Synapse is actually healthy
curl http://localhost:8008/_matrix/client/versions

# Check failure count
curl http://localhost:3000/api/matrix/status | jq '.circuitBreaker.failureCount'
```

**Solutions**:

```bash
# Option 1: Wait for timeout (60 seconds)
# Circuit will transition to HALF_OPEN automatically

# Option 2: Restart service (forces circuit CLOSED)
sudo systemctl restart cia-web

# Option 3: Fix underlying issue and wait for recovery
# - Fix Synapse if it's actually down
# - Wait for automatic retry
# - Monitor logs for successful operations
```

**Prevention**:

```javascript
// Adjust circuit breaker thresholds in matrixBridge.js
this.circuitBreaker = new CircuitBreaker({
  failureThreshold: 10,    // Increase threshold
  timeout: 30000,          // Reduce timeout
});
```

---

## Database Problems

### Issue: Matrix Tables Missing

**Symptoms**:
- Error: "relation 'matrix_room_mappings' does not exist"
- Federation features fail with database errors

**Diagnosis**:

```bash
# Check if Matrix tables exist
psql -U cia_user -d cia_web -c "\dt matrix_*"

# Check schema version
psql -U cia_user -d cia_web -c "SELECT * FROM server_instance;"
```

**Solution**:

```bash
# Run init script (includes Matrix schema)
psql -U cia_user -d cia_web -f /opt/cia-web/server/database/init.sql

# Or run migration
psql -U cia_user -d cia_web -f /opt/cia-web/server/database/migrations/010_matrix_federation.sql

# Verify tables created
psql -U cia_user -d cia_web -c "\dt matrix_*"
```

---

### Issue: Event Log Growing Too Large

**Symptoms**:
- `matrix_event_log` table has millions of rows
- Slow queries on event log
- High disk usage

**Diagnosis**:

```bash
# Check event log size
psql -U cia_user -d cia_web -c "
SELECT COUNT(*), pg_size_pretty(pg_total_relation_size('matrix_event_log'))
FROM matrix_event_log;
"

# Check oldest events
psql -U cia_user -d cia_web -c "
SELECT MIN(processed_at), MAX(processed_at)
FROM matrix_event_log;
"
```

**Solution**:

```bash
# Run cleanup function (deletes events older than 7 days)
psql -U cia_user -d cia_web -c "SELECT cleanup_matrix_event_log();"

# Manually delete old events
psql -U cia_user -d cia_web -c "
DELETE FROM matrix_event_log
WHERE processed_at < NOW() - INTERVAL '7 days';
"

# Set up automated cleanup (add to crontab)
echo "0 3 * * * psql -U cia_user -d cia_web -c 'SELECT cleanup_matrix_event_log();'" | crontab -
```

---

## Performance Issues

### Issue: High Memory Usage

**Symptoms**:
- CIA Web process using > 2GB RAM
- OOM (Out of Memory) errors
- Server slowness

**Diagnosis**:

```bash
# Check CIA Web memory usage
ps aux | grep "node.*cia-web"

# Check retry queue size
curl http://localhost:3000/api/matrix/status | jq '.retryQueue.size'

# Check in-memory cache sizes
curl http://localhost:3000/api/matrix/status | jq '.processedEvents'
```

**Common Causes**:

1. **Large retry queue**
   ```bash
   # If queue > 100, circuit breaker might be failing
   # Clear queue by restarting
   sudo systemctl restart cia-web
   ```

2. **Memory leak in event cache**
   ```bash
   # Deduplication cache grows indefinitely
   # Fixed by restart (cache has TTL cleanup)
   sudo systemctl restart cia-web
   ```

**Solutions**:

```bash
# 1. Restart service
sudo systemctl restart cia-web

# 2. Tune Node.js memory limits
# Edit /etc/systemd/system/cia-web.service
Environment="NODE_OPTIONS=--max-old-space-size=2048"

# 3. Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart cia-web

# 4. Monitor memory usage
watch -n 5 'ps aux | grep "node.*cia-web"'
```

---

### Issue: Slow Message Delivery

**Symptoms**:
- Messages take > 5 seconds to appear in Matrix
- High latency between CIA Web and Matrix clients

**Diagnosis**:

```bash
# Check retry queue processing
curl http://localhost:3000/api/matrix/status | jq '.retryQueue'

# Check circuit breaker state
curl http://localhost:3000/api/matrix/status | jq '.circuitBreaker.state'

# Check database query performance
psql -U cia_user -d cia_web -c "
EXPLAIN ANALYZE
SELECT * FROM matrix_event_log
WHERE matrix_event_id = '$example_event_id';
"

# Check Synapse performance
docker stats synapse
```

**Solutions**:

```bash
# 1. Optimize database indexes
psql -U cia_user -d cia_web -c "
CREATE INDEX IF NOT EXISTS idx_matrix_event_log_event_id
ON matrix_event_log(matrix_event_id);
"

# 2. Tune PostgreSQL
# Edit /etc/postgresql/14/main/postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# 3. Restart PostgreSQL
sudo systemctl restart postgresql

# 4. Clear retry queue
sudo systemctl restart cia-web
```

---

## Federation Failures

### Issue: Can't Join External Matrix Rooms

**Symptoms**:
- Error: "Not allowed to join this room" (M_FORBIDDEN)
- Error: "Room not found" (M_NOT_FOUND)
- Join request times out

**Diagnosis**:

```bash
# Check federation connectivity
curl https://matrix.org/_matrix/federation/v1/version

# Test from Synapse
docker exec synapse curl https://matrix.org/_matrix/client/versions

# Check Synapse federation settings
docker exec synapse cat /data/homeserver.yaml | grep federation
```

**Common Causes**:

1. **Port 8448 not accessible**
   ```bash
   # Check firewall
   sudo ufw status | grep 8448

   # Open port if needed
   sudo ufw allow 8448/tcp
   ```

2. **SSL certificate issues**
   ```bash
   # Verify SSL cert for Matrix domain
   openssl s_client -connect matrix.yourcompany.com:8448 -servername matrix.yourcompany.com
   ```

3. **Federation disabled on Synapse**
   ```bash
   # Check homeserver.yaml
   docker exec synapse grep "federation_domain_whitelist" /data/homeserver.yaml

   # If empty or too restrictive, edit and restart
   ```

**Solutions**:

```bash
# 1. Verify federation is enabled
docker exec synapse cat /data/homeserver.yaml | grep -A 5 "federation"

# 2. Test federation with matrix.org
docker exec synapse /start.py test-federation matrix.org

# 3. Check DNS records
dig _matrix._tcp.matrix.yourcompany.com SRV

# 4. Restart Synapse after config changes
docker-compose -f /opt/cia-web/server/matrix-config/docker-compose.yml restart
```

---

## Common Error Messages

### "Circuit breaker is OPEN"

**Meaning**: Matrix API has failed multiple times, circuit breaker protecting system

**Action**:
```bash
# Check Synapse health
curl http://localhost:8008/_matrix/client/versions

# If healthy, wait 60 seconds for auto-recovery
# Or restart to force recovery
sudo systemctl restart cia-web
```

---

### "Matrix federation not available" (503)

**Meaning**: Bridge service not initialized or Synapse not reachable

**Action**:
```bash
# Check status
curl http://localhost:3000/api/matrix/status

# Check Synapse
docker ps | grep synapse

# Restart if needed
sudo systemctl restart cia-web
```

---

### "Rate limit exceeded" (429)

**Meaning**: User exceeded rate limit for directory search or room join

**Action**:
- Wait for rate limit window to expire (10s for search, 60s for join)
- Check if legitimate user or potential abuse
- Adjust rate limits if needed in code

---

### "relation 'matrix_room_mappings' does not exist"

**Meaning**: Matrix federation tables not created in database

**Action**:
```bash
# Run database init script
psql -U cia_user -d cia_web -f /opt/cia-web/server/database/init.sql
```

---

## Debugging Tools

### Enable Debug Logging

Edit `/opt/cia-web/server/.env`:

```bash
# Add debug logging
LOG_LEVEL=debug
DEBUG=matrix-bridge:*

# Restart
sudo systemctl restart cia-web
```

View debug logs:

```bash
sudo journalctl -u cia-web -f | grep matrix-bridge
```

---

### Database Inspection

```bash
# Check recent messages
psql -U cia_user -d cia_web -c "
SELECT id, username, substring(message, 1, 50) as message,
       matrix_event_id, federation_source, timestamp
FROM chat_messages
ORDER BY timestamp DESC
LIMIT 20;
"

# Check room mappings
psql -U cia_user -d cia_web -c "
SELECT cia_room_id, matrix_room_id, matrix_alias, status
FROM matrix_room_mappings;
"

# Check federated users
psql -U cia_user -d cia_web -c "
SELECT matrix_user_id, display_name, server_name, status, last_seen
FROM federated_user_cache
ORDER BY last_seen DESC;
"

# Check event log statistics
psql -U cia_user -d cia_web -c "
SELECT direction, COUNT(*) as count,
       MAX(processed_at) as latest,
       MIN(processed_at) as oldest
FROM matrix_event_log
GROUP BY direction;
"
```

---

### Network Debugging

```bash
# Test Matrix homeserver connectivity
curl -v http://localhost:8008/_matrix/client/versions

# Test federation endpoint
curl -v https://matrix.yourcompany.com/_matrix/federation/v1/version

# Check open connections
netstat -an | grep 8008

# Test DNS resolution
dig matrix.yourcompany.com
dig _matrix._tcp.matrix.yourcompany.com SRV
```

---

## Emergency Procedures

### Complete System Reset

**Use only if all else fails and data loss is acceptable**

```bash
# 1. Stop all services
sudo systemctl stop cia-web
docker-compose -f /opt/cia-web/server/matrix-config/docker-compose.yml down

# 2. Backup current state
pg_dump -U cia_user cia_web > /tmp/cia_web_backup.sql
cp -r /opt/cia-web/server/matrix-config/synapse-data /tmp/synapse-backup

# 3. Clear Matrix federation data (keeps CIA Web data)
psql -U cia_user -d cia_web -c "TRUNCATE matrix_room_mappings, matrix_event_log, federated_user_cache;"

# 4. Reset circuit breaker by restarting
sudo systemctl start cia-web

# 5. Restart Synapse
docker-compose -f /opt/cia-web/server/matrix-config/docker-compose.yml up -d

# 6. Verify federation working
curl http://localhost:3000/api/matrix/status
```

---

### Disable Federation Temporarily

```bash
# Edit .env
sudo nano /opt/cia-web/server/.env

# Set MATRIX_FEDERATION_ENABLED=false
MATRIX_FEDERATION_ENABLED=false

# Restart
sudo systemctl restart cia-web

# CIA Web continues working without federation
# Messages stay local only
```

---

## Getting Help

If issue persists after following this guide:

1. **Collect diagnostics**:
   ```bash
   /opt/cia-web/scripts/quick-check.sh > diagnostics.txt
   sudo journalctl -u cia-web --since "1 hour ago" >> diagnostics.txt
   docker logs synapse >> diagnostics.txt
   ```

2. **Check documentation**:
   - API docs: `API-DOCUMENTATION.md`
   - Deployment guide: `DEPLOYMENT-GUIDE.md`
   - Phase docs: `PHASE1-COMPLETE.md` through `PHASE8-COMPLETE.md`

3. **Contact support**:
   - GitHub Issues: https://github.com/your-org/cia-web/issues
   - Email: support@yourcompany.com
   - Include diagnostics.txt

---

**Document Version**: 1.0
**Last Updated**: 2026-01-13
**Maintainer**: DevOps Team
