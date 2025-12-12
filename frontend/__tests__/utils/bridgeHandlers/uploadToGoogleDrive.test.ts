
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

import { BRIDGE_FUNCTION as uploadToGoogleDriveBridgeFunction } from '@/utils/bridgeHandlers/uploadToGoogleDrive';
import { uploadToGoogleDrive } from '@/services/googleService';

jest.mock('@/services/googleService', () => ({
    uploadToGoogleDrive: jest.fn(),
}));

describe('uploadToGoogleDrive bridge handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve with the response on successful upload', async () => {
        const resolve = jest.fn();
        const context = { resolve, reject: jest.fn() };
        const mockParams = { files: ['file1'], metadata: { name: 'backup' } };
        const mockResponse = { id: 'uploaded-file-id', name: 'backup' };

        (uploadToGoogleDrive as jest.Mock).mockResolvedValue(mockResponse);

        await uploadToGoogleDriveBridgeFunction.handler(mockParams, context);

        expect(uploadToGoogleDrive).toHaveBeenCalledWith(mockParams);
        expect(context.resolve).toHaveBeenCalledWith(mockResponse);
    });

    it('should reject with an error message if upload fails (no id)', async () => {
        const reject = jest.fn();
        const context = { resolve: jest.fn(), reject };
        const mockParams = { files: ['file1'] };
        const mockErrorResponse = { error: 'Upload failed' };

        (uploadToGoogleDrive as jest.Mock).mockResolvedValue(mockErrorResponse);

        await uploadToGoogleDriveBridgeFunction.handler(mockParams, context);

        expect(uploadToGoogleDrive).toHaveBeenCalledWith(mockParams);
        expect(context.reject).toHaveBeenCalledWith(mockErrorResponse.error);
    });

    it('should reject with a generic error message if upload fails and no specific error is provided', async () => {
        const reject = jest.fn();
        const context = { resolve: jest.fn(), reject };
        const mockParams = { files: ['file1'] };
        const mockErrorResponse = {}; // No id and no error property

        (uploadToGoogleDrive as jest.Mock).mockResolvedValue(mockErrorResponse);

        await uploadToGoogleDriveBridgeFunction.handler(mockParams, context);

        expect(uploadToGoogleDrive).toHaveBeenCalledWith(mockParams);
        expect(context.reject).toHaveBeenCalledWith('Upload failed');
    });

    it('should reject with an error message if the service throws an error', async () => {
        const reject = jest.fn();
        const context = { resolve: jest.fn(), reject };
        const mockParams = { files: ['file1'] };
        const mockError = new Error('Google service error');

        (uploadToGoogleDrive as jest.Mock).mockRejectedValue(mockError);

        await uploadToGoogleDriveBridgeFunction.handler(mockParams, context);

        expect(uploadToGoogleDrive).toHaveBeenCalledWith(mockParams);
        expect(context.reject).toHaveBeenCalledWith(mockError.message);
    });
});
