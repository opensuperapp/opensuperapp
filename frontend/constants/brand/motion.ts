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
 * Choreo Labs motion. Live spec: ../reference/index.html and the handoff's motion-loaders.html.
 * Always respect the OS reduce-motion setting: show a static mark instead of Wheel/Wave.
 */

/** cubic-bezier control points [x1, y1, x2, y2] (use with Reanimated `Easing.bezier`). */
export const easing = {
  standard: [0.2, 0.8, 0.2, 1], // push, sheets, drawer, scale-in
  inOut: [0.45, 0, 0.55, 1], // Wave pulse
} as const;

/** Back-out easing used by the Wheel tick (c = 1.9). x in [0, 1]. */
export function wheelEase(x: number): number {
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
}

/** Durations in ms. */
export const duration = {
  push: 320,
  pop: 240,
  sheet: 380,
  drawer: 320,
  tabFade: 200,
  cardFlip: 600, // business card rotateY
  toast: 2200, // shown above the tab bar
  launchMin: 3200, // or until ready
  launchExit: 450, // mark scales to 1.12 + screen fades
  storeGet: 900, // Wheel in the Get pill before install
  storeRemove: 300,
  chatReplyPrototype: 750,
} as const;

export const press = {
  card: 0.985,
  icon: [0.92, 0.94], // icons, grid tiles
} as const;

export const launch = { exitScale: 1.12 } as const;

/**
 * Choreo mark geometry: 9 ellipses [cx, cy, rx, ry] in viewBox "-20 0 1375 1402".
 * Render with react-native-svg <Ellipse>. Mark aspect ratio 1375 / 1402.
 */
export const MARK_VIEWBOX = "-20 0 1375 1402";
export const MARK_E: ReadonlyArray<readonly [number, number, number, number]> = [
  [1121.72, 446.86, 213.06, 96.05],
  [994.89, 214.11, 205.12, 81.09],
  [742.48, 38.71, 223.72, 38.71],
  [1121.72, 954.99, 213.06, 96.05],
  [994.89, 1187.74, 205.12, 81.09],
  [742.48, 1363.14, 223.72, 38.71],
  [213.06, 700.92, 213.06, 96.05],
  [287.14, 933.67, 173.98, 81.09],
  [287.14, 468.17, 173.98, 81.09],
];

/**
 * Wheel = standard loader. Use for EVERY wait (launch, loads, in-button progress).
 * 10 slots in ring order; "G" is the invisible gap slot. Every `periodMs` each oval
 * advances one slot via a `moveMs` move eased with `wheelEase`. Fade/grow-in over `introMs`
 * (rx scales 0.6→1 and opacity 0→1 during intro).
 */
export const wheel = {
  slotOrder: [2, 1, 0, "G", 3, 4, 5, 7, 6, 8] as const,
  gap: { cx: 1180, cy: 700, rx: 150, ry: 8, opacity: 0 },
  periodMs: 460,
  moveMs: 300,
  introMs: 500,
} as const;

/**
 * Wave = AI only (assistant avatar, thinking/generating). Never a generic loader.
 * Each oval: scaleX 1→0.38→1, opacity 1→0.4→1 over `pulseMs`, easing.inOut, infinite.
 * Delay per oval = (cy / 1402) * maxStaggerMs. Scale-in first: scaleX 0.15→1, opacity 0→1 over introMs.
 */
export const wave = {
  pulseMs: 1400,
  minScaleX: 0.38,
  minOpacity: 0.4,
  maxStaggerMs: 550,
  introMs: 700,
  introFromScaleX: 0.15,
} as const;

/** Feed hero ambient motion. */
export const hero = {
  artworkPanMs: 28000, // background-position 40%/50% → 62%/38%, alternate; artwork at 150%
  markSwayMs: 4800, // each oval translateX ±5%, scaleX 0.94–1.04, alternate
  markSwayMaxDelayMs: 1600, // staggered by distance from vertical centre
  textFadeUpMs: 700, // fade up 8px
  textFadeUpOffset: 8,
  textStaggerMs: 80,
} as const;
