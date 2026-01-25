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
import { WebBrowserPresentationStyle } from "expo-web-browser";

// Enum for dismiss button styles used in iOS browser modals
export enum DismissButtonStyle {
  Close = "close",
  Done = "done",
  Cancel = "cancel",
}

// Enum for supported Web Browser presentation styles
export enum PresentationStyle {
  FullScreen = "FullScreen",
  Automatic = "Automatic",
  FormSheet = "FormSheet",
  CurrentContext = "CurrentContext",
  OverCurrentContext = "OverCurrentContext",
  OverFullScreen = "OverFullScreen",
  PageSheet = "PageSheet",
  Popover = "Popover",
}

// Browser config object for opening URLs in the in app browser
export interface BrowserConfig {
  url: string;
  presentationStyle: PresentationStyle;
  dismissButtonStyle?: DismissButtonStyle;
  showTitle?: boolean;
  showInRecents?: boolean;
  readerMode?: boolean;
  enableBarCollapsing?: boolean;
  createTask?: boolean;
}

// Utility function that maps PresentationStyle enum
export const mapToWebBrowserPresentationStyle = (
  presentationStyle?: PresentationStyle
): WebBrowserPresentationStyle => {
  switch (presentationStyle) {
    case PresentationStyle.Automatic:
      return WebBrowserPresentationStyle.AUTOMATIC;
    case PresentationStyle.FullScreen:
      return WebBrowserPresentationStyle.FULL_SCREEN;
    case PresentationStyle.FormSheet:
      return WebBrowserPresentationStyle.FORM_SHEET;
    case PresentationStyle.CurrentContext:
      return WebBrowserPresentationStyle.CURRENT_CONTEXT;
    case PresentationStyle.OverCurrentContext:
      return WebBrowserPresentationStyle.OVER_CURRENT_CONTEXT;
    case PresentationStyle.OverFullScreen:
      return WebBrowserPresentationStyle.OVER_FULL_SCREEN;
    case PresentationStyle.PageSheet:
      return WebBrowserPresentationStyle.PAGE_SHEET;
    case PresentationStyle.Popover:
      return WebBrowserPresentationStyle.POPOVER;
    default:
      return WebBrowserPresentationStyle.AUTOMATIC;
  }
};

// Interface for ScheduledNotificationIdentifiable
export interface ScheduledNotificationIdentifiable {
  id: string;
}

// Interface for ScheduledNotificationData
export interface ScheduledNotificationData
  extends ScheduledNotificationIdentifiable {
  title: string;
  body: string;
  time: Date;
}
