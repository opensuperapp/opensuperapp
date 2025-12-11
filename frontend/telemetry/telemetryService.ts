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

import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { metrics, Meter } from "@opentelemetry/api";
import { Platform } from "react-native";
import * as Application from "expo-application";
import {
  OTEL_ENABLED,
  OTEL_COLLECTOR_URL,
  OTEL_SERVICE_NAME,
  OTEL_SERVICE_VERSION,
  OTEL_EXPORT_INTERVAL,
  OTEL_SAMPLE_RATE,
  // OTEL_API_KEY, // Uncomment for production
} from "@/constants/Constants";

let meter: Meter | null = null;
let isInitialized = false;

/**
 * Initialize OpenTelemetry metrics
 */
export const initializeTelemetry = async () => {
  if (!OTEL_ENABLED) {
    // console.log("[otel] Telemetry disabled (EXPO_PUBLIC_OTEL_ENABLED !== 'true')");
    return;
  }
  if (isInitialized) {
    // console.log("[otel] Telemetry already initialized");
    return;
  }

  // Apply sampling to reduce load at scale
  // Only initialize telemetry for sampled percentage of users
  if (Math.random() > OTEL_SAMPLE_RATE) {
    // console.log(`[otel] User not sampled (rate: ${OTEL_SAMPLE_RATE * 100}%)`);
    return;
  }

  try {
    // Get app version and build info
    const appVersion = Application.nativeApplicationVersion || OTEL_SERVICE_VERSION;
    const buildNumber = Application.nativeBuildVersion || "1";

    // Create resource with service information
    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]: OTEL_SERVICE_NAME,
      [SEMRESATTRS_SERVICE_VERSION]: appVersion,
      "service.namespace": "superapp",
      "deployment.environment": __DEV__ ? "development" : "production",
      "device.platform": Platform.OS,
      "app.build": buildNumber,
    });

    // Create OTLP exporter
    const base = OTEL_COLLECTOR_URL.replace(/\/$/, "");
    const exporter = new OTLPMetricExporter({
      url: `${base}/v1/metrics`,
      headers: {
        // Production: Uncomment to enable API key authentication
        // 'x-api-key': OTEL_API_KEY,
        // 'authorization': `Bearer ${OTEL_API_KEY}`, // Alternative: Bearer token
      },
    });

    // Create metric reader with export interval
    const metricReader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: OTEL_EXPORT_INTERVAL, // Configurable: 10s dev, 60s+ production
      exportTimeoutMillis: 10000, // 10 second timeout
    });

    // Create and configure meter provider
    const meterProvider = new MeterProvider({
      resource,
      readers: [metricReader],
    });

    // Set global meter provider
    metrics.setGlobalMeterProvider(meterProvider);

    // Get meter instance
    meter = metrics.getMeter(OTEL_SERVICE_NAME, appVersion);

    isInitialized = true;
    // console.log("OpenTelemetry metrics initialized successfully", {
    //   endpoint: `${base}/v1/metrics`,
    //   service: OTEL_SERVICE_NAME,
    //   version: appVersion,
    //   env: __DEV__ ? "development" : "production",
    // });
  } catch (error) {
    console.error("[otel] Failed to initialize OpenTelemetry:", error);
    // Continue without telemetry if initialization fails
  }
};

/**
 * Get the meter instance
 */
export const getMeter = (): Meter | null => {
  return meter;
};

/**
 * Check if telemetry is enabled and initialized
 */
export const isTelemetryReady = (): boolean => {
  return OTEL_ENABLED && isInitialized && meter !== null;
};

/**
 * Shutdown telemetry (cleanup)
 */
export const shutdownTelemetry = async () => {
  if (meter) {
    try {
      const provider = metrics.getMeterProvider();
      if (provider && "shutdown" in provider) {
        await (provider as any).shutdown();
      }
      meter = null;
      isInitialized = false;
    } catch (error) {
      console.error("Error shutting down telemetry:", error);
    }
  }
};

