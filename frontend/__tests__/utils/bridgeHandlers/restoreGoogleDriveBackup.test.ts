
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

import { BRIDGE_FUNCTION as restoreGoogleDriveBackupBridgeFunction } from '@/utils/bridgeHandlers/restoreGoogleDriveBackup';
import { restoreGoogleDriveBackup } from '@/services/googleService';

jest.mock('@/services/googleService', () => ({
    restoreGoogleDriveBackup: jest.fn(),
}));

describe('restoreGoogleDriveBackup bridge handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve with the backup data on successful restore', async () => {
        const resolve = jest.fn();
        const context = { resolve, reject: jest.fn() };
        const mockBackupData = { data: 'backup-data' };

        (restoreGoogleDriveBackup as jest.Mock).mockResolvedValue({ data: mockBackupData });

        await restoreGoogleDriveBackupBridgeFunction.handler({}, context);

        expect(restoreGoogleDriveBackup).toHaveBeenCalled();
        expect(context.resolve).toHaveBeenCalledWith(mockBackupData);
    });

    it('should reject with an error message on failed restore', async () => {
        const reject = jest.fn();
        const context = { resolve: jest.fn(), reject };
        // Mock restoreGoogleDriveBackup to resolve to null to simulate failure
        (restoreGoogleDriveBackup as jest.Mock).mockResolvedValue(null);

        await restoreGoogleDriveBackupBridgeFunction.handler({}, context);

        expect(restoreGoogleDriveBackup).toHaveBeenCalled();
        expect(context.reject).toHaveBeenCalledWith('Restore failed');
    });

    it('should reject with an error message if the service fails', async () => {
        const reject = jest.fn();
        const context = { resolve: jest.fn(), reject };
        const mockError = new Error('Google service error');

        (restoreGoogleDriveBackup as jest.Mock).mockRejectedValue(mockError);

        await restoreGoogleDriveBackupBridgeFunction.handler({}, context);

        expect(restoreGoogleDriveBackup).toHaveBeenCalled();
        expect(context.reject).toHaveBeenCalledWith(mockError.message);
    });
});
