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

import { Platform } from "react-native";

export const CLIENT_ID = process.env.EXPO_PUBLIC_CLIENT_ID ?? "";
export const REDIRECT_URI = process.env.EXPO_PUBLIC_REDIRECT_URI ?? "";
export const TOKEN_URL = process.env.EXPO_PUBLIC_TOKEN_URL ?? "";
export const LOGOUT_URL = process.env.EXPO_PUBLIC_LOGOUT_URL ?? "";
export const AUTHORIZATION_URL = process.env.EXPO_PUBLIC_AUTHORIZATION_URL ?? "";
export const REVOCATION_URL = process.env.EXPO_PUBLIC_REVOCATION_URL ?? "";
export const ISSUER = process.env.EXPO_PUBLIC_ISSUER ?? "";
export const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? "";
export const MICRO_APP_STORAGE_DIR =
  process.env.EXPO_PUBLIC_MICRO_APP_STORAGE_DIR ?? "";
export const ARTICLE_BASE_URL = process.env.EXPO_PUBLIC_ARTICLE_BASE_URL ?? "";
export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
export const GOOGLE_ACCESS_TOKEN_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_ACCESS_TOKEN_KEY ?? "";
export const GOOGLE_REFRESH_TOKEN_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_REFRESH_TOKEN_KEY ?? "";
export const GOOGLE_USER_INFO_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_USER_INFO_KEY ?? "";
export const DEVELOPER_APP_DEFAULT_URL =
  process.env.EXPO_PUBLIC_DEVELOPER_APP_DEFAULT_URL ?? "";
// Interpret env as boolean: default true; set to "false" to disable
export const USE_BACKEND_TOKEN_EXCHANGE =
  (process.env.EXPO_PUBLIC_USE_BACKEND_TOKEN_EXCHANGE ?? "true") === "true";
// Authenticator Micro App ID
export const AUTHENTICATOR_APP_ID =
  process.env.EXPO_PUBLIC_AUTHENTICATOR_APP_ID ?? "";
export const GOOGLE_SCOPES = [
  "openid",
  "profile",
  "email",
  "https://www.googleapis.com/auth/drive.appdata",
];
export const GOOGLE_USER_INFO_URL =
  process.env.EXPO_PUBLIC_GOOGLE_USER_INFO_URL ?? "";
export const GOOGLE_TOKEN_URL = process.env.EXPO_PUBLIC_GOOGLE_TOKEN_URL ?? "";
export const GOOGLE_DRIVE_UPLOAD_URL =
  process.env.EXPO_PUBLIC_GOOGLE_DRIVE_UPLOAD_URL ?? "";
export const GOOGLE_DRIVE_LIST_FILES_URL =
  process.env.EXPO_PUBLIC_GOOGLE_DRIVE_LIST_FILES_URL ?? "";
export const GOOGLE_DRIVE_FILE_DOWNLOAD_URL = (fileId: string) =>
  `${
    process.env.EXPO_PUBLIC_GOOGLE_DRIVE_FILE_DOWNLOAD_URL ?? ""
  }${fileId}?alt=media`;
export const GOOGLE_TOKEN_INFO_URL = (accessToken: string) =>
  `${process.env.EXPO_PUBLIC_GOOGLE_TOKEN_INFO_URL ?? ""}${accessToken}`;
export const EVENTS_URL = process.env.EXPO_PUBLIC_EVENTS_URL ?? "";

export const SUCCESS = "success";
export const APPS = "apps";
export const AUTH_DATA = "authData";
export const DOWNLOADED = "downloaded";
export const NOT_DOWNLOADED = "not-downloaded";
export const USER_CONFIGURATIONS = "user-configurations";
export const APP_LIST_CONFIG_KEY = "superapp.apps.list";
export const USER_INFO = "user-info";
export const LAST_ACTIVE_PATH_KEY = "last-active-path";
export const EVENTS_STORAGE_KEY = "cached_events_feed";
export const EVENTS_TIMESTAMP_KEY = "cached_events_timestamp";
export const NEWS_URL = process.env.EXPO_PUBLIC_NEWS_URL ?? "";
export const NEWS_STORAGE_KEY = "cached_news_feed";
export const NEWS_TIMESTAMP_KEY = "cached_news_timestamp";
export const ALLOWED_BRIDGE_METHODS_CONFIG_KEY = "allowedFunctions";
export const isAndroid = Platform.OS === "android";
export const isIos = Platform.OS === "ios";
export const FULL_SCREEN_VIEWING_MODE = "fullscreen";
export const DEFAULT_VIEWING_MODE = "default";
// OpenTelemetry Configuration
export const OTEL_ENABLED = process.env.EXPO_PUBLIC_OTEL_ENABLED === "true";
export const OTEL_COLLECTOR_URL =
  process.env.EXPO_PUBLIC_OTEL_COLLECTOR_URL ?? "http://10.0.2.2:4318/";
export const OTEL_SERVICE_NAME =
  process.env.EXPO_PUBLIC_OTEL_SERVICE_NAME ?? "superapp-mobile";
export const OTEL_SERVICE_VERSION =
  process.env.EXPO_PUBLIC_OTEL_SERVICE_VERSION ?? "1.0.0";
// Use API key authentication for secure OTLP endpoint
// export const OTEL_API_KEY = process.env.EXPO_PUBLIC_OTEL_API_KEY ?? "";
// Note: Increase export interval to save battery (60s = 60000ms)
export const OTEL_EXPORT_INTERVAL =
  parseInt(process.env.EXPO_PUBLIC_OTEL_EXPORT_INTERVAL ?? "10000", 10);
// Note: Sample percentage (0.0-1.0) to reduce load at scale
export const OTEL_SAMPLE_RATE =
  parseFloat(process.env.EXPO_PUBLIC_OTEL_SAMPLE_RATE ?? "1.0");
