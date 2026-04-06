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

import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const OFFLINE_QUEUE_KEY = "offline_queue";
const MAX_QUEUE_SIZE = 100;

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  timestamp: number;
  retryCount: number;
}

let isReplaying = false;

export async function addToQueue(request: Omit<QueuedRequest, "id" | "timestamp" | "retryCount">): Promise<void> {
  try {
    const queue = await getQueue();

    if (queue.length >= MAX_QUEUE_SIZE) {
      console.warn("Offline queue is full, removing oldest request");
      queue.shift();
    }

    const queuedRequest: QueuedRequest = {
      ...request,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    queue.push(queuedRequest);
    await saveQueue(queue);
  } catch (error) {
    console.error("Failed to add request to offline queue:", error);
  }
}

export async function getQueue(): Promise<QueuedRequest[]> {
  try {
    const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (queueJson) {
      return JSON.parse(queueJson);
    }
  } catch (error) {
    console.error("Failed to get offline queue:", error);
  }
  return [];
}

async function saveQueue(queue: QueuedRequest[]): Promise<void> {
  try {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Failed to save offline queue:", error);
  }
}

export async function clearQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (error) {
    console.error("Failed to clear offline queue:", error);
  }
}

export async function removeFromQueue(requestId: string): Promise<void> {
  try {
    const queue = await getQueue();
    const updatedQueue = queue.filter((request) => request.id !== requestId);
    await saveQueue(updatedQueue);
  } catch (error) {
    console.error("Failed to remove request from offline queue:", error);
  }
}

export async function replayQueue(): Promise<void> {
  if (isReplaying) {
    return;
  }

  try {
    isReplaying = true;
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      return;
    }

    const queue = await getQueue();

    for (const request of queue) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });

        if (response.ok) {
          await removeFromQueue(request.id);
        } else {
          request.retryCount++;

          if (request.retryCount >= 3) {
            console.warn(`Request ${request.id} failed after 3 retries, removing from queue`);
            await removeFromQueue(request.id);
          } else {
            await saveQueue(queue);
          }
        }
      } catch (error) {
        console.error(`Failed to replay request ${request.id}:`, error);
        request.retryCount++;

        if (request.retryCount >= 3) {
          console.warn(`Request ${request.id} failed after 3 retries, removing from queue`);
          await removeFromQueue(request.id);
        } else {
          await saveQueue(queue);
        }
      }
    }
  } finally {
    isReplaying = false;
  }
}

export function setupOfflineQueueReplay(): () => void {
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected && state.isInternetReachable) {
      await replayQueue();
    }
  });

  return unsubscribe;
}

export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
