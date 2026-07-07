# CIA Web — Collaborative Immersive Analytics User Study Protocol

This protocol evaluates CIA Web's collaborative visualization workflow across
desktop and Apple Vision Pro clients. It is written to be executed as-is:
every task maps to a shipped feature, and every quantitative measure has a
concrete collection mechanism in the current codebase.

---

## 1. Research Questions

- **RQ1 (Efficiency):** Do pairs complete collaborative exploration and
  annotation tasks faster with real-time sync (annotations, filters,
  visualization state) than with a turn-taking baseline (sync disabled,
  verbal coordination only)?
- **RQ2 (Awareness):** Do presence cues (avatars, cursors, VR participant
  sync, room presence indicator) improve partners' awareness of each other's
  focus and actions?
- **RQ3 (Cross-platform usability):** Is the Vision Pro immersive client
  usable for the same analytic tasks as the desktop client (task success,
  SUS, workload), given its thin-client constraints (transient-pointer
  input, in-VR spatial menu)?
- **RQ4 (System latency):** Is end-to-end sync latency (state change on
  client A → applied on client B) within interactive collaboration bounds
  (target: p95 < 300 ms same-network)?

## 2. Participants and Design

- **N = 12 pairs (24 participants)**, recruited from students/researchers
  with basic 3D-tool familiarity; no VTK/CIA Web experience required.
- **Design:** within-subjects for platform (each pair does one desktop–desktop
  block and one desktop–Vision Pro block), counterbalanced order (6 pairs
  start desktop–desktop, 6 start mixed). RQ1's sync-vs-baseline comparison is
  between-blocks within the desktop–desktop condition (sync on vs. off,
  counterbalanced task-set assignment A/B to control for task difficulty).
- Rationale: within-subjects halves the pairs needed for platform comparison;
  pairs stay together across blocks so pair dynamics are held constant.
- One participant per pair uses Vision Pro in the mixed block; assign by
  self-reported VR comfort, record assignment.

## 3. Apparatus

- Windows + NVIDIA host running the full Docker stack
  (`docker-compose -f docker-compose.yml -f docker-compose.gpu.yml up`).
- Desktop clients: Chrome on lab workstations, `https://<host>:8081`.
- Vision Pro client: Safari/visionOS, same URL (complete
  `docs/vision-pro-validation-checklist.md` before the first session).
- All machines on one LAN and NTP-synced; prefer same-machine multi-tab only
  for latency pilot runs (see clock-skew caveat in
  `src/services/metrics/metricsService.js`).
- Voice: LiveKit room per pair (`npm run dev:full` stack) in all conditions,
  so voice is a constant, not a confound.
- Datasets: demo VTP files (`./scripts/load-demo-files.sh`), one dataset per
  task set, matched in size/complexity between sets A and B.

## 4. Tasks

Each block = 3 tasks, ~8 min each, hard cap 12 min. Task sets A and B are
isomorphic variants on different datasets.

- **T1 Guided exploration (warm-up, scored for time only):** Pair jointly
  locates a named structure in the dataset. Driver rotates/zooms; partner
  confirms. Mixed block: Vision Pro user explores in immersive mode with
  isolation-mode toggle; desktop partner follows via synced view state.
- **T2 Collaborative annotation:** Pair marks all instances of a target
  feature class (e.g., 6 seeded regions). Desktop user places annotations via
  desktop tools; VR user via VR annotation tool (spatial menu → annotate).
  Both must end with the same annotation set visible (live annotation sync).
  Score: completion time, coverage (found/6), duplicates (awareness failure
  indicator).
- **T3 Measurement comparison:** Each partner measures an assigned pair of
  structures (VR: measure tool, spatial menu; desktop: measurement widgets);
  the pair must then agree verbally which structure is larger and report the
  two distances. VR measurements render as 3D lines on the desktop client —
  the desktop partner reads the VR user's measurement without re-measuring.
  Score: time, correctness of comparison, absolute measurement values.

## 5. Measures

### 5.1 Objective
- **Task completion time:** experimenter stopwatch, start on "go", stop at
  pair's verbal "done". Cross-check against `sync_events` timestamps
  (`created_at` of first/last task-relevant event) and the session replay
  panel during analysis.
- **Sync latency:** `metricsService` samples (categories:
  `yjs-visualization`, `annotation-created/updated/deleted`,
  `filter-*`). Export per client at the end of each block (§7).
- **Coverage / duplicates / correctness:** from the persisted annotation set
  (query annotations per dataset after each block, before reset).
- **Errors and interventions:** experimenter log (sync failure, conflict
  dialog appearance, VR session drop, experimenter assistance).

### 5.2 Questionnaires (after each block)
- **SUS** (10 items, 0–100) — per participant, per platform condition.
- **NASA-TLX** (raw TLX, 6 subscales, 0–100) — per participant, per block.
- **Awareness items** (7-point Likert, 1 = strongly disagree,
  7 = strongly agree):
  1. I always knew where my partner was looking or working.
  2. I always knew what my partner was doing (annotating, measuring, moving).
  3. I could tell when my partner had finished their part of the task.
  4. My partner's actions appeared in my view quickly enough to feel live.
  5. I accidentally duplicated or undid my partner's work. (reverse-scored)
  6. The presence cues (avatars, cursors, indicators) helped me coordinate.
  7. I felt like we were working in the same space.
- **Vision Pro block only:** (a) input confidence — "The pinch/gaze input
  did what I intended" (Likert 7); (b) in-VR menu — "I could select tools
  without leaving the headset" (Likert 7); (c) simulator sickness screening
  (SSQ short form) before/after immersive use.

### 5.3 Qualitative
- Semi-structured debrief per pair (~10 min, audio recorded): coordination
  strategy, breakdowns, platform asymmetry ("who led and why"), conflict
  dialog comprehension if it appeared.
- Screen recordings of both clients; replay panel review for incident
  reconstruction.

## 6. Procedure (per pair, ~90 min)

| Phase | Duration | Content |
|-------|----------|---------|
| Consent + demographics | 10 min | Consent form; prior 3D/VR experience questionnaire |
| Training | 15 min | Guided tour: navigation, annotation, measurement, VR entry + spatial menu (both partners try both platforms briefly) |
| Block 1 | 25 min | 3 tasks + SUS + TLX + awareness items |
| Break | 5 min | VR user removes headset; SSQ if applicable |
| Block 2 | 25 min | 3 tasks (other condition/task set) + questionnaires |
| Debrief | 10 min | Interview + metrics export verification |

Experimenter checklist per session: reset DB annotations for the pair's
datasets (or use a fresh workspace per pair — preferred, via workspace
creation), clear browser IndexedDB
(`indexedDB.deleteDatabase('cia-datasets'); location.reload();`), verify
`./scripts/check-services.sh` green, verify both clients in the same room
(RoomPresenceIndicator shows 2), start screen recordings.

## 7. Data Collection Mechanics

1. **Latency metrics:** at the end of each block, on EACH client run in the
   browser console:
   ```javascript
   window.CIA.metrics.download(`P<pair>_<block>_<client>.json`);
   ```
   Then `window.CIA.metrics.clear()` before the next block. The export
   contains per-category summaries (count/mean/p50/p95/max) and raw samples
   with `sameClock` flags — filter to `sameClock` or NTP-corrected samples
   in analysis.
2. **Event log:** after each session, export replay events for the pair's
   workspace:
   `GET /api/workspaces/<id>/replay-events?limit=500` (page via
   `nextCursor`), save JSON. This is the authoritative who-did-what-when
   record.
3. **Annotations:** `GET /api/annotations?fileId=<datasetId>` per task
   dataset, save JSON, then reset.
4. Questionnaires digitized (forms), keyed by participant + block.

## 8. Analysis Plan

- **RQ1:** paired comparison of completion time sync vs. baseline
  (desktop–desktop blocks); Wilcoxon signed-rank (n = 12 pairs, normality
  unlikely). Coverage/duplicates: Wilcoxon or exact tests.
- **RQ2:** awareness composite (items 1–4, 6, 7; item 5 reversed; Cronbach's
  α reported) compared sync vs. baseline and desktop vs. mixed; correlate
  duplicates count with awareness scores.
- **RQ3:** SUS and TLX desktop vs. Vision Pro (within-participant for the
  VR-assigned participants; report both parametric t and Wilcoxon). Task
  success rates descriptive.
- **RQ4:** report per-category latency distributions (median, p95, max, n)
  pooled across sessions, split by same-machine vs. cross-machine; compare
  against the 300 ms interactivity target. No inferential test needed —
  this is a system-performance result.
- Qualitative: thematic coding of debriefs (two coders, agreement on 20%
  sample), incidents cross-referenced with replay logs.

## 9. Pilot and Risks

- Run 2 pilot pairs (excluded from analysis) to calibrate task difficulty,
  timing caps, and verify the metrics/export pipeline end-to-end.
- **Risks:** Vision Pro session drops (mitigation: rejoin flow validated via
  checklist; experimenter logs the drop, task clock keeps running);
  clock skew contaminating latency numbers (mitigation: NTP check in setup,
  `sameClock` filtering); conflict dialog appearing mid-task (log it — it is
  data for RQ2, not a protocol failure).

## 10. Ethics

Informed consent covering audio/screen recording; no biometric data stored;
Vision Pro use is voluntary with motion-sickness opt-out (pair completes
desktop–desktop only, noted in analysis); data pseudonymized (P01–P24).
