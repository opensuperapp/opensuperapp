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
import {
  getBridgeTopics,
  getBridgeHandler,
  getBridgeFunction,
  BRIDGE_REGISTRY,
} from '@/utils/bridgeRegistry';

describe('bridgeRegistry Utils', () => {
  it('should export BRIDGE_REGISTRY as an array', () => {
    expect(Array.isArray(BRIDGE_REGISTRY)).toBe(true);
  });

  it('should provide getBridgeTopics function', () => {
    const topics = getBridgeTopics();
    
    expect(Array.isArray(topics)).toBe(true);
  });

  it('should provide getBridgeHandler function', () => {
    expect(typeof getBridgeHandler).toBe('function');
  });

  it('should provide getBridgeFunction function', () => {
    expect(typeof getBridgeFunction).toBe('function');
  });

  it('should return all bridge topics', () => {
    const topics = getBridgeTopics();
    
    topics.forEach(topic => {
      expect(typeof topic).toBe('string');
    });
  });

  it('should retrieve handler for a valid topic', () => {
    const topics = getBridgeTopics();
    
    if (topics.length > 0) {
      const handler = getBridgeHandler(topics[0]);
      expect(handler).toBeDefined();
    }
  });

  it('should return undefined for invalid topic', () => {
    const handler = getBridgeHandler('non_existent_topic');
    expect(handler).toBeUndefined();
  });

  it('should retrieve complete bridge function for valid topic', () => {
    const topics = getBridgeTopics();
    
    if (topics.length > 0) {
      const bridgeFunc = getBridgeFunction(topics[0]);
      expect(bridgeFunc).toBeDefined();
      expect(bridgeFunc).toHaveProperty('topic');
      expect(bridgeFunc).toHaveProperty('handler');
    }
  });
});
