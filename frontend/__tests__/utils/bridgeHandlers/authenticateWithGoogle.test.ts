
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

import { BRIDGE_FUNCTION as authenticateWithGoogleBridgeFunction } from '@/utils/bridgeHandlers/authenticateWithGoogle';

describe('authenticateWithGoogle bridge handler', () => {
    it('should call promptAsync and resolve if it is available', async () => {
        const promptAsync = jest.fn().mockResolvedValue(undefined);
        const resolve = jest.fn();
        const context = { promptAsync, resolve, reject: jest.fn() };

        await authenticateWithGoogleBridgeFunction.handler({}, context);

        expect(promptAsync).toHaveBeenCalled();
        expect(resolve).toHaveBeenCalled();
    });

    it('should reject if promptAsync is not available', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const reject = jest.fn();
        const context = { resolve: jest.fn(), reject };

        await authenticateWithGoogleBridgeFunction.handler({}, context);

        expect(consoleErrorSpy).toHaveBeenCalledWith('promptAsync not available in bridge context');
        expect(reject).toHaveBeenCalledWith('Google authentication not available');
        consoleErrorSpy.mockRestore();
    });
});
