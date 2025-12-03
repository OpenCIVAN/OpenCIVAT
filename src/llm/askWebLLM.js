// src/llm/askWebLLM.js
// FINAL VERSION — Context labels + dedup + better region/indices handling

import { CreateMLCEngine } from "@mlc-ai/web-llm";

const MODEL_ID = "Qwen2.5-0.5B-Instruct-q4f32_1-MLC";
let enginePromise = null;

// --------------------------------------------------
// Lazy init engine
// --------------------------------------------------
async function getEngine() {
  if (!enginePromise) {
    console.log("[WebLLM] Initializing engine with model:", MODEL_ID);
    enginePromise = CreateMLCEngine(MODEL_ID, {
      initProgressCallback(p) {
        console.log("[WebLLM init]", p);
      },
    });
  }
  return enginePromise;
}

// --------------------------------------------------
// Extract largest balanced JSON
// --------------------------------------------------
function extractBalancedJSON(raw) {
  if (!raw) return null;
  const text = String(raw);
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

// --------------------------------------------------
// Repair JSON
// --------------------------------------------------
function safeParseJSON(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {}

  const repaired = extractBalancedJSON(raw);
  if (repaired) {
    try {
      return JSON.parse(repaired);
    } catch (_) {}
  }

  console.warn("[WebLLM] Could not extract valid JSON.");
  return null;
}

// --------------------------------------------------
// Region templates
// --------------------------------------------------
const regionTemplatesByType = {
  ribcage: [
    "upper rib cage region",
    "lower rib cage region",
    "left chest wall area",
    "right chest wall area",
    "central anterior chest region",
  ],
  skull: [
    "upper skull region",
    "lower skull region",
    "left cranial side",
    "right cranial side",
    "central skull base region",
  ],
  lungs: [
    "upper lung area",
    "middle lung area",
    "lower lung area",
    "left lung area",
    "right lung area",
    "central lung region",
  ],
  lung_vessels: [
    "upper vascular cluster",
    "central vessel cluster",
    "peripheral vessel branches",
    "lower vascular region",
  ],
  ventricles: [
    "upper ventricular region",
    "lower ventricular region",
    "left ventricular area",
    "right ventricular area",
    "central ventricular region",
  ],
  unknown: [
    "upper region",
    "lower region",
    "left region",
    "right region",
    "central region",
  ],
};

const bannedWords = ["rib", "ribs", "spine", "vertebra", "pelvis", "pelvic"];
const allowedSignals = new Set(["density", "curvature", "symmetry"]);
const allowedTypes = new Set(["asymmetry", "anomaly", "artifact"]);

// --------------------------------------------------
// PUBLIC — askWebLLM
// --------------------------------------------------
export async function askLLM_WebLLM(stats) {
  const engine = await getEngine();

  const meshType = stats.meshType || "unknown";
  const regionExamples =
    regionTemplatesByType[meshType] || regionTemplatesByType.unknown;
  const regionExampleText = regionExamples.map((r) => `- "${r}"`).join("\n");

  const hotspot = stats.hotspot || stats.hotspots || {};
  const densityHotspots = Array.isArray(hotspot.density) ? hotspot.density : [];
  const curvatureHotspots = Array.isArray(hotspot.curvature)
    ? hotspot.curvature
    : [];
  const symmetryHotspots = Array.isArray(hotspot.symmetry)
    ? hotspot.symmetry
    : [];

  const allowedIndices = new Set([
    ...densityHotspots,
    ...curvatureHotspots,
    ...symmetryHotspots,
  ]);

  const compactStats = {
    meshType,
    bboxSize: stats.bboxSize || { x: 0, y: 0, z: 0 },
    centroidList: stats.centroidList || [],
    hotspotSample: {
      density: densityHotspots,
      curvature: curvatureHotspots,
      symmetry: symmetryHotspots,
    },
  };

  // --------------------------------------------------
  // SYSTEM PROMPT — strong context requirement
  // --------------------------------------------------
  const systemPrompt = `
You are an analysis assistant running fully in the browser.

RULES:
1. ALWAYS answer in English.
2. Output MUST be valid JSON only.
3. JSON must have:
   - "findings": array of 1–3 findings.
   - "summary": 1–3 sentence radiology-style summary.
- Use ONLY mild, descriptive language. 
  DO NOT use words like “significant”, “complication”, “issue”, “defect”, “abnormality”, 
  “pathology”, “problem”, “structural issue”, “clinical concern”.
- Never describe the rib cage as globally asymmetrical.
- Context and summary must remain neutral, visual-only descriptions.
ABSOLUTE RESTRICTIONS:
- DO NOT use medical diagnostic or alarming language.
- DO NOT mention injuries, fractures, damage, clinical concerns, abnormalities, or complications.
- DO NOT generate warnings like "carefully examine", "signs of", "important to investigate".
- You MUST describe only geometric variation in mild, neutral terms.
- NEVER infer trauma or pathology.
- Use phrases like "mild variation", "local geometric difference", "subtle changes".

Each finding MUST include:
{
  "type": "fracture" | "asymmetry" | "anomaly" | "artifact",
  "signal": "density" | "curvature" | "symmetry",
  "regionHint": "short neutral location",
  "confidence": number 0–1,
  "indices": [only hotspot indices],
  "context": "A FULL SENTENCE describing WHY this cluster matters. 
    Must include:
      - approximate directional location (upper/lower/left/right/central)
      - mention of the irregularity (density/curvature/symmetry)
      - cautious language like 'may represent' or 'possibly indicates'
    It MUST be 1–2 complete sentences and MUST NOT equal regionHint alone."
}

Region hints for meshType "${meshType}" should resemble:
${regionExampleText}

- Use neutral, anatomical-style descriptions.
- Never invent new hotspot index numbers.
`;

  const userPrompt = "Mesh statistics:\n" + JSON.stringify(compactStats);

  // --------------------------------------------------
  // RUN MODEL
  // --------------------------------------------------
  try {
    const completion = await engine.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.25,
      response_format: { type: "json_object" },
    });

    const raw = completion?.choices?.[0]?.message?.content ?? "{}";
    console.log("=== RAW MODEL OUTPUT ===\n", raw);

    const parsed = safeParseJSON(raw);
    if (!parsed) return { findings: [], summary: "" };

    let findings = Array.isArray(parsed.findings) ? parsed.findings : [];
    let summary = typeof parsed.summary === "string" ? parsed.summary : "";

    if (findings.length > 3) findings = findings.slice(0, 3);

    const resultFindings = [];

    // offsets so different findings get different hotspot slices (C)
    let densityOffset = 0;
    let curvatureOffset = 0;
    let symmetryOffset = 0;

    // --------------------------------------------------
    // PROCESS FINDINGS
    // --------------------------------------------------
    for (let f of findings) {
      const out = { ...f };

      // Fix signal
      if (!allowedSignals.has(out.signal)) out.signal = "density";

      // Fix type (B: simple logic by signal: symmetry → asymmetry, else anomaly)
      if (!allowedTypes.has(out.type)) {
        if (out.signal === "symmetry") out.type = "asymmetry";
        else out.type = "anomaly";
      }

      // --- REGIONHINT FIX / NORMALIZATION (A, F, G) ---
      function normalizeRegion(regionHint, templates) {
        if (!templates || templates.length === 0) return regionHint || "region";

        if (!regionHint) return templates[0];

        const h = regionHint.toLowerCase();

        // Exact match
        for (const t of templates) {
          if (h === t.toLowerCase()) return t;
        }

        // If model generates long sentences → reject, use first template
        if (h.length > 30) return templates[0];

        // Try directional keywords
        if (h.includes("central"))
          return (
            templates.find((t) => t.toLowerCase().includes("central")) ||
            templates[0]
          );
        if (h.includes("upper"))
          return (
            templates.find((t) => t.toLowerCase().includes("upper")) ||
            templates[0]
          );
        if (h.includes("lower"))
          return (
            templates.find((t) => t.toLowerCase().includes("lower")) ||
            templates[0]
          );
        if (h.includes("left"))
          return (
            templates.find((t) => t.toLowerCase().includes("left")) ||
            templates[0]
          );
        if (h.includes("right"))
          return (
            templates.find((t) => t.toLowerCase().includes("right")) ||
            templates[0]
          );

        // Fallback
        return templates[0];
      }

      out.regionHint = normalizeRegion(out.regionHint, regionExamples);

      // Keep context anatomical-neutral, not overloaded with rib/spine/etc
      if (meshType !== "ribcage") {
        const L = out.regionHint.toLowerCase();
        if (bannedWords.some((w) => L.includes(w))) out.regionHint = regionExamples[0];
      }

      // Fix confidence
      let c = Number(out.confidence);
      out.confidence = Number.isFinite(c)
        ? Math.min(1, Math.max(0, c))
        : 0.5;

      // Fix indices (C: avoid repetition by using offsets)
      if (!Array.isArray(out.indices)) out.indices = [];
      out.indices = out.indices.filter((x) => allowedIndices.has(x));

      if (!out.indices.length && allowedIndices.size > 0) {
        if (out.signal === "density") {
          out.indices = densityHotspots.slice(densityOffset, densityOffset + 20);
          densityOffset += 20;
          if (!out.indices.length) {
            out.indices = densityHotspots.slice(0, 20);
          }
        } else if (out.signal === "curvature") {
          out.indices = curvatureHotspots.slice(
            curvatureOffset,
            curvatureOffset + 20
          );
          curvatureOffset += 20;
          if (!out.indices.length) {
            out.indices = curvatureHotspots.slice(0, 20);
          }
        } else {
          out.indices = symmetryHotspots.slice(
            symmetryOffset,
            symmetryOffset + 20
          );
          symmetryOffset += 20;
          if (!out.indices.length) {
            out.indices = symmetryHotspots.slice(0, 20);
          }
        }
      }

      // --------------------------------------------------
      // CONTEXT FIX — ensure full sentence, not region-only (D, G)
      // --------------------------------------------------
      function invalidContext(ctx, region) {
        if (!ctx) return true;

        const t = ctx.trim().toLowerCase();
        const r = region.trim().toLowerCase();

        const tooShort = t.length < 30;
        const sameAsRegion = t === r;
        const looksLikeRegion = /^[a-z\s]+region$/.test(t);
        const noVerb = !/(show|indicat|suggest|represent|located|cluster)/.test(
          t
        );

        return tooShort || sameAsRegion || looksLikeRegion || noVerb;
      }

      if (invalidContext(out.context, out.regionHint)) {
        out.context =
          `Located in the ${out.regionHint}, this region shows ${out.signal} variation ` +
          `that may reflect mild local geometric differences.`;
      }

      // Remove forbidden anatomy from context for non-ribcage meshes
      if (meshType !== "ribcage") {
        const ctx = out.context.toLowerCase();
        if (bannedWords.some((w) => ctx.includes(w))) {
          out.context =
            `Located in the ${out.regionHint}, it shows ${out.signal} variation ` +
            `suggestive of a mild geometric irregularity.`;
        }
      }

      resultFindings.push(out);
    }

    // --------------------------------------------------
    // DEDUPE FINDINGS (A/C) — keep unique type|signal|region combos
    // --------------------------------------------------
    const unique = new Map();
    for (const f of resultFindings) {
      const key = `${f.type}|${f.signal}|${f.regionHint}`;
      if (!unique.has(key)) unique.set(key, f);
    }
    findings = [...unique.values()];

    // --------------------------------------------------
    // SUMMARY & FALLBACKS
    // --------------------------------------------------
    if (!findings.length) {
      findings.push({
        type: "anomaly",
        signal: "density",
        regionHint: regionExamples[0],
        confidence: 0.3,
        indices: Array.from(allowedIndices).slice(0, 20),
        context:
          "Located in the central region, this area shows density variation possibly indicating a minor geometric irregularity.",
      });
    }

    if (!summary) {
      const signals = Array.from(new Set(findings.map((f) => f.signal)));
      summary =
        `Automatic interpretation produced ${findings.length} finding(s), ` +
        `showing ${signals.join(", ")}-based irregularities.`;
    }

    // --- SUMMARY + CONTEXT LANGUAGE SOFTENER (D) ---
    function soften(text) {
      if (!text) return text;
      let t = text;

      const forbidden = [
        "significant",
        "complication",
        "issue",
        "clinical",
        "pathology",
        "abnormality",
        "problem",
        "structural issue",
        "complications",
      ];

      forbidden.forEach((w) => {
        const re = new RegExp(w, "gi");
        t = t.replace(re, "variation");
      });

      t = t.replace(
        /rib cage is asymmetrical/gi,
        "the region shows mild geometric variation"
      );

      return t;
    }

    for (const f of findings) {
      f.context = soften(f.context);
    }
    summary = soften(summary);

    // ===============================
    // FINAL DANGEROUS LANGUAGE SCRUBBER (keeps things safe)
    // ===============================
    function scrub(text) {
      if (!text) return "";

      let t = " " + text.toLowerCase() + " ";

      const forbiddenPhrases = [
        "fracture",
        "fractures",
        "disease",
        "clinical",
        "injury",
        "damage",
        "abnormality",
        "abnormalities",
        "rib involvement",
        "ribcage involvement",
        "could be indicative",
        "could indicate",
        "underlying cause",
        "underlying disease",
        "signs of",
        "important to",
        "carefully examine",
        "radiological",
        "pathology",
        "structural issue",
        "structural issues",
        "problem",
        "complication",
        "complications",
      ];

      forbiddenPhrases.forEach((p) => {
        const re = new RegExp(p, "gi");
        t = t.replace(re, " geometric variation ");
      });

      t = t.replace(
        /[^.]*?(fracture|disease|injury|damage|clinical|radiological)[^.]*\./gi,
        " "
      );

      return t.replace(/\s+/g, " ").trim();
    }

    summary = scrub(summary);
    for (const f of findings) {
      f.context = scrub(f.context);
      f.regionHint = scrub(f.regionHint);
    }

    // --- FINAL CLEANUP (E: grammar like "tvariation" → "variation") ---
    function finalClean(text) {
      if (!text) return text;
      let t = text;
      t = t.replace(/tvariation/gi, "variation");
      return t;
    }

    summary = finalClean(summary);
    for (const f of findings) {
      f.context = finalClean(f.context);
      f.regionHint = finalClean(f.regionHint);
    }

    return { findings, summary };
  } catch (err) {
    console.error("[WebLLM] ERROR:", err);
    return { findings: [], summary: "" };
  }
}
