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
    registerDeviceToken,
    updateDeviceToken,
    unregisterDeviceToken,
} from '@/services/notificationApiService';
import { apiRequest } from '@/utils/requestHandler';
import { Platform } from 'react-native';

jest.mock('@/utils/requestHandler');
jest.mock('@/constants/Constants', () => ({
    BASE_URL: 'http://test.com',
}));
jest.mock('react-native', () => ({
    Platform: {
        OS: 'ios',
    },
}));

describe('notificationApiService', () => {
    const mockLogout = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('registerDeviceToken', () => {
        it('should return true on 201 response', async () => {
            Platform.OS = 'ios';
            (apiRequest as jest.Mock).mockResolvedValue({ status: 201 });

            const result = await registerDeviceToken('t@t.com', 'token123', mockLogout);

            expect(result).toBe(true);
            expect(apiRequest).toHaveBeenCalledWith(
                expect.objectContaining({
                    method: 'POST',
                    data: expect.objectContaining({ email: 't@t.com', platform: 'ios' })
                }),
                mockLogout
            );
        });

        it('should return true on 200 response', async () => {
            Platform.OS = 'android';
            (apiRequest as jest.Mock).mockResolvedValue({ status: 200 });

            const result = await registerDeviceToken('t@t.com', 'token123', mockLogout);

            expect(result).toBe(true);
            expect(apiRequest).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ platform: 'android' })
                }),
                mockLogout
            );
        });

        it('should return false on error status', async () => {
            (apiRequest as jest.Mock).mockResolvedValue({ status: 500 });
            const result = await registerDeviceToken('t@t.com', 'token123', mockLogout);
            expect(result).toBe(false);
        });

        it('should return false on exception', async () => {
            (apiRequest as jest.Mock).mockRejectedValue(new Error('fail'));
            const result = await registerDeviceToken('t@t.com', 'token123', mockLogout);
            expect(result).toBe(false);
        });
    });

    describe('updateDeviceToken', () => {
        it('should call registerDeviceToken', async () => {
            (apiRequest as jest.Mock).mockResolvedValue({ status: 200 });
            const result = await updateDeviceToken('t@t.com', 'token123', mockLogout);
            expect(result).toBe(true);
        });
    });

    describe('unregisterDeviceToken', () => {
        it('should return true on 200/204 response', async () => {
            (apiRequest as jest.Mock).mockResolvedValue({ status: 204 });
            const result = await unregisterDeviceToken('t@t.com', 'token123', mockLogout);
            expect(result).toBe(true);
            expect(apiRequest).toHaveBeenCalledWith(
                expect.objectContaining({ method: 'DELETE' }),
                mockLogout
            );
        });

        it('should return false on error', async () => {
            (apiRequest as jest.Mock).mockResolvedValue({ status: 404 });
            const result = await unregisterDeviceToken('t@t.com', 'token123', mockLogout);
            expect(result).toBe(false);
        });

        it('should return false on exception', async () => {
            (apiRequest as jest.Mock).mockRejectedValue(new Error('fail'));
            const result = await unregisterDeviceToken('t@t.com', 'token123', mockLogout);
            expect(result).toBe(false);
        });
    });
});
