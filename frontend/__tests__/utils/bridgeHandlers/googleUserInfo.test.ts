
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

import { BRIDGE_FUNCTION as googleUserInfoBridgeFunction } from '@/utils/bridgeHandlers/googleUserInfo';
import { getGoogleUserInfo } from '@/services/googleService';

jest.mock('@/services/googleService', () => ({
    getGoogleUserInfo: jest.fn(),
}));

describe('googleUserInfo bridge handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve with the user info if found', async () => {
        const resolve = jest.fn();
        const context = { resolve, reject: jest.fn() };
        const mockUserInfo = { email: 'test@example.com', name: 'Test User' };

        (getGoogleUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);

        await googleUserInfoBridgeFunction.handler({}, context);

        expect(getGoogleUserInfo).toHaveBeenCalled();
        expect(context.resolve).toHaveBeenCalledWith(mockUserInfo);
    });

    it('should reject if no user info is found', async () => {
        const reject = jest.fn();
        const context = { resolve: jest.fn(), reject };

        (getGoogleUserInfo as jest.Mock).mockResolvedValue(null);

        await googleUserInfoBridgeFunction.handler({}, context);

        expect(getGoogleUserInfo).toHaveBeenCalled();
        expect(context.reject).toHaveBeenCalledWith('No user info found');
    });

    it('should reject with an error message if the service fails', async () => {
        const reject = jest.fn();
        const context = { resolve: jest.fn(), reject };
        const mockError = new Error('Google service error');

        (getGoogleUserInfo as jest.Mock).mockRejectedValue(mockError);

        await googleUserInfoBridgeFunction.handler({}, context);

        expect(getGoogleUserInfo).toHaveBeenCalled();
        expect(context.reject).toHaveBeenCalledWith(mockError.message);
    });
});
