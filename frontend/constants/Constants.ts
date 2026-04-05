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
import { Platform } from "react-native";

// Environment flags
export const TRUE = "true";
export const FALSE = "false";

export const CLIENT_ID = process.env.EXPO_PUBLIC_CLIENT_ID ?? "";
export const REDIRECT_URI = process.env.EXPO_PUBLIC_REDIRECT_URI ?? "";
export const TOKEN_URL = process.env.EXPO_PUBLIC_TOKEN_URL ?? "";
export const LOGOUT_URL = process.env.EXPO_PUBLIC_LOGOUT_URL ?? "";
export const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? "";
export const MICRO_APP_STORAGE_DIR =
  process.env.EXPO_PUBLIC_MICRO_APP_STORAGE_DIR ?? "";
export const ARTICLE_BASE_URL = process.env.EXPO_PUBLIC_ARTICLE_BASE_URL ?? "";
export const LIBRARY_URL = process.env.EXPO_PUBLIC_LIBRARY_URL ?? "";
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
export const LIBRARY_ARTICLE_FALLBACK_IMAGE =
  process.env.EXPO_PUBLIC_LIBRARY_ARTICLE_FALLBACK_IMAGE ?? "";
// Please note that the developer app-related URL is required only for the WSO2 Super App.
export const DEVELOPER_APP_IOS_DEFAULT_URL =
  process.env.EXPO_PUBLIC_DEVELOPER_APP_IOS_DEFAULT_URL ?? "";
export const DEVELOPER_APP_ANDROID_DEFAULT_URL =
  process.env.EXPO_PUBLIC_DEVELOPER_APP_ANDROID_DEFAULT_URL ?? "";
export const ENABLE_FIREBASE = process.env.EXPO_PUBLIC_ENABLE_FIREBASE === TRUE;
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
export const LOCAL_NOTIFICATIONS_KEY =
  process.env.EXPO_PUBLIC_LOCAL_NOTIFICATIONS_KEY ?? "";
export const NOTIFICATION_LEAD_TIME_MINUTES = 10;

export const SUCCESS = "success";
export const APPS = "apps";
export const AUTH_DATA = "authData";
export const DOWNLOADED = "downloaded";
export const NOT_DOWNLOADED = "not-downloaded";
export const USER_CONFIGURATIONS = "user-configurations";
export const APP_LIST_CONFIG_KEY = "superapp.apps.list";
export const USER_INFO = "user-info";
export const LAST_ACTIVE_PATH_KEY = "last-active-path";
export const LIBRARY_STORAGE_KEY = "cached_library_feed";
export const LIBRARY_TIMESTAMP_KEY = "cached_library_timestamp";
export const LIBRARY_ARTICLE_FETCH_LIMIT = 12;
export const EVENTS_STORAGE_KEY = "cached_events_feed";
export const EVENTS_TIMESTAMP_KEY = "cached_events_timestamp";
export const NEWS_URL = process.env.EXPO_PUBLIC_NEWS_URL ?? "";
export const NEWS_STORAGE_KEY = "cached_news_feed";
export const NEWS_TIMESTAMP_KEY = "cached_news_timestamp";
export const APP_UPDATE_CHECK_TIMESTAMP_KEY = "app_update_check_timestamp";
export const FULL_SCREEN_VIEWING_MODE = "fullscreen";
export const DEFAULT_VIEWING_MODE = "default";

// Keys for Secure Store
export const LAST_SENT_FCM_TOKEN = "last_sent_fcm_token";
export const ACCESS_TOKEN = "secure_access_token";
export const REFRESH_TOKEN = "secure_refresh_token";
export const ID_TOKEN = "secure_id_token";
export const EXPIRES_AT_KEY = "secure_expires_at";
export const AUTH_EMAIL_KEY = "secure_auth_email";
export const USER_ID_KEY = "secure_userid";

// Keys for Async Storage
export const LAST_NOTIFICATION_OPENED_AT = "last_notification_opened_at";
export const ALARM_PERMISSION_PROMPTED_KEY = "alarm_permission_prompted";
export const PENDING_NOTIFICATION_NAVIGATION = "pending_notification_navigation";

// Android Notification Configuration
export const NOTIFICATION_CHANNEL_ID =
  process.env.EXPO_PUBLIC_NOTIFICATION_CHANNEL_ID ??
  "default_superapp_notification_channel";
export const NOTIFICATION_CHANNEL_NAME =
  process.env.EXPO_PUBLIC_NOTIFICATION_CHANNEL_NAME ??
  "Default SuperApp Notification Channel";
export const ANDROID_NOTIFICATION_SMALL_ICON_ACCENT_COLOR =
  process.env.EXPO_PUBLIC_ANDROID_NOTIFICATION_SMALL_ICON_ACCENT_COLOR;

// Platform
export const isAndroid = Platform.OS === "android";
export const isIos = Platform.OS === "ios";

// Query Keys
export const NOTIFICATIONS_QUERY_KEY = "notifications";

// Chat Agent
export const CHAT_AGENT_URL = process.env.EXPO_PUBLIC_CHAT_AGENT_URL ?? "";
export const WSO2_EMAIL_DOMAIN = "@wso2.com";

// Tab Names
export const FEED_TAB_NAME = "Feed";
export const LIBRARY_TAB_NAME = "Library";
export const MY_APPS_TAB_NAME = "My Apps";
export const CHAT_TAB_NAME = "Chat";
export const PROFILE_TAB_NAME = "Profile";

// Firebase Remote Config parameter key for tab bar visibility JSON.
export const TAB_VISIBILITY_RULES_REMOTE_CONFIG_KEY = "tab_visibility_rules";

// Basename of Android `res/xml/` and iOS bundle plist produced on prebuild.
export const TAB_VISIBILITY_RC_DEFAULTS_RESOURCE_NAME =
  "remote_config_tab_visibility_defaults";
