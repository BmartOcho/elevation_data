// profileAnalysis.ts (TypeScript) — can also run as JS by removing types

type Point = { lat: number; lon: number; elev_m: number };

type ProfileJSON = {
  total_m?: number;
  step_m?: number;
  points: Point[];
};

type AnalyzeOptions = {
  txHeight_m: number;          // antenna height above local ground at first point
  rxHeight_m: number;          // antenna height above local ground at last point
  freqMHz: number;             // e.g., 915
  fresnelZone?: 1 | 0.6;       // 1 = full Fresnel; 0.6 common planning threshold
  kFactor?: number;            // 4/3 typical "effective Earth radius" refraction
  smoothing?: "median3" | "none";
  decimateTo?: number;         // target number of points for plotting (e.g., 800)
};

type Obstruction = {
  idx: number;
  dist_m: number;
  lat: number;
  lon: number;
  terrain_m: number;
  los_m: number;
  bulge_m: number;
  clearance_m: number;         // terrain+bulge - los (positive means blocks LOS)
  fresnelRadius_m: number;
  fresnelClearance_m: number;  // los - (terrain+bulge) - fresnelRadius (positive means clears Fresnel)
};

type AnalyzeResult = {
  n: number;
  totalDist_m: number;
  dist_m: Float64Array;        // cumulative distance
  elevRaw_m: Float64Array;
  elevDisplay_m: Float64Array; // smoothed (for plotting only)
  // endpoints:
  txGround_m: number;
  rxGround_m: number;
  txAntennaASL_m: number;      // above sea level
  rxAntennaASL_m: number;
  // summary:
  minElev_m: number;
  maxElev_m: number;
  totalAscent_m: number;       // raw
  totalDescent_m: number;      // raw
  // LOS/Fresnel:
  worstLOS: Obstruction;       // worst LOS blocker (max clearance_m)
  worstFresnel: Obstruction;   // worst Fresnel shortfall (most negative fresnelClearance_m)
  losClear: boolean;
  fresnelClear: boolean;
  // plotting payload (decimated):
  plot: {
    dist_m: number[];
    elevRaw_m: number[];
    elevDisplay_m: number[];
    // optional markers:
    worstLOS: { dist_m: number; elev_m: number };
    worstFresnel: { dist_m: number; elev_m: number };
  };
};

// -------------------- math helpers --------------------

const DEG2RAD = Math.PI / 180;
function haversine_m(a: Point, b: Point): number {
  // WGS84-ish spherical approximation
  const R = 6371008.8; // meters
  const dLat = (b.lat - a.lat) * DEG2RAD;
  const dLon = (b.lon - a.lon) * DEG2RAD;
  const lat1 = a.lat * DEG2RAD;
  const lat2 = b.lat * DEG2RAD;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function median3(a: number, b: number, c: number): number {
  // median of three without sorting arrays
  if (a > b) [a, b] = [b, a];
  if (b > c) [b, c] = [c, b];
  if (a > b) [a, b] = [b, a];
  return b;
}

function smoothMedian3(y: Float64Array): Float64Array {
  const n = y.length;
  if (n <= 2) return y.slice() as Float64Array;
  const out = new Float64Array(n);
  out[0] = y[0];
  for (let i = 1; i < n - 1; i++) {
    out[i] = median3(y[i - 1], y[i], y[i + 1]);
  }
  out[n - 1] = y[n - 1];
  return out;
}

// Fresnel radius for zone 1 at a point along the path
// d1 and d2 in meters, freqMHz in MHz
function fresnelRadius_m(d1: number, d2: number, freqMHz: number): number {
  // r = sqrt( (lambda * d1 * d2) / (d1 + d2) )
  const c = 299792458;
  const fHz = freqMHz * 1e6;
  const lambda = c / fHz;
  return Math.sqrt((lambda * d1 * d2) / (d1 + d2));
}

function earthBulge_m(d1: number, d2: number, kFactor: number): number {
  // bulge at point relative to straight chord between endpoints (approx)
  // bulge = d1*d2/(2*Reff), where Reff = k*R
  const R = 6371008.8;
  const Reff = kFactor * R;
  return (d1 * d2) / (2 * Reff);
}

function totalAscentDescent(y: Float64Array): { ascent: number; descent: number } {
  let ascent = 0;
  let descent = 0;
  for (let i = 1; i < y.length; i++) {
    const dy = y[i] - y[i - 1];
    if (dy > 0) ascent += dy;
    else descent += -dy;
  }
  return { ascent, descent };
}

function minMax(y: Float64Array): { min: number; max: number } {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < y.length; i++) {
    const v = y[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

function decimateIndices(n: number, target: number): number[] {
  if (!target || target >= n) return Array.from({ length: n }, (_, i) => i);
  const step = (n - 1) / (target - 1);
  const idx: number[] = [];
  for (let k = 0; k < target; k++) {
    idx.push(Math.round(k * step));
  }
  // Ensure monotonic unique
  const out: number[] = [];
  let last = -1;
  for (const i of idx) {
    if (i !== last) out.push(i);
    last = i;
  }
  if (out[out.length - 1] !== n - 1) out.push(n - 1);
  return out;
}

// -------------------- main analyze --------------------

export function analyzePathProfile(data: ProfileJSON, opts: AnalyzeOptions): AnalyzeResult {
  const points = data.points;
  if (!points || points.length < 2) throw new Error("Need at least 2 points");

  const n = points.length;
  const dist = new Float64Array(n);
  dist[0] = 0;
  for (let i = 1; i < n; i++) {
    dist[i] = dist[i - 1] + haversine_m(points[i - 1], points[i]);
  }
  const totalDist = dist[n - 1];

  const elevRaw = new Float64Array(n);
  for (let i = 0; i < n; i++) elevRaw[i] = points[i].elev_m;

  const smoothing = opts.smoothing ?? "median3";
  const elevDisplay =
    smoothing === "median3" ? smoothMedian3(elevRaw) : (elevRaw.slice() as Float64Array);

  const { min, max } = minMax(elevRaw);
  const { ascent, descent } = totalAscentDescent(elevRaw);

  const kFactor = opts.kFactor ?? 4 / 3;
  const fresnelZone = opts.fresnelZone ?? 0.6;

  const txGround = elevRaw[0];
  const rxGround = elevRaw[n - 1];
  const txASL = txGround + opts.txHeight_m;
  const rxASL = rxGround + opts.rxHeight_m;

  // Straight LOS line (ASL) between antennas:
  // los(i) = txASL + (rxASL - txASL) * (dist[i] / totalDist)
  let worstLOS: Obstruction | null = null;
  let worstFresnel: Obstruction | null = null;

  for (let i = 1; i < n - 1; i++) {
    const d1 = dist[i];
    const d2 = totalDist - dist[i];
    const los = txASL + (rxASL - txASL) * (d1 / totalDist);

    const bulge = earthBulge_m(d1, d2, kFactor);
    const terrain = elevRaw[i];

    // LOS clearance vs terrain+bulge:
    // positive clearance_m here means "terrain+bulge is ABOVE LOS" (i.e., it blocks)
    const clearance = (terrain + bulge) - los;

    const rF1 = fresnelRadius_m(d1, d2, opts.freqMHz) * fresnelZone;
    // Fresnel clearance: positive means LOS is above (terrain+bulge + Fresnel radius)
    const fresnelClear = los - (terrain + bulge) - rF1;

    const obj: Obstruction = {
      idx: i,
      dist_m: d1,
      lat: points[i].lat,
      lon: points[i].lon,
      terrain_m: terrain,
      los_m: los,
      bulge_m: bulge,
      clearance_m: clearance,
      fresnelRadius_m: rF1,
      fresnelClearance_m: fresnelClear,
    };

    if (!worstLOS || obj.clearance_m > worstLOS.clearance_m) worstLOS = obj;

    // "Worst Fresnel" = minimum fresnelClearance (most negative)
    if (!worstFresnel || obj.fresnelClearance_m < worstFresnel.fresnelClearance_m) {
      worstFresnel = obj;
    }
  }

  // If path is tiny, loop above may not set worst; fallback:
  if (!worstLOS) {
    worstLOS = {
      idx: 0, dist_m: 0, lat: points[0].lat, lon: points[0].lon,
      terrain_m: elevRaw[0], los_m: txASL, bulge_m: 0,
      clearance_m: (elevRaw[0]) - txASL,
      fresnelRadius_m: 0, fresnelClearance_m: Infinity
    };
  }
  if (!worstFresnel) worstFresnel = worstLOS;

  const losClear = worstLOS.clearance_m <= 0; // no point rises above LOS
  const fresnelClear = worstFresnel.fresnelClearance_m >= 0;

  // Build decimated plot payload
  const target = opts.decimateTo ?? 800;
  const idx = decimateIndices(n, target);
  const plotDist: number[] = [];
  const plotRaw: number[] = [];
  const plotDisp: number[] = [];
  for (const i of idx) {
    plotDist.push(dist[i]);
    plotRaw.push(elevRaw[i]);
    plotDisp.push(elevDisplay[i]);
  }

  return {
    n,
    totalDist_m: totalDist,
    dist_m: dist,
    elevRaw_m: elevRaw,
    elevDisplay_m: elevDisplay,
    txGround_m: txGround,
    rxGround_m: rxGround,
    txAntennaASL_m: txASL,
    rxAntennaASL_m: rxASL,
    minElev_m: min,
    maxElev_m: max,
    totalAscent_m: ascent,
    totalDescent_m: descent,
    worstLOS,
    worstFresnel,
    losClear,
    fresnelClear,
    plot: {
      dist_m: plotDist,
      elevRaw_m: plotRaw,
      elevDisplay_m: plotDisp,
      worstLOS: { dist_m: worstLOS.dist_m, elev_m: worstLOS.terrain_m },
      worstFresnel: { dist_m: worstFresnel.dist_m, elev_m: worstFresnel.terrain_m },
    },
  };
}

// -------------------- CLI runner (optional) --------------------
// node profileAnalysis.js ./test.json
if (typeof require !== "undefined" && require.main === module) {
  const fs = require("fs");
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node profileAnalysis.js <path_to_json>");
    process.exit(1);
  }
  const raw = fs.readFileSync(path, "utf8");
  const data = JSON.parse(raw);

  // Example options (edit for your use):
  const res = analyzePathProfile(data, {
    txHeight_m: 5,
    rxHeight_m: 5,
    freqMHz: 915,
    fresnelZone: 0.6,
    kFactor: 4 / 3,
    smoothing: "median3",
    decimateTo: 800,
  });

  console.log(JSON.stringify({
    n: res.n,
    totalDist_m: res.totalDist_m,
    losClear: res.losClear,
    fresnelClear: res.fresnelClear,
    worstLOS: res.worstLOS,
    worstFresnel: res.worstFresnel,
    plotPoints: res.plot.dist_m.length
  }, null, 2));
}
