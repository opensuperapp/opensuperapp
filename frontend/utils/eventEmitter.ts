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
import { Event } from "@/constants/Event";
import { NativeEventEmitter, NativeModules, Platform } from "react-native";

type EventHandler<T> = (data: T) => void;

class EventEmitter<T> {
  private listeners: Map<Event, Set<EventHandler<T>>> = new Map();
  private nativeEmitter?: NativeEventEmitter;

  constructor() {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      if (NativeModules.DeviceEventEmitter) {
        this.nativeEmitter = new NativeEventEmitter(
          NativeModules.DeviceEventEmitter
        );
      }
    }
  }

  /**
   * Add a listener for a specific event.
   * @param event - The event to listen for.
   * @param handler - The handler to call when the event is emitted.
   * @returns A function to remove the listener.
   */
  on(event: Event, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => this.off(event, handler);
  }

  /**
   * Remove a listener for a specific event.
   * @param event - The event to remove the listener for.
   * @param handler - The handler to remove.
   */
  off(event: Event, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event with data.
   * @param event - The event to emit.
   * @param data - The data to emit.
   */
  emit(event: Event, data: T): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }

    if (this.nativeEmitter) {
      this.nativeEmitter.emit(event, data);
    }
  }

  /**
   * Remove all listeners for a specific event.
   * @param event - The event to remove all listeners for.
   */
  removeAllListeners(event?: Event): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// List of event emitters
const qrScannerEmitter = new EventEmitter<string>();

export { qrScannerEmitter };
