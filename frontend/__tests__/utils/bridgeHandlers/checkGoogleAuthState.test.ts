
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

import { BRIDGE_FUNCTION as checkGoogleAuthStateBridgeFunction } from '@/utils/bridgeHandlers/checkGoogleAuthState';
import { isAuthenticatedWithGoogle } from '@/services/googleService';

jest.mock('@/services/googleService', () => ({
    isAuthenticatedWithGoogle: jest.fn(),
}));

describe('checkGoogleAuthState bridge handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve with the auth state if authenticated', async () => {
        const resolve = jest.fn();
        const context = { resolve, reject: jest.fn() };
        const mockAuthState = { accessToken: 'test-token' };

        (isAuthenticatedWithGoogle as jest.Mock).mockResolvedValue(mockAuthState);

        await checkGoogleAuthStateBridgeFunction.handler({}, context);

        expect(isAuthenticatedWithGoogle).toHaveBeenCalled();
        expect(context.resolve).toHaveBeenCalledWith(mockAuthState);
    });

    it('should reject if not authenticated', async () => {
        const reject = jest.fn();
        const context = { resolve: jest.fn(), reject };

        (isAuthenticatedWithGoogle as jest.Mock).mockResolvedValue(null);

        await checkGoogleAuthStateBridgeFunction.handler({}, context);

        expect(isAuthenticatedWithGoogle).toHaveBeenCalled();
        expect(context.reject).toHaveBeenCalledWith('Not authenticated');
    });

    it('should reject with an error message if the service fails', async () => {
        const reject = jest.fn();
        const context = { resolve: jest.fn(), reject };
        const mockError = new Error('Google service error');

        (isAuthenticatedWithGoogle as jest.Mock).mockRejectedValue(mockError);

        await checkGoogleAuthStateBridgeFunction.handler({}, context);

        expect(isAuthenticatedWithGoogle).toHaveBeenCalled();
        expect(context.reject).toHaveBeenCalledWith(mockError.message);
    });
});
