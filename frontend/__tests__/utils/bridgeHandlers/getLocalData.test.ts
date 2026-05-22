
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

import { BRIDGE_FUNCTION as getLocalDataBridgeFunction } from '@/utils/bridgeHandlers/getLocalData';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
}));

describe('getLocalData bridge handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve with the value from AsyncStorage', async () => {
        const resolve = jest.fn();
        const context = { resolve, reject: jest.fn() };
        const params = { key: 'test-key' };
        const mockValue = 'test-value';

        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockValue);

        await getLocalDataBridgeFunction.handler(params, context);

        expect(AsyncStorage.getItem).toHaveBeenCalledWith(params.key);
        expect(context.resolve).toHaveBeenCalledWith({ value: mockValue });
    });

    it('should reject with an error message if AsyncStorage.getItem fails', async () => {
        const reject = jest.fn();
        const context = { resolve: jest.fn(), reject };
        const params = { key: 'test-key' };
        const mockError = new Error('AsyncStorage error');

        (AsyncStorage.getItem as jest.Mock).mockRejectedValue(mockError);

        await getLocalDataBridgeFunction.handler(params, context);

        expect(AsyncStorage.getItem).toHaveBeenCalledWith(params.key);
        expect(context.reject).toHaveBeenCalledWith(mockError.message);
    });
});
