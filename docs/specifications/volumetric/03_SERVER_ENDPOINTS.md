# Server Endpoints Specification

## 1. VR Sessions API (NEW FILE)

**File**: `server/routes/vr.js`

```javascript
// server/routes/vr.js
// VR exploration session management API

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/client.js';
import { authenticateToken, requireProjectAccess } from '../middleware/auth.js';
import { broadcastToProject } from '../websocket/broadcast.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// =============================================================================
// SESSION CRUD
// =============================================================================

/**
 * POST /vr/sessions
 * Create a new VR exploration session
 */
router.post('/sessions', async (req, res) => {
  try {
    const {
      viewConfigurationId,
      datasetId,
      projectId,
      selectionType,
      explorationMode,
      vrScale,
      allowJoin,
      allowDesktopParticipants,
      allowDesktopControl,
      regionOfInterest,
      selectionIds,
    } = req.body;
    
    const userId = req.user.id;
    const userName = req.user.name || req.user.email;
    
    // Validate project access
    await requireProjectAccess(req, res, () => {});
    
    // Create session
    const session = await prisma.vrExplorationSession.create({
      data: {
        id: uuidv4(),
        viewConfigurationId,
        datasetId,
        projectId,
        ownerUserId: userId,
        ownerUserName: userName,
        selectionType: selectionType || 'full',
        defaultExplorationMode: explorationMode || 'fly',
        defaultVRScale: vrScale || 1.0,
        allowJoin: allowJoin !== false,
        allowDesktopParticipants: allowDesktopParticipants !== false,
        allowDesktopControl: allowDesktopControl !== false,
        regionOfInterest: regionOfInterest ? JSON.stringify(regionOfInterest) : null,
        selectionIds: selectionIds ? JSON.stringify(selectionIds) : null,
        status: 'preparing',
        createdAt: new Date(),
      },
    });
    
    // Add owner as first participant
    await prisma.vrSessionParticipant.create({
      data: {
        sessionId: session.id,
        odUserId: userId,
        userName,
        mode: 'vr-explorer',
        joinedAt: new Date(),
      },
    });
    
    // Broadcast to project
    broadcastToProject(projectId, 'vr:session-created', {
      sessionId: session.id,
      ownerUserName: userName,
      datasetId,
    });
    
    res.json(session);
    
  } catch (error) {
    console.error('Failed to create VR session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * GET /vr/sessions/:id
 * Get session details
 */
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await prisma.vrExplorationSession.findUnique({
      where: { id: req.params.id },
      include: {
        participants: true,
        snapshots: true,
      },
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session);
    
  } catch (error) {
    console.error('Failed to get VR session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * GET /vr/sessions
 * List active sessions in a project
 */
router.get('/sessions', async (req, res) => {
  try {
    const { projectId } = req.query;
    
    const sessions = await prisma.vrExplorationSession.findMany({
      where: {
        projectId,
        status: { in: ['preparing', 'active', 'paused'] },
      },
      include: {
        participants: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(sessions);
    
  } catch (error) {
    console.error('Failed to list VR sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

/**
 * PUT /vr/sessions/:id
 * Update session settings
 */
router.put('/sessions/:id', async (req, res) => {
  try {
    const session = await prisma.vrExplorationSession.findUnique({
      where: { id: req.params.id },
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (session.ownerUserId !== req.user.id) {
      return res.status(403).json({ error: 'Not session owner' });
    }
    
    const updated = await prisma.vrExplorationSession.update({
      where: { id: req.params.id },
      data: req.body,
    });
    
    broadcastToProject(session.projectId, 'vr:session-updated', {
      sessionId: session.id,
      updates: req.body,
    });
    
    res.json(updated);
    
  } catch (error) {
    console.error('Failed to update VR session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

/**
 * DELETE /vr/sessions/:id
 * End/delete a session
 */
router.delete('/sessions/:id', async (req, res) => {
  try {
    const session = await prisma.vrExplorationSession.findUnique({
      where: { id: req.params.id },
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (session.ownerUserId !== req.user.id) {
      return res.status(403).json({ error: 'Not session owner' });
    }
    
    await prisma.vrExplorationSession.update({
      where: { id: req.params.id },
      data: {
        status: 'ended',
        endedAt: new Date(),
      },
    });
    
    broadcastToProject(session.projectId, 'vr:session-ended', {
      sessionId: session.id,
    });
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Failed to end VR session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// =============================================================================
// PARTICIPANT MANAGEMENT
// =============================================================================

/**
 * POST /vr/sessions/:id/join
 * Join a session
 */
router.post('/sessions/:id/join', async (req, res) => {
  try {
    const session = await prisma.vrExplorationSession.findUnique({
      where: { id: req.params.id },
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (!session.allowJoin) {
      return res.status(403).json({ error: 'Session does not allow joining' });
    }
    
    const { mode } = req.body;
    
    if (mode === 'desktop-participant' && !session.allowDesktopParticipants) {
      return res.status(403).json({ error: 'Session does not allow desktop participants' });
    }
    
    const participant = await prisma.vrSessionParticipant.upsert({
      where: {
        sessionId_odUserId: {
          sessionId: session.id,
          odUserId: req.user.id,
        },
      },
      create: {
        sessionId: session.id,
        odUserId: req.user.id,
        userName: req.user.name || req.user.email,
        mode: mode || 'desktop-observer',
        joinedAt: new Date(),
      },
      update: {
        mode: mode || 'desktop-observer',
        lastActiveAt: new Date(),
      },
    });
    
    broadcastToProject(session.projectId, 'vr:participant-joined', {
      sessionId: session.id,
      participant: {
        odUserId: participant.odUserId,
        userName: participant.userName,
        mode: participant.mode,
      },
    });
    
    res.json(participant);
    
  } catch (error) {
    console.error('Failed to join VR session:', error);
    res.status(500).json({ error: 'Failed to join session' });
  }
});

/**
 * POST /vr/sessions/:id/leave
 * Leave a session
 */
router.post('/sessions/:id/leave', async (req, res) => {
  try {
    await prisma.vrSessionParticipant.delete({
      where: {
        sessionId_odUserId: {
          sessionId: req.params.id,
          odUserId: req.user.id,
        },
      },
    });
    
    const session = await prisma.vrExplorationSession.findUnique({
      where: { id: req.params.id },
    });
    
    if (session) {
      broadcastToProject(session.projectId, 'vr:participant-left', {
        sessionId: session.id,
        odUserId: req.user.id,
      });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Failed to leave VR session:', error);
    res.status(500).json({ error: 'Failed to leave session' });
  }
});

/**
 * PUT /vr/sessions/:id/participants/:odUserId
 * Update participant state
 */
router.put('/sessions/:id/participants/:odUserId', async (req, res) => {
  try {
    const participant = await prisma.vrSessionParticipant.update({
      where: {
        sessionId_odUserId: {
          sessionId: req.params.id,
          odUserId: req.params.odUserId,
        },
      },
      data: {
        ...req.body,
        lastActiveAt: new Date(),
      },
    });
    
    res.json(participant);
    
  } catch (error) {
    console.error('Failed to update participant:', error);
    res.status(500).json({ error: 'Failed to update participant' });
  }
});

// =============================================================================
// SNAPSHOTS
// =============================================================================

/**
 * POST /vr/sessions/:id/snapshots
 * Create a session snapshot
 */
router.post('/sessions/:id/snapshots', async (req, res) => {
  try {
    const { name, viewSnapshotId, participantStates } = req.body;
    
    const snapshot = await prisma.vrSessionSnapshot.create({
      data: {
        id: uuidv4(),
        sessionId: req.params.id,
        name,
        viewSnapshotId,
        createdBy: req.user.id,
        createdByName: req.user.name || req.user.email,
        participantStates: JSON.stringify(participantStates || []),
        timestamp: new Date(),
      },
    });
    
    res.json(snapshot);
    
  } catch (error) {
    console.error('Failed to create snapshot:', error);
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

/**
 * GET /vr/sessions/:id/snapshots
 * List session snapshots
 */
router.get('/sessions/:id/snapshots', async (req, res) => {
  try {
    const snapshots = await prisma.vrSessionSnapshot.findMany({
      where: { sessionId: req.params.id },
      orderBy: { timestamp: 'desc' },
    });
    
    res.json(snapshots);
    
  } catch (error) {
    console.error('Failed to list snapshots:', error);
    res.status(500).json({ error: 'Failed to list snapshots' });
  }
});

export default router;
```

---

## 2. VR Preprocessing Queue (NEW FILE)

**File**: `server/queues/vrPreprocessing.js`

```javascript
// server/queues/vrPreprocessing.js
// Background queue for VR preprocessing jobs

import { Queue, Worker } from 'bullmq';
import { prisma } from '../db/client.js';
import { broadcastToProject } from '../websocket/broadcast.js';
import { s3Client, uploadToS3 } from '../storage/s3.js';
import { spawn } from 'child_process';
import path from 'path';

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// =============================================================================
// QUEUE DEFINITION
// =============================================================================

export const vrPreprocessingQueue = new Queue('vr-preprocessing', {
  connection: REDIS_CONNECTION,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// =============================================================================
// WORKER
// =============================================================================

const worker = new Worker('vr-preprocessing', async (job) => {
  const { datasetId, fileId, filePath, fileType, manifest, projectId } = job.data;
  
  console.log(`[VR Preprocessing] Starting job for dataset ${datasetId}`);
  
  // Update status to processing
  await updateVRReadiness(datasetId, {
    status: 'processing',
    startedAt: new Date(),
    progress: 0,
  });
  
  broadcastProgress(projectId, datasetId, 0, 'Starting preprocessing...');
  
  const results = {
    lodLevels: 0,
    chunkCount: 0,
    processedFiles: [],
    bounds: null,
    recommendedScale: 1.0,
  };
  
  try {
    // Get required operations from manifest
    const requiredOps = manifest.compute?.serverSide?.operations
      ?.filter(op => op.requiredForVR) || [];
    
    // Compute data bounds first
    job.updateProgress(5);
    broadcastProgress(projectId, datasetId, 5, 'Computing bounds...');
    
    results.bounds = await computeDataBounds(filePath);
    
    // Calculate recommended VR scale
    const maxDim = Math.max(
      results.bounds[1] - results.bounds[0],
      results.bounds[3] - results.bounds[2],
      results.bounds[5] - results.bounds[4]
    );
    results.recommendedScale = 3.0 / maxDim; // Fit in 3m space
    
    // Process each required operation
    let progressBase = 10;
    const progressPerOp = 80 / Math.max(requiredOps.length, 1);
    
    for (const op of requiredOps) {
      const opProgress = progressBase + progressPerOp * 0.5;
      job.updateProgress(opProgress);
      broadcastProgress(projectId, datasetId, opProgress, `Running ${op.name}...`);
      
      switch (op.id) {
        case 'lod-generation':
          const lodResult = await generateLOD(filePath, op, job);
          results.lodLevels = lodResult.levels;
          results.processedFiles.push(...lodResult.files);
          break;
          
        case 'volume-chunking':
          const chunkResult = await chunkVolume(filePath, op, job);
          results.chunkCount = chunkResult.count;
          results.processedFiles.push(...chunkResult.files);
          break;
      }
      
      progressBase += progressPerOp;
    }
    
    // Upload processed files to S3
    job.updateProgress(90);
    broadcastProgress(projectId, datasetId, 90, 'Uploading processed files...');
    
    for (const file of results.processedFiles) {
      file.s3Key = await uploadToS3(file.localPath, `vr/${datasetId}/${file.name}`);
    }
    
    // Update database
    job.updateProgress(95);
    await updateVRReadiness(datasetId, {
      status: 'ready',
      completedAt: new Date(),
      progress: 100,
      lodLevels: results.lodLevels,
      chunkCount: results.chunkCount,
      recommendedScale: results.recommendedScale,
      bounds: JSON.stringify(results.bounds),
      processedFiles: JSON.stringify(results.processedFiles.map(f => ({
        type: f.type,
        level: f.level,
        s3Key: f.s3Key,
      }))),
    });
    
    // Broadcast completion
    broadcastToProject(projectId, 'dataset:vr-ready', {
      datasetId,
      vrReadiness: {
        status: 'ready',
        lodLevels: results.lodLevels,
        chunkCount: results.chunkCount,
        recommendedScale: results.recommendedScale,
      },
    });
    
    console.log(`[VR Preprocessing] Completed for dataset ${datasetId}`);
    
    return results;
    
  } catch (error) {
    console.error(`[VR Preprocessing] Failed for dataset ${datasetId}:`, error);
    
    await updateVRReadiness(datasetId, {
      status: 'failed',
      errorMessage: error.message,
      errorCode: error.code || 'UNKNOWN',
    });
    
    broadcastToProject(projectId, 'dataset:vr-failed', {
      datasetId,
      error: error.message,
    });
    
    throw error;
  }
}, { connection: REDIS_CONNECTION });

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function updateVRReadiness(datasetId, data) {
  // Update in database - adjust based on your schema
  await prisma.dataset.update({
    where: { id: datasetId },
    data: {
      vrReadinessStatus: data.status,
      vrReadinessData: JSON.stringify(data),
    },
  });
}

function broadcastProgress(projectId, datasetId, progress, message) {
  broadcastToProject(projectId, 'dataset:vr-progress', {
    datasetId,
    progress,
    message,
  });
}

async function computeDataBounds(filePath) {
  // Call VTK Python worker to compute bounds
  return new Promise((resolve, reject) => {
    const worker = spawn('python3', [
      path.join(__dirname, '../workers/vtk/compute_bounds.py'),
      filePath,
    ]);
    
    let output = '';
    worker.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    worker.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result.bounds);
        } catch (e) {
          reject(new Error('Failed to parse bounds'));
        }
      } else {
        reject(new Error(`Bounds computation failed with code ${code}`));
      }
    });
    
    worker.on('error', reject);
  });
}

async function generateLOD(filePath, opConfig, job) {
  const params = {
    levels: opConfig.parameters.find(p => p.name === 'levels')?.default || 4,
    reductionRatio: opConfig.parameters.find(p => p.name === 'reductionRatio')?.default || 0.5,
  };
  
  // Call VTK Python worker
  return new Promise((resolve, reject) => {
    const worker = spawn('python3', [
      path.join(__dirname, '../workers/vtk/generate_lod.py'),
      filePath,
      JSON.stringify(params),
    ]);
    
    let output = '';
    worker.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    worker.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          reject(new Error('Failed to parse LOD result'));
        }
      } else {
        reject(new Error(`LOD generation failed with code ${code}`));
      }
    });
    
    worker.on('error', reject);
  });
}

async function chunkVolume(filePath, opConfig, job) {
  const params = {
    chunkSize: opConfig.parameters.find(p => p.name === 'chunkSize')?.default || 64,
    overlap: opConfig.parameters.find(p => p.name === 'overlap')?.default || 2,
  };
  
  // Call VTK Python worker
  return new Promise((resolve, reject) => {
    const worker = spawn('python3', [
      path.join(__dirname, '../workers/vtk/chunk_volume.py'),
      filePath,
      JSON.stringify(params),
    ]);
    
    let output = '';
    worker.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    worker.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          reject(new Error('Failed to parse chunking result'));
        }
      } else {
        reject(new Error(`Volume chunking failed with code ${code}`));
      }
    });
    
    worker.on('error', reject);
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export async function queueVRPreprocessing(datasetId, fileId, filePath, fileType, manifest, projectId) {
  const job = await vrPreprocessingQueue.add('vr-preprocess', {
    datasetId,
    fileId,
    filePath,
    fileType,
    manifest,
    projectId,
  }, {
    priority: 10,  // Lower priority (background)
  });
  
  return job;
}

export default vrPreprocessingQueue;
```

---

## 3. Dataset Route Modifications

**File**: `server/routes/datasets.js` (MODIFY)

Add VR preprocessing queue trigger after file upload:

```javascript
// Add import at top
import { queueVRPreprocessing } from '../queues/vrPreprocessing.js';
import { getManifestForFileType } from '../manifests/registry.js';

// In the POST / route, after dataset is created:

// ... existing upload handling code ...

// Queue VR preprocessing if supported
const manifest = getManifestForFileType(fileExtension);
if (manifest?.vr?.supportsInstanceVR) {
  await queueVRPreprocessing(
    dataset.id,
    dataset.fileId,
    storagePath,
    fileExtension,
    manifest,
    projectId
  );
  
  // Mark as queued
  await prisma.dataset.update({
    where: { id: dataset.id },
    data: {
      vrReadinessStatus: 'queued',
      vrReadinessData: JSON.stringify({
        status: 'queued',
        queuedAt: new Date(),
      }),
    },
  });
}

// Add endpoint for VR status
router.get('/:id/vr-status', authenticateToken, async (req, res) => {
  try {
    const dataset = await prisma.dataset.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        vrReadinessStatus: true,
        vrReadinessData: true,
      },
    });
    
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }
    
    const vrReadiness = dataset.vrReadinessData 
      ? JSON.parse(dataset.vrReadinessData)
      : { status: 'pending' };
    
    res.json({ vrReadiness });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to get VR status' });
  }
});
```

---

## 4. Database Schema Additions

**File**: `prisma/schema.prisma` (ADD)

```prisma
// VR Exploration Session
model VrExplorationSession {
  id                      String    @id @default(uuid())
  viewConfigurationId     String
  datasetId               String
  projectId               String
  
  ownerUserId             String
  ownerUserName           String
  
  selectionType           String    @default("full")
  regionOfInterest        String?   // JSON
  selectionIds            String?   // JSON
  filterSnapshotId        String?
  
  defaultExplorationMode  String    @default("fly")
  defaultVRScale          Float     @default(1.0)
  
  visibility              String    @default("group")
  allowJoin               Boolean   @default(true)
  allowDesktopParticipants Boolean  @default(true)
  allowDesktopControl     Boolean   @default(true)
  requireControlApproval  Boolean   @default(true)
  
  syncSlicesToDesktop     Boolean   @default(true)
  syncAnnotationsToDesktop Boolean  @default(true)
  
  status                  String    @default("preparing")
  createdAt               DateTime  @default(now())
  startedAt               DateTime?
  endedAt                 DateTime?
  pausedAt                DateTime?
  
  participants            VrSessionParticipant[]
  snapshots               VrSessionSnapshot[]
  
  @@index([projectId])
  @@index([status])
}

model VrSessionParticipant {
  id          String   @id @default(uuid())
  sessionId   String
  odUserId    String
  userName    String
  userColor   String   @default("#00ff00")
  mode        String   @default("desktop-observer")
  joinedAt    DateTime @default(now())
  lastActiveAt DateTime @default(now())
  
  vrScale     Float    @default(1.0)
  scaleVisibility String @default("my-scale")
  
  controllingUserId  String?
  controlledByUserId String?
  
  session     VrExplorationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  @@unique([sessionId, odUserId])
  @@index([sessionId])
}

model VrSessionSnapshot {
  id              String   @id @default(uuid())
  sessionId       String
  name            String
  viewSnapshotId  String
  createdBy       String
  createdByName   String
  participantStates String? // JSON
  timestamp       DateTime @default(now())
  
  session         VrExplorationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  @@index([sessionId])
}

// Add to Dataset model
model Dataset {
  // ... existing fields ...
  
  vrReadinessStatus String? @default("pending")
  vrReadinessData   String? // JSON with full vrReadiness object
}
```

---

## 5. WebSocket Events

Add to existing WebSocket broadcast system:

```javascript
// VR session events to broadcast:

// When session is created
'vr:session-created' -> { sessionId, ownerUserName, datasetId }

// When session is updated
'vr:session-updated' -> { sessionId, updates }

// When session ends
'vr:session-ended' -> { sessionId }

// When participant joins
'vr:participant-joined' -> { sessionId, participant }

// When participant leaves
'vr:participant-left' -> { sessionId, odUserId }

// VR preprocessing events:

// Progress update
'dataset:vr-progress' -> { datasetId, progress, message }

// Preprocessing complete
'dataset:vr-ready' -> { datasetId, vrReadiness }

// Preprocessing failed
'dataset:vr-failed' -> { datasetId, error }
```
