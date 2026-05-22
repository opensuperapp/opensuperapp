
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

import { BRIDGE_FUNCTION as deviceSafeAreaInsetsBridgeFunction } from '@/utils/bridgeHandlers/deviceSafeAreaInsets';

describe('deviceSafeAreaInsets bridge handler', () => {
    it('should resolve with the insets if they are available in the context', () => {
        const mockInsets = { top: 50, bottom: 34, left: 0, right: 0 };
        const context = { insets: mockInsets, resolve: jest.fn(), reject: jest.fn() };

        deviceSafeAreaInsetsBridgeFunction.handler({}, context);

        expect(context.resolve).toHaveBeenCalledWith({ insets: mockInsets });
    });

    it('should reject if insets are not available in the context', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const context = { resolve: jest.fn(), reject: jest.fn() };

        deviceSafeAreaInsetsBridgeFunction.handler({}, context);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Device insets not available in bridge context');
        expect(context.reject).toHaveBeenCalledWith('Device insets not available');
        consoleErrorSpy.mockRestore();
    });
});
