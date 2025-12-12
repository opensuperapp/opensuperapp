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
import googleAuthenticationService from '@/services/googleService';

jest.mock('@react-native-google-signin/google-signin');
jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage');

describe('googleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('googleAuthenticationService', () => {
    it('should handle successful google authentication', async () => {
      const mockResponse = {
        type: 'success',
        authentication: {
          accessToken: 'google-access-token',
        },
      };

      const result = await googleAuthenticationService(mockResponse as any);

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should handle authentication errors', async () => {
      const mockResponse = {
        type: 'error',
        error: new Error('Auth failed'),
      };

      const result = await googleAuthenticationService(mockResponse as any);

      expect(result).toBeDefined();
      expect(result.status).toBe(false);
    });

    it('should handle cancelled authentication', async () => {
      const mockResponse = {
        type: 'cancel',
      };

      const result = await googleAuthenticationService(mockResponse as any);

      expect(result).toBeDefined();
      expect(result.status).toBe(false);
    });
  });
});
