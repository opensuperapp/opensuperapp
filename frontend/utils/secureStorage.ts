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

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_DATA, USER_CONFIGURATIONS } from '@/constants/Constants';
/**
 * Secure Storage Wrapper
 * 
 * Provides a drop-in replacement for AsyncStorage that uses SecureStore
 * for sensitive data (auth tokens, user info, Google tokens) and AsyncStorage
 * for non-sensitive data (news cache, events cache, UI preferences).
 */

// Keys that should use SecureStore (sensitive data)
// Note: Redux persist keys are NOT included here because SecureStore has a 2048 byte limit
// Redux persist uses AsyncStorage, but individual sensitive values are stored here
const SECURE_KEYS = [
  AUTH_DATA,                // AUTH_DATA constant - contains tokens
  'GOOGLE_ACCESS_TOKEN',
  'GOOGLE_REFRESH_TOKEN',
  USER_CONFIGURATIONS,      // User settings/preferences
];

// Check if a key should use secure storage
const shouldUseSecureStore = (key: string): boolean => {
  return SECURE_KEYS.some(secureKey => key.includes(secureKey));
};

/**
 * Get item from storage
 * Uses SecureStore for sensitive keys, AsyncStorage for others
 */
export const getItem = async (key: string): Promise<string | null> => {
  try {
    if (shouldUseSecureStore(key)) {
      return await SecureStore.getItemAsync(key);
    }
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`Error getting item ${key}:`, error);
    return null;
  }
};

/**
 * Set item in storage
 * Uses SecureStore for sensitive keys, AsyncStorage for others
 */
export const setItem = async (key: string, value: string): Promise<void> => {
  try {
    if (shouldUseSecureStore(key)) {
      await SecureStore.setItemAsync(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.error(`Error setting item ${key}:`, error);
    throw error;
  }
};

/**
 * Remove item from storage
 * Uses SecureStore for sensitive keys, AsyncStorage for others
 */
export const removeItem = async (key: string): Promise<void> => {
  try {
    if (shouldUseSecureStore(key)) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`Error removing item ${key}:`, error);
    throw error;
  }
};

/**
 * Clear all items
 * Clears both SecureStore and AsyncStorage
 */
export const clear = async (): Promise<void> => {
  try {
    // Clear AsyncStorage
    await AsyncStorage.clear();
    
    // Clear SecureStore items (we need to explicitly delete each key)
    for (const key of SECURE_KEYS) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Ignore errors for keys that don't exist
      }
    }
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
};

// Export as default object with AsyncStorage-compatible API
export default {
  getItem,
  setItem,
  removeItem,
  clear,
};
