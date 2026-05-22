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
import { BRIDGE_REGISTRY, getRequestMethod, getResolveMethod, getRejectMethod, getHelperMethod } from './bridgeRegistry';

/**
 * This module auto-generates JavaScript code that gets injected into WebViews
 */

export const generateInjectedJavaScript = () => {
  const methods: string[] = [];
  const globalHelpers: string[] = [];

  // Generate methods for each bridge function
  BRIDGE_REGISTRY.forEach(bridgeFunction => {
    const { topic } = bridgeFunction;

    const requestMethod = getRequestMethod(topic);
    const resolveMethod = getResolveMethod(topic);
    const rejectMethod = getRejectMethod(topic);
    const helperMethod = getHelperMethod(topic);

    /**
     * Generate request method - returns a promise that resolves/rejects based on native response
     * This creates window.nativebridge.someMethod(data) that posts messages to React Native
     * and returns a promise that will be resolved when native responds
     * 
     * BACKWARD COMPATIBILITY: Also supports old callback-based pattern
     */
    methods.push(`
    ${requestMethod}: (...args) => {
      const data = args[0];
      const requestId = Date.now() + '_' + Math.random().toString(36).slice(2, 11);
      
      // Store promise resolvers if needed (for new Promise-based usage)
      if (!window.nativebridge._pendingPromises) {
        window.nativebridge._pendingPromises = {};
      }
      
      // Post message to React Native with request ID
      window.ReactNativeWebView.postMessage(JSON.stringify({
        topic: '${topic}',
        data: data,
        requestId: requestId
      }));
      
      // Return a promise for new Promise-based usage
      return new Promise((resolve, reject) => {
        window.nativebridge._pendingPromises[requestId] = { resolve, reject };
      });
    },`);

    /**
     * Generate resolve method - resolves the corresponding promise
     */
    methods.push(`
    ${resolveMethod}: (data, requestId) => {
      if (window.nativebridge._pendingPromises && window.nativebridge._pendingPromises[requestId]) {
        window.nativebridge._pendingPromises[requestId].resolve(data);
        delete window.nativebridge._pendingPromises[requestId];
      }
    },`);

    /**
     * Generate reject method - rejects the corresponding promise
     */
    methods.push(`
    ${rejectMethod}: (error, requestId) => {
      if (window.nativebridge._pendingPromises && window.nativebridge._pendingPromises[requestId]) {
        window.nativebridge._pendingPromises[requestId].reject(error);
        delete window.nativebridge._pendingPromises[requestId];
      }
    },`);

    /**
     * Generate helper methods for data persistence across page reloads
     * Creates global variables and getter methods for storing resolved data
     */

    // Create a generic global variable for this topic
    const globalVarName = `native${topic.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('')}`;

    globalHelpers.push(`window.${globalVarName} = null;`);

    // Create the helper getter method
    methods.push(`
    ${helperMethod}: () => {
      return window.${globalVarName};
    },`);

    /**
     * Store data globally
     * This allows web apps to access resolved data even after page navigation
     */
    const resolveIndex = methods.findIndex(m => m.includes(resolveMethod));
    if (resolveIndex !== -1) {
      methods[resolveIndex] = `
    ${resolveMethod}: (data, requestId) => {
      window.${globalVarName} = data;
      if (window.nativebridge._pendingPromises && window.nativebridge._pendingPromises[requestId]) {
        window.nativebridge._pendingPromises[requestId].resolve(data);
        delete window.nativebridge._pendingPromises[requestId];
      }
    },`;
    }
  });

  return `
  ${globalHelpers.join('\n')}
  window.nativebridge = {${methods.join('')}
  };`;
};

export const injectedJavaScript = generateInjectedJavaScript();
