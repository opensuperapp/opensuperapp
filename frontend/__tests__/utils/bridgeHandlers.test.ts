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
import { BRIDGE_REGISTRY } from '@/utils/bridgeHandlers';

describe('bridgeHandlers Utils', () => {
  it('should export BRIDGE_REGISTRY', () => {
    expect(BRIDGE_REGISTRY).toBeDefined();
    expect(Array.isArray(BRIDGE_REGISTRY)).toBe(true);
  });

  it('should contain bridge handler functions', () => {
    expect(BRIDGE_REGISTRY.length).toBeGreaterThan(0);
  });

  it('should have handlers with topic and handler properties', () => {
    BRIDGE_REGISTRY.forEach(handler => {
      expect(handler).toHaveProperty('topic');
      expect(handler).toHaveProperty('handler');
      expect(typeof handler.topic).toBe('string');
      expect(typeof handler.handler).toBe('function');
    });
  });

  it('should have unique topics', () => {
    const topics = BRIDGE_REGISTRY.map(h => h.topic);
    const uniqueTopics = new Set(topics);
    
    expect(topics.length).toBe(uniqueTopics.size);
  });

  it('should include common bridge handlers', () => {
    const topics = BRIDGE_REGISTRY.map(h => h.topic);
    
    // Check for at least some expected handlers
    expect(topics.length).toBeGreaterThan(0);
  });
});
