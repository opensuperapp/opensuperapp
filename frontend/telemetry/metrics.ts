// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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

import { Counter, Histogram } from "@opentelemetry/api";
import { getMeter, isTelemetryReady } from "./telemetryService";

/**
 * Focused metrics for debugging & profiling:
 * - App performance bottlenecks
 * - API latency & errors
 * - Screen navigation patterns
 * - Micro-app load issues
 * - Auth flow problems
 */

const METRIC_NAMES = {
  APP_START_TIME: "app.start.time",
  APP_CRASH_COUNT: "app.crash.count",
  APP_JS_ERROR_COUNT: "app.js.error.count",
  API_REQUEST_COUNT: "api.request.count",
  API_REQUEST_DURATION: "api.request.duration",
  API_REQUEST_ERROR_COUNT: "api.request.error.count",
  SCREEN_VIEW_COUNT: "screen.view.count",
  SCREEN_VIEW_DURATION: "screen.view.duration",
  MICRO_APP_LOAD_COUNT: "microapp.load.count",
  MICRO_APP_LOAD_DURATION: "microapp.load.duration",
  MICRO_APP_ERROR_COUNT: "microapp.error.count",
  AUTH_LOGIN_COUNT: "auth.login.count",
  AUTH_LOGOUT_COUNT: "auth.logout.count",
  AUTH_TOKEN_REFRESH_COUNT: "auth.token.refresh.count",
  AUTH_ERROR_COUNT: "auth.error.count",
} as const;

let metricsCache: {
  appStartTime?: Histogram;
  appCrashCount?: Counter;
  appJsErrorCount?: Counter;
  apiRequestCount?: Counter;
  apiRequestDuration?: Histogram;
  apiRequestErrorCount?: Counter;
  screenViewCount?: Counter;
  screenViewDuration?: Histogram;
  microAppLoadCount?: Counter;
  microAppLoadDuration?: Histogram;
  microAppErrorCount?: Counter;
  authLoginCount?: Counter;
  authLogoutCount?: Counter;
  authTokenRefreshCount?: Counter;
  authErrorCount?: Counter;
} = {};

const initializeMetrics = () => {
  if (!isTelemetryReady()) return;
  const meter = getMeter();
  if (!meter) return;

  metricsCache.appStartTime = meter.createHistogram(METRIC_NAMES.APP_START_TIME, {
    description: "App initialization time",
    unit: "ms",
  });
  metricsCache.appCrashCount = meter.createCounter(METRIC_NAMES.APP_CRASH_COUNT, {
    description: "Native crashes by error type",
  });
  metricsCache.appJsErrorCount = meter.createCounter(METRIC_NAMES.APP_JS_ERROR_COUNT, {
    description: "JavaScript errors by error type",
  });
  metricsCache.apiRequestCount = meter.createCounter(METRIC_NAMES.API_REQUEST_COUNT, {
    description: "Total API requests by endpoint, method, status",
  });
  metricsCache.apiRequestDuration = meter.createHistogram(METRIC_NAMES.API_REQUEST_DURATION, {
    description: "API request latency by endpoint",
    unit: "ms",
  });
  metricsCache.apiRequestErrorCount = meter.createCounter(METRIC_NAMES.API_REQUEST_ERROR_COUNT, {
    description: "Failed API requests with status codes",
  });
  metricsCache.screenViewCount = meter.createCounter(METRIC_NAMES.SCREEN_VIEW_COUNT, {
    description: "Screen view count by screen name",
  });
  metricsCache.screenViewDuration = meter.createHistogram(METRIC_NAMES.SCREEN_VIEW_DURATION, {
    description: "Time spent on each screen",
    unit: "ms",
  });
  metricsCache.microAppLoadCount = meter.createCounter(METRIC_NAMES.MICRO_APP_LOAD_COUNT, {
    description: "Micro app load count by app_id",
  });
  metricsCache.microAppLoadDuration = meter.createHistogram(METRIC_NAMES.MICRO_APP_LOAD_DURATION, {
    description: "Micro app load time by app_id",
    unit: "ms",
  });
  metricsCache.microAppErrorCount = meter.createCounter(METRIC_NAMES.MICRO_APP_ERROR_COUNT, {
    description: "Micro app errors by app_id and error_type",
  });
  metricsCache.authLoginCount = meter.createCounter(METRIC_NAMES.AUTH_LOGIN_COUNT, {
    description: "Login count by method",
  });
  metricsCache.authLogoutCount = meter.createCounter(METRIC_NAMES.AUTH_LOGOUT_COUNT, {
    description: "Logout count",
  });
  metricsCache.authTokenRefreshCount = meter.createCounter(METRIC_NAMES.AUTH_TOKEN_REFRESH_COUNT, {
    description: "Token refresh count (success/failure)",
  });
  metricsCache.authErrorCount = meter.createCounter(METRIC_NAMES.AUTH_ERROR_COUNT, {
    description: "Auth errors by error_type",
  });
};

const getMetrics = () => {
  if (Object.keys(metricsCache).length === 0) {
    initializeMetrics();
  }
  return metricsCache;
};

export const recordAppStartTime = (durationMs: number) => {
  getMetrics().appStartTime?.record(durationMs);
};

// App Error Tracking
export const recordAppCrash = (errorType: string, errorMessage?: string) => {
  getMetrics().appCrashCount?.add(1, {
    error_type: errorType,
    ...(errorMessage && { error_message: errorMessage.substring(0, 100) }),
  });
};

export const recordJsError = (errorType: string, errorMessage?: string, componentStack?: string) => {
  getMetrics().appJsErrorCount?.add(1, {
    error_type: errorType,
    ...(errorMessage && { error_message: errorMessage.substring(0, 100) }),
    ...(componentStack && { has_stack: "true" }),
  });
};

// API Metrics (auto-instrumented in requestHandler.ts)

export const recordApiRequest = (method: string, endpoint: string, statusCode?: number) => {
  getMetrics().apiRequestCount?.add(1, {
    method,
    endpoint: endpoint.replace(/\/[0-9a-f-]+/gi, "/:id"),
    status_code: statusCode?.toString() || "unknown",
  });
};

export const recordApiRequestDuration = (durationMs: number, method: string, endpoint: string) => {
  getMetrics().apiRequestDuration?.record(durationMs, {
    method,
    endpoint: endpoint.replace(/\/[0-9a-f-]+/gi, "/:id"),
  });
};

export const recordApiRequestError = (method: string, endpoint: string, statusCode?: number, errorType?: string) => {
  getMetrics().apiRequestErrorCount?.add(1, {
    method,
    endpoint: endpoint.replace(/\/[0-9a-f-]+/gi, "/:id"),
    status_code: statusCode?.toString() || "unknown",
    error_type: errorType || "http_error",
  });
};

export const recordScreenView = (screenName: string) => {
  getMetrics().screenViewCount?.add(1, { screen: screenName });
};

export const recordScreenViewDuration = (durationMs: number, screenName: string) => {
  getMetrics().screenViewDuration?.record(durationMs, { screen: screenName });
};

export const recordMicroAppLoad = (appId: string) => {
  getMetrics().microAppLoadCount?.add(1, { app_id: appId });
};

export const recordMicroAppLoadDuration = (durationMs: number, appId: string) => {
  getMetrics().microAppLoadDuration?.record(durationMs, { app_id: appId });
};

export const recordMicroAppError = (appId: string, errorType: string, errorMessage?: string) => {
  getMetrics().microAppErrorCount?.add(1, {
    app_id: appId,
    error_type: errorType,
    ...(errorMessage && { error_message: errorMessage.substring(0, 100) }),
  });
};

export const recordAuthLogin = (method: string = "oauth") => {
  getMetrics().authLoginCount?.add(1, { method });
};

export const recordAuthLogout = () => {
  getMetrics().authLogoutCount?.add(1);
};

export const recordAuthTokenRefresh = (success: boolean, errorType?: string) => {
  getMetrics().authTokenRefreshCount?.add(1, {
    success: success.toString(),
    ...(errorType && { error_type: errorType }),
  });
};

export const recordAuthError = (errorType: string, statusCode?: number) => {
  getMetrics().authErrorCount?.add(1, {
    error_type: errorType,
    ...(statusCode && { status_code: statusCode.toString() }),
  });
};
