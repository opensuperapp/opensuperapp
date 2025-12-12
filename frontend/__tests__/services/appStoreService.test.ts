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
  downloadMicroApp,
  loadMicroAppDetails,
  removeMicroApp,
} from '@/services/appStoreService';
import axios from 'axios';

jest.mock('axios');
jest.mock('@/utils/secureStorage');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('appStoreService', () => {
  const mockDispatch = jest.fn();
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadMicroAppDetails', () => {
    it('should load micro apps successfully', async () => {
      const mockApps = [
        {
          appId: 'app1',
          name: 'Test App 1',
          description: 'Test Description 1',
        },
        {
          appId: 'app2',
          name: 'Test App 2',
          description: 'Test Description 2',
        },
      ];

      mockedAxios.get.mockResolvedValue({ data: mockApps });

      await loadMicroAppDetails(mockDispatch, mockLogout);

      expect(mockDispatch).toHaveBeenCalled();
    });

    it('should handle errors when loading apps', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await loadMicroAppDetails(mockDispatch, mockLogout);

      // Should not throw, just handle gracefully
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  describe('downloadMicroApp', () => {
    it('should be a function', () => {
      expect(typeof downloadMicroApp).toBe('function');
    });

    it('should handle download process', async () => {
      const appId = 'test-app-id';
      const downloadUrl = 'https://example.com/app.zip';

      mockedAxios.get.mockResolvedValue({
        data: new ArrayBuffer(100),
      });

      await expect(
        downloadMicroApp(mockDispatch, appId, downloadUrl, mockLogout)
      ).resolves.not.toThrow();
    });
  });

  describe('removeMicroApp', () => {
    it('should be a function', () => {
      expect(typeof removeMicroApp).toBe('function');
    });

    it('should handle app removal', async () => {
      const appId = 'test-app-id';

      await expect(
        removeMicroApp(mockDispatch, appId, mockLogout)
      ).resolves.not.toThrow();

      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});
