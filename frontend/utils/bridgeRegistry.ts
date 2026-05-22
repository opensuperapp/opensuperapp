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
import { BRIDGE_REGISTRY as MODULAR_BRIDGE_REGISTRY } from "./bridgeHandlers";
import { BridgeFunction } from "../types/bridge.types";

export const BRIDGE_REGISTRY: BridgeFunction[] = MODULAR_BRIDGE_REGISTRY;

// Utility functions to work with the registry

/**
 * Get all available bridge topics
 */
export const getBridgeTopics = (): string[] => BRIDGE_REGISTRY.map(fn => fn.topic);

/**
 * Get handler function for a specific bridge topic
 */
export const getBridgeHandler = (topic: string): BridgeFunction["handler"] | undefined =>
  BRIDGE_REGISTRY.find(fn => fn.topic === topic)?.handler;

/**
 * Get complete bridge function definition for a topic
 */
export const getBridgeFunction = (topic: string): BridgeFunction | undefined =>
  BRIDGE_REGISTRY.find(fn => fn.topic === topic);

/**
 * Capitalizes the first character of the given string and converts any
 * subsequent characters following an underscore to uppercase, removing the underscore.
 *
 * For example:
 * - "hello_world" becomes "HelloWorld"
 * - "example_string_test" becomes "ExampleStringTest"
 *
 * @param str - The input string to capitalize.
 * @returns The capitalized string with underscores removed and following letters capitalized.
 */
const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Auto-generated method name helpers
 */
export const getRequestMethod = (topic: string): string => `request${capitalize(topic)}`;
export const getResolveMethod = (topic: string): string => `resolve${capitalize(topic)}`;
export const getRejectMethod = (topic: string): string => `reject${capitalize(topic)}`;
export const getHelperMethod = (topic: string): string => `get${capitalize(topic)}`;
