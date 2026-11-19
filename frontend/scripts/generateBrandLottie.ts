// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

/**
 * Bakes the Choreo Labs motion spec into Lottie files.
 *
 *   npx tsx scripts/generateBrandLottie.ts
 *
 * Writes assets/brand/lottie/{wheel,wave,hero-mark}.json. Each file is one seamless
 * loop; the intro (fade/grow-in) is played by the React component, not the file.
 * Every oval sits in a single shape layer named "mark" so the colour can be swapped
 * at runtime with lottie-react-native `colorFilters: [{ keypath: "mark", color }]`.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  MARK_E,
  easing,
  hero,
  wave,
  wheel,
  wheelEase,
} from "../constants/brand/motion";

type Vec = number[];
interface Keyframe {
  t: number;
  s: Vec;
  i?: { x: number[]; y: number[] };
  o?: { x: number[]; y: number[] };
}

const FPS = 60;
const OUT_DIR = join(__dirname, "..", "assets", "brand", "lottie");
const round = (n: number) => Math.round(n * 100) / 100;

/** Solve a CSS cubic-bezier(x1,y1,x2,y2) for progress x in [0,1]. */
function cubicBezier([x1, y1, x2, y2]: readonly number[]) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  return (x: number) => {
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (sx(mid) < x) lo = mid;
      else hi = mid;
    }
    return sy((lo + hi) / 2);
  };
}

/**
 * Linear keyframes from per-frame samples. Each segment is stretched as far as every
 * skipped sample stays within `tol` of the straight line, so the error is invisible
 * (the mark is drawn in a ~1400-unit space and rendered at under 150px).
 */
function track(samples: Vec[], tol = 1.5): { a: 1; k: Keyframe[] } | { a: 0; k: Vec } {
  const same = (a: Vec, b: Vec) => a.every((v, i) => Math.abs(v - b[i]) < 0.005);
  if (samples.every((s) => same(s, samples[0]))) return { a: 0, k: samples[0] };
  const fits = (from: number, to: number) => {
    for (let f = from + 1; f < to; f++) {
      const u = (f - from) / (to - from);
      const ok = samples[f].every(
        (v, i) => Math.abs(v - (samples[from][i] + (samples[to][i] - samples[from][i]) * u)) <= tol
      );
      if (!ok) return false;
    }
    return true;
  };
  const keep: number[] = [0];
  let from = 0;
  while (from < samples.length - 1) {
    let to = from + 1;
    while (to + 1 < samples.length && fits(from, to + 1)) to++;
    keep.push(to);
    from = to;
  }
  const dims = samples[0].length;
  const lin = { i: { x: Array(dims).fill(1), y: Array(dims).fill(1) }, o: { x: Array(dims).fill(0), y: Array(dims).fill(0) } };
  return {
    a: 1,
    k: keep.map((f, idx) =>
      idx === keep.length - 1 ? { t: f, s: samples[f] } : { t: f, s: samples[f], ...lin }
    ),
  };
}

interface OvalFrame {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  sx: number; // scaleX percent
  op: number; // opacity percent
}

function ovalGroup(name: string, frames: OvalFrame[]) {
  const pos = track(frames.map((f) => [round(f.cx), round(f.cy)]));
  return {
    ty: "gr",
    nm: name,
    it: [
      {
        ty: "el",
        nm: "ellipse",
        d: 1,
        p: { a: 0, k: [0, 0] },
        s: track(frames.map((f) => [round(f.rx * 2), round(f.ry * 2)])),
      },
      { ty: "fl", nm: "fill", c: { a: 0, k: [1, 1, 1, 1] }, o: { a: 0, k: 100 }, r: 1 },
      {
        ty: "tr",
        nm: "transform",
        p: pos,
        a: { a: 0, k: [0, 0] },
        s: track(frames.map((f) => [round(f.sx), 100])),
        r: { a: 0, k: 0 },
        o: track(frames.map((f) => [round(f.op)])),
        sk: { a: 0, k: 0 },
        sa: { a: 0, k: 0 },
      },
    ],
  };
}

/** Unwrap single-dimension opacity tracks: Lottie expects scalars, not [v]. */
function scalarise(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(scalarise);
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (obj.ty === "tr") {
      const o = obj.o as { a: number; k: unknown };
      if (o.a === 0) o.k = (o.k as number[])[0];
      else
        (o.k as Keyframe[]).forEach((kf) => {
          (kf as unknown as { s: number[] }).s = [kf.s[0]];
          if (kf.i) kf.i = { x: [kf.i.x[0]], y: [kf.i.y[0]] };
          if (kf.o) kf.o = { x: [kf.o.x[0]], y: [kf.o.y[0]] };
        });
    }
    for (const k of Object.keys(obj)) obj[k] = scalarise(obj[k]);
  }
  return node;
}

function composition(name: string, w: number, h: number, frames: number, shapes: unknown[]) {
  return scalarise({
    v: "5.7.4",
    fr: FPS,
    ip: 0,
    op: frames,
    w,
    h,
    nm: name,
    ddd: 0,
    assets: [],
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: "mark",
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [0, 0, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes,
        ip: 0,
        op: frames,
        st: 0,
        bm: 0,
      },
    ],
  });
}

// Mark viewBox is "-20 0 1375 1402": shift x by +20 so it starts at 0.
const MARK_W = 1375;
const MARK_H = 1402;
const MARK_DX = 20;

/** Wheel: 10 slots, every period each oval advances one slot with a back-out move. */
function buildWheel() {
  const slots = wheel.slotOrder.map((k) =>
    k === "G"
      ? [wheel.gap.cx, wheel.gap.cy, wheel.gap.rx, wheel.gap.ry, wheel.gap.opacity]
      : [...MARK_E[k], 1]
  );
  const period = wheel.periodMs / 1000;
  const move = wheel.moveMs / 1000;
  const total = Math.round(slots.length * period * FPS); // 10 ticks = every oval home again
  const ovals = slots.map((_, j) => {
    const frames: OvalFrame[] = [];
    for (let f = 0; f <= total; f++) {
      const t = f / FPS;
      const k = Math.floor(t / period + 1e-9);
      const p = wheelEase(Math.min(1, (t - k * period) / move));
      const a = slots[(j + k) % slots.length];
      const b = slots[(j + k + 1) % slots.length];
      const L = (i: number) => a[i] + (b[i] - a[i]) * p;
      frames.push({
        cx: L(0) + MARK_DX,
        cy: L(1),
        rx: Math.max(0, L(2)),
        ry: Math.max(0, L(3)),
        sx: 100,
        op: Math.max(0, Math.min(1, L(4))) * 100,
      });
    }
    return ovalGroup(`oval ${j}`, frames);
  });
  return composition("Choreo Labs Wheel", MARK_W, MARK_H, total, ovals);
}

/** Wave: each oval breathes scaleX 1→.38 and opacity 1→.4, staggered by height. */
function buildWave() {
  const pulse = wave.pulseMs / 1000;
  const ease = cubicBezier(easing.inOut);
  const total = Math.round(pulse * FPS);
  const ovals = MARK_E.map(([cx, cy, rx, ry], j) => {
    const delay = (cy / MARK_H) * (wave.maxStaggerMs / 1000);
    const frames: OvalFrame[] = [];
    for (let f = 0; f <= total; f++) {
      const phase = ((((f / FPS - delay) / pulse) % 1) + 1) % 1;
      // 0→.5: 1→min, .5→1: min→1, each half eased in-out (CSS per-keyframe easing).
      const half = phase < 0.5 ? ease(phase * 2) : 1 - ease((phase - 0.5) * 2);
      frames.push({
        cx: cx + MARK_DX,
        cy,
        rx,
        ry,
        sx: (1 - (1 - wave.minScaleX) * half) * 100,
        op: (1 - (1 - wave.minOpacity) * half) * 100,
      });
    }
    return ovalGroup(`oval ${j}`, frames);
  });
  return composition("Choreo Labs Wave", MARK_W, MARK_H, total, ovals);
}

/** Feed hero: each oval sways translateX ±5% and scaleX .94–1.04, alternate, staggered from centre. */
function buildHeroMark() {
  const half = hero.markSwayMs / 1000;
  const ease = cubicBezier(easing.inOut);
  const total = Math.round(half * 2 * FPS);
  // Hero viewBox is "-120 0 1575 1402": room for the sway.
  const W = 1575;
  const DX = 120;
  const ovals = MARK_E.map(([cx, cy, rx, ry], j) => {
    const offset = (Math.abs(cy - MARK_H / 2) / (MARK_H / 2)) * (hero.markSwayMaxDelayMs / 1000);
    const frames: OvalFrame[] = [];
    for (let f = 0; f <= total; f++) {
      // CSS negative delay: the animation is already `offset` seconds in at t = 0.
      const t = ((f / FPS + offset) % (half * 2) + half * 2) % (half * 2);
      const p = t < half ? ease(t / half) : ease(1 - (t - half) / half);
      const tx = -0.05 + 0.1 * p; // fraction of the oval's own width
      frames.push({
        cx: cx + DX + tx * rx * 2,
        cy,
        rx,
        ry,
        sx: (0.94 + 0.1 * p) * 100,
        op: 100,
      });
    }
    return ovalGroup(`oval ${j}`, frames);
  });
  return composition("Choreo Labs Hero Mark", W, MARK_H, total, ovals);
}

const outputs: Record<string, unknown> = {
  "wheel.json": buildWheel(),
  "wave.json": buildWave(),
  "hero-mark.json": buildHeroMark(),
};
for (const [file, json] of Object.entries(outputs)) {
  const path = join(OUT_DIR, file);
  writeFileSync(path, JSON.stringify(json));
  console.log(`wrote ${path}`);
}
