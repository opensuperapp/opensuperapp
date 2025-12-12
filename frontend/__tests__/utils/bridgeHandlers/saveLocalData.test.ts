
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

import { BRIDGE_FUNCTION as saveLocalDataBridgeFunction } from '@/utils/bridgeHandlers/saveLocalData';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(),
}));

describe('saveLocalData bridge handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve when the value is saved to AsyncStorage', async () => {
        const resolve = jest.fn();
        const context = { resolve, reject: jest.fn() };
        const params = { key: 'test-key', value: 'test-value' };

        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

        await saveLocalDataBridgeFunction.handler(params, context);

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(params.key, params.value);
        expect(context.resolve).toHaveBeenCalled();
    });

    it('should reject with an error message if AsyncStorage.setItem fails', async () => {
        const reject = jest.fn();
        const context = { resolve: jest.fn(), reject };
        const params = { key: 'test-key', value: 'test-value' };
        const mockError = new Error('AsyncStorage error');

        (AsyncStorage.setItem as jest.Mock).mockRejectedValue(mockError);

        await saveLocalDataBridgeFunction.handler(params, context);

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(params.key, params.value);
        expect(context.reject).toHaveBeenCalledWith(mockError.message);
    });
});
