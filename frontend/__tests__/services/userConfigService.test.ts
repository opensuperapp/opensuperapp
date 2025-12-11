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
import { UpdateUserConfiguration } from '@/services/userConfigService';
import * as secureStorage from '@/utils/secureStorage';
import { store } from '@/context/store';

jest.mock('@/utils/secureStorage');
jest.mock('@/utils/requestHandler');
jest.mock('@/context/store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

describe('userConfigService', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UpdateUserConfiguration', () => {
    it('should update user configuration for downloaded app', async () => {
      const mockUserConfigs = [
        {
          email: 'test@example.com',
          downloadedAppIds: [],
        },
      ];

      (secureStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockUserConfigs)
      );
      (secureStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (store.getState as jest.Mock).mockReturnValue({
        auth: { email: 'test@example.com' },
      });

      await expect(
        UpdateUserConfiguration('test-app-id', 'downloaded', mockLogout)
      ).resolves.not.toThrow();

      expect(secureStorage.getItem).toHaveBeenCalled();
    });

    it('should handle not-downloaded action', async () => {
      const mockUserConfigs = [
        {
          email: 'test@example.com',
          downloadedAppIds: ['test-app-id'],
        },
      ];

      (secureStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockUserConfigs)
      );
      (secureStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (store.getState as jest.Mock).mockReturnValue({
        auth: { email: 'test@example.com' },
      });

      await expect(
        UpdateUserConfiguration('test-app-id', 'not-downloaded', mockLogout)
      ).resolves.not.toThrow();

      expect(secureStorage.getItem).toHaveBeenCalled();
    });

    it('should handle empty user configs', async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValue(null);
      (secureStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (store.getState as jest.Mock).mockReturnValue({
        auth: { email: 'test@example.com' },
      });

      await expect(
        UpdateUserConfiguration('test-app-id', 'downloaded', mockLogout)
      ).resolves.not.toThrow();
    });

    it('should handle errors gracefully', async () => {
      (secureStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const result = await UpdateUserConfiguration(
        'test-app-id',
        'downloaded',
        mockLogout
      );

      expect(result).toBe(false);
    });
  });
});
