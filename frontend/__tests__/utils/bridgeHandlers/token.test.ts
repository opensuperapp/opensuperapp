
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

import { BRIDGE_FUNCTION as tokenBridgeFunction } from '@/utils/bridgeHandlers/token';
import { isTokenExpiringSoon } from '@/services/authService';

jest.mock('@/services/authService', () => ({
    isTokenExpiringSoon: jest.fn(),
}));

describe('token bridge handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve with the token if it is valid', () => {
        const resolve = jest.fn();
        const context = {
            token: 'valid-token',
            pendingTokenRequests: [],
            resolve,
            reject: jest.fn(),
        };
        (isTokenExpiringSoon as jest.Mock).mockReturnValue(false);

        tokenBridgeFunction.handler({}, context);

        expect(context.resolve).toHaveBeenCalledWith('valid-token');
    });

    it('should resolve pending requests if a valid token is available', () => {
        const pendingResolve1 = jest.fn();
        const pendingResolve2 = jest.fn();
        const context = {
            token: 'valid-token',
            pendingTokenRequests: [pendingResolve1, pendingResolve2],
            resolve: jest.fn(),
            reject: jest.fn(),
        };
        (isTokenExpiringSoon as jest.Mock).mockReturnValue(false);

        tokenBridgeFunction.handler({}, context);

        expect(pendingResolve1).toHaveBeenCalledWith('valid-token');
        expect(pendingResolve2).toHaveBeenCalledWith('valid-token');
    });

    it('should queue the request and refresh the token if it is expiring soon', async () => {
        const refreshToken = jest.fn();
        const context = {
            token: 'expiring-token',
            pendingTokenRequests: [],
            refreshToken,
            resolve: jest.fn(),
            reject: jest.fn(),
        };
        (isTokenExpiringSoon as jest.Mock).mockReturnValue(true);

        await tokenBridgeFunction.handler({}, context);

        expect(context.pendingTokenRequests.length).toBe(1);
        expect(context.refreshToken).toHaveBeenCalled();
    });

    it('should queue the request if the token is not available', () => {
        const context = {
            token: null,
            pendingTokenRequests: [],
            resolve: jest.fn(),
            reject: jest.fn(),
        };

        tokenBridgeFunction.handler({}, context);

        expect(context.pendingTokenRequests.length).toBe(1);
    });
});
