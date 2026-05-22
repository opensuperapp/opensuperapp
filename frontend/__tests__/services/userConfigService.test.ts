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
import { apiRequest } from '@/utils/requestHandler';
jest.mock('@/utils/requestHandler', () => ({
  apiRequest: jest.fn(),
}));
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
    const APP_LIST_CONFIG_KEY = 'superapp.apps.list';

    it('should update user configuration for downloaded app', async () => {
      const mockUserConfigs = [
        {
          configKey: APP_LIST_CONFIG_KEY,
          configValue: [],
          email: 'test@example.com',
          isActive: 1,
        },
      ];

      (secureStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockUserConfigs));
      (secureStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (apiRequest as jest.Mock).mockResolvedValue({ status: 201 });
      (store.getState as jest.Mock).mockReturnValue({
        auth: { email: 'test@example.com' },
      });

      const result = await UpdateUserConfiguration('test-app-id', 'downloaded', mockLogout);
      expect(result).toBe(true);
      expect(secureStorage.setItem).toHaveBeenCalled();
    });

    it('should filter out app for not-downloaded action', async () => {
      const mockUserConfigs = [
        {
          configKey: APP_LIST_CONFIG_KEY,
          configValue: ['test-app-id'],
          email: 'test@example.com',
          isActive: 1,
        },
      ];

      (secureStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockUserConfigs));
      (secureStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (apiRequest as jest.Mock).mockResolvedValue({ status: 201 });

      const result = await UpdateUserConfiguration('test-app-id', 'not-downloaded', mockLogout);
      expect(result).toBe(true);
      // Verify filter happened
      const lastSet = JSON.parse((secureStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(lastSet[0].configValue).not.toContain('test-app-id');
    });

    it('should return false if email missing when configs empty', async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValue(null);
      (store.getState as jest.Mock).mockReturnValue({ auth: {} }); // No email

      const result = await UpdateUserConfiguration('app1', 'downloaded', mockLogout);
      expect(result).toBe(false);
    });

    it('should initialize configs if empty', async () => {
      (secureStorage.getItem as jest.Mock).mockResolvedValue(null);
      (store.getState as jest.Mock).mockReturnValue({ auth: { email: 'e' } });
      (apiRequest as jest.Mock).mockResolvedValue({ status: 201 });

      await UpdateUserConfiguration('app1', 'downloaded', mockLogout);
      expect(secureStorage.setItem).toHaveBeenCalled();
    });

    it('should warn and rollback if status not 201', async () => {
      const mockUserConfigs = [
        {
          configKey: APP_LIST_CONFIG_KEY,
          configValue: [],
          email: 'e',
          isActive: 1,
        },
      ];
      (secureStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockUserConfigs));
      (apiRequest as jest.Mock).mockResolvedValue({ status: 500 });

      await UpdateUserConfiguration('app1', 'downloaded', mockLogout);
      // Verify second setItem (rollback) happened
      expect(secureStorage.setItem).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      (secureStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      const result = await UpdateUserConfiguration('app1', 'downloaded', mockLogout);
      expect(result).toBe(false);
    });
  });
});
