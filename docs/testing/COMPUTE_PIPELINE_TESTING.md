# CIA Web Compute Pipeline - Testing Checklist

## Prerequisites

### Services Running

- [ ] Docker containers all healthy: `docker-compose ps`
- [ ] API responding: `curl http://localhost:3001/api/health`
- [ ] Redis running: `docker exec cia-redis redis-cli ping` → PONG
- [ ] VTK Worker running: `docker-compose logs vtk-worker --tail=5`
- [ ] Frontend running: `npm start`
- [ ] Browser console open (F12)

### Test File Ready

- [ ] Have a .vtp file loaded in the application (e.g., Skull.vtp, bunny.vtp)
- [ ] File appears in FilesTab
- [ ] Note the file ID for API testing (check Network tab or console)

---

## Phase 1: Database Schema Verification

### Check derived_from column exists

```bash
docker exec -it cia-postgres psql -U ciauser -d cia_analytics -c "\d datasets" | grep derived
```

**Expected output:**

```
 derived_from    | uuid    |           |          |
 derivation_info | jsonb   |           |          |
```

- [ ] `derived_from` column exists
- [ ] `derivation_info` column exists

### Check index exists

```bash
docker exec -it cia-postgres psql -U ciauser -d cia_analytics -c "\di idx_datasets_derived_from"
```

- [ ] Index `idx_datasets_derived_from` exists

---

## Phase 2: Backend API Verification

### 2.1 Check available operations

```bash
curl http://localhost:3001/api/compute/operations/vtk | jq
```

- [ ] Returns JSON with operations array
- [ ] Contains operations like `mesh-decimation`, `mesh-smoothing`

### 2.2 Check operations filtered by file type

```bash
curl "http://localhost:3001/api/compute/operations/vtk?fileType=vtp" | jq
```

- [ ] Returns filtered operations for .vtp files

### 2.3 Check worker status

```bash
curl http://localhost:3001/api/compute/workers | jq
```

- [ ] Shows worker registry status (may be empty if using Redis-based workers)

### 2.4 Check queue stats

```bash
curl http://localhost:3001/api/compute/queue-stats | jq
```

- [ ] Returns queue statistics (waiting, active, completed counts)

---

## Phase 3: Job Submission (API Level)

### 3.1 Submit a test job via curl

Replace `YOUR_FILE_ID` with an actual file UUID from your database:

```bash
# First, get a file ID
docker exec -it cia-postgres psql -U ciauser -d cia_analytics -c \
  "SELECT id, filename FROM datasets WHERE status = 'active' LIMIT 1;"

# Then submit a job (replace the UUID)
curl -X POST http://localhost:3001/api/compute/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "YOUR_FILE_ID",
    "operation": "compute-statistics",
    "params": {}
  }' | jq
```

- [ ] Returns `{ success: true, job: { id: "...", status: "queued" } }`
- [ ] Job ID is returned

### 3.2 Check job status

```bash
curl http://localhost:3001/api/compute/jobs/YOUR_JOB_ID | jq
```

- [ ] Returns job with status (queued → processing → complete)

### 3.3 Verify job in database

```bash
docker exec -it cia-postgres psql -U ciauser -d cia_analytics -c \
  "SELECT id, operation, status, progress FROM computation_jobs ORDER BY queued_at DESC LIMIT 5;"
```

- [ ] Job appears in table
- [ ] Status progresses from queued → processing → complete

---

## Phase 4: Worker Processing

### 4.1 Check worker logs during job

```bash
docker-compose logs vtk-worker -f
```

Submit a job and watch for:

- [ ] "Processing job [ID]: [operation]"
- [ ] "Downloading [storage_key]"
- [ ] "Running [operation]"
- [ ] "Job [ID] completed in [X]ms"

### 4.2 Verify worker callback to API

Check API logs:

```bash
docker-compose logs api -f | grep -i compute
```

- [ ] "Job [ID] queued on vtk-python"
- [ ] Progress updates received
- [ ] Job completion received

---

## Phase 5: Derived Dataset Creation

### 5.1 Submit a job that produces output (not just statistics)

```bash
curl -X POST http://localhost:3001/api/compute/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "YOUR_FILE_ID",
    "operation": "mesh-decimation",
    "params": { "reduction": 0.5 }
  }' | jq
```

- [ ] Job submitted successfully

### 5.2 Wait for completion, then check for derived dataset

```bash
docker exec -it cia-postgres psql -U ciauser -d cia_analytics -c \
  "SELECT id, filename, derived_from, derivation_info->>'operation' as operation
   FROM datasets
   WHERE derived_from IS NOT NULL
   ORDER BY created_at DESC LIMIT 5;"
```

- [ ] Derived dataset exists
- [ ] `derived_from` points to original file ID
- [ ] `derivation_info` contains operation name

### 5.3 Verify derived file in MinIO

```bash
# List files in MinIO bucket
docker exec cia-minio mc ls local/cia-files/computed/
```

- [ ] Result file exists in `computed/[job-id]/` path

---

## Phase 6: WebSocket Events

### 6.1 Open browser console and filter for WebSocket

In browser console:

```javascript
// Enable verbose WebSocket logging
localStorage.setItem("DEBUG_CATEGORIES", "ws,compute");
location.reload();
```

### 6.2 Submit job via UI and watch console

- [ ] See `compute:progress` events with progress %
- [ ] See `compute:complete` event with result
- [ ] OR see `compute:failed` event with error

### 6.3 Verify store updates

In browser console:

```javascript
// Check compute job store
const store = require("@UI/react/store/computeJobStore.js").useComputeJobStore;
console.log(store.getState().jobs);
```

- [ ] Job appears in store
- [ ] Status updates as events arrive
- [ ] Result populated on completion

---

## Phase 7: Toast Notifications

### 7.1 Job submission toast

- [ ] Submit job via context menu
- [ ] Toast appears: "Started: [operation] on [filename]"
- [ ] Toast auto-dismisses after ~3 seconds

### 7.2 Progress toast (at 50%)

- [ ] During processing, toast appears at 50%: "Processing [filename]... 50%"
- [ ] Auto-dismisses after ~2 seconds

### 7.3 Completion toast

- [ ] On success: "bunny.vtp: mesh decimation complete!"
- [ ] Green success styling
- [ ] Auto-dismisses after ~4 seconds

### 7.4 Derived file toast

- [ ] If derived file created: "New file created: [derived_filename]"
- [ ] Appears shortly after completion toast

### 7.5 Error toast

To test errors, submit a job for a non-existent file:

```javascript
// In browser console
const { submitJob } =
  require("@UI/react/hooks/useComputeJobs.js").useComputeJobs();
submitJob(
  "00000000-0000-0000-0000-000000000000",
  "mesh-decimation",
  {},
  { fileName: "test.vtp" }
);
```

- [ ] Error toast appears with red styling
- [ ] Shows error message
- [ ] Longer duration (~6 seconds)

---

## Phase 8: Context Menu Integration

### 8.1 Right-click file in FilesTab

- [ ] Context menu appears
- [ ] "Process" option visible with arrow indicator (►)

### 8.2 Hover over "Process"

- [ ] Submenu appears to the right
- [ ] Shows available operations (or "Loading..." then operations)
- [ ] Operations have names like "Decimate Mesh", "Smooth Mesh"

### 8.3 Click an operation

- [ ] Submenu closes
- [ ] Context menu closes
- [ ] Toast appears: "Started: [operation]..."
- [ ] Job progresses (more toasts)

### 8.4 Derived file appears

- [ ] After job completes, new file appears in FilesTab
- [ ] File name includes operation (e.g., "bunny_mesh_decimation.vtp")
- [ ] Can load derived file into a view

---

## Phase 9: End-to-End Flow

### Complete happy path test:

1. [ ] Load a sample .vtp file (e.g., Skull.vtp)
2. [ ] Right-click the file in FilesTab
3. [ ] Hover "Process" → Click "Decimate Mesh"
4. [ ] See "Started..." toast
5. [ ] See "Processing... 50%" toast
6. [ ] See "Complete!" toast
7. [ ] See "New file created: Skull_mesh_decimation.vtp" toast
8. [ ] New file appears in FilesTab
9. [ ] Click new file to load it
10. [ ] Renders successfully (with fewer polygons)

---

## Phase 10: Edge Cases & Error Handling

### 10.1 Duplicate job submission

- [ ] Submit same operation twice on same file
- [ ] Second submission returns cached result
- [ ] Toast: "Result already cached!"

### 10.2 Invalid file type

- [ ] Try to process a file type that isn't supported
- [ ] Graceful error message (no crash)

### 10.3 Worker offline

```bash
docker-compose stop vtk-worker
```

- [ ] Submit job
- [ ] Job stays in "queued" status
- [ ] No crash on frontend

```bash
docker-compose start vtk-worker
```

- [ ] Job eventually processes when worker comes back

### 10.4 Page refresh during job

- [ ] Submit a job
- [ ] Refresh page before completion
- [ ] Job state restored from localStorage
- [ ] Continues to receive WebSocket updates (if still connected)

### 10.5 WebSocket disconnect

- [ ] Disconnect WebSocket (close tab briefly or network offline)
- [ ] Reconnect
- [ ] Job state still accurate (may need to poll or re-fetch)

---

## Cleanup After Testing

### Clear test jobs from database

```bash
docker exec -it cia-postgres psql -U ciauser -d cia_analytics -c \
  "DELETE FROM computation_jobs WHERE status IN ('complete', 'failed');"
```

### Clear derived test files

```bash
docker exec -it cia-postgres psql -U ciauser -d cia_analytics -c \
  "DELETE FROM datasets WHERE derived_from IS NOT NULL;"
```

### Clear browser state

```javascript
// In browser console
localStorage.removeItem("cia-compute-jobs");
location.reload();
```

---

## Quick Smoke Test (5 minutes)

If you just want to verify things work:

1. [ ] `docker-compose ps` - all services running
2. [ ] `curl http://localhost:3001/api/compute/operations/vtk` - returns operations
3. [ ] Right-click file → Process → Compute Statistics
4. [ ] See toast notifications (started → complete)
5. [ ] Check database: `SELECT * FROM computation_jobs ORDER BY queued_at DESC LIMIT 1;`

If all 5 pass, the pipeline is working!

---

## Troubleshooting Quick Reference

| Issue                      | Check                                                             |
| -------------------------- | ----------------------------------------------------------------- |
| No operations in submenu   | API: `/api/compute/operations/vtk`                                |
| Job stuck in queued        | Worker logs: `docker-compose logs vtk-worker`                     |
| No toasts appearing        | Console errors, toast store state                                 |
| No WebSocket events        | Console network tab, serverSync connection                        |
| Derived file not appearing | Database: `SELECT * FROM datasets WHERE derived_from IS NOT NULL` |
| Worker can't download file | MinIO connection, storage_key validity                            |
