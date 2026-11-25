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
import { useCallback } from "react";
import { useWindowDimensions } from "react-native";

/**
 * Window size classes. Breakpoints follow Material's window size classes:
 * compact < 600 (bar phone, folded Duo), medium 600–839 (unfolded Duo,
 * small tablet portrait), expanded >= 840.
 */
export type SizeClass = "compact" | "medium" | "expanded";

export const MEDIUM_MIN_WIDTH = 600;
export const EXPANDED_MIN_WIDTH = 840;
export const DEFAULT_MAX_CONTENT_WIDTH = 720;

export function sizeClassFor(width: number): SizeClass {
  if (width >= EXPANDED_MIN_WIDTH) return "expanded";
  if (width >= MEDIUM_MIN_WIDTH) return "medium";
  return "compact";
}

type Options = {
  /** Horizontal padding subtracted (on each side) from contentWidth. */
  horizontalPadding?: number;
  /** Cap for centered content on wide windows. */
  maxContentWidth?: number;
};

/**
 * Live window metrics. Built on useWindowDimensions so every consumer
 * re-renders when the window resizes (fold/unfold, rotation, split view).
 * Never read Dimensions.get() at module scope for layout — it is frozen.
 */
export function useResponsiveLayout(options: Options = {}) {
  const { horizontalPadding = 0, maxContentWidth = DEFAULT_MAX_CONTENT_WIDTH } =
    options;
  const { width, height } = useWindowDimensions();
  const sizeClass = sizeClassFor(width);

  const columns = useCallback(
    (byClass: Partial<Record<SizeClass, number>>): number =>
      byClass[sizeClass] ??
      byClass.medium ??
      byClass.compact ??
      1,
    [sizeClass]
  );

  return {
    width,
    height,
    sizeClass,
    isCompact: sizeClass === "compact",
    isLandscape: width > height,
    maxContentWidth,
    contentWidth: Math.min(width, maxContentWidth) - 2 * horizontalPadding,
    columns,
  };
}
