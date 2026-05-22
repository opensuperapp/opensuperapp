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
import { generateInjectedJavaScript } from '@/utils/bridge';

describe('bridge Utils', () => {
  it('should generate injected JavaScript code', () => {
    const script = generateInjectedJavaScript();
    
    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('should include window.nativebridge in generated code', () => {
    const script = generateInjectedJavaScript();
    
    expect(script).toContain('window.nativebridge');
  });

  it('should include bridge methods in generated code', () => {
    const script = generateInjectedJavaScript();
    
    expect(script).toContain('postMessage');
  });

  it('should generate valid JavaScript', () => {
    const script = generateInjectedJavaScript();
    
    // Check for common JS structures
    expect(script).toMatch(/function|=>/);
  });
});
