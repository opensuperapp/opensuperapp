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
import { apiRequest } from '@/utils/requestHandler';
import axios from 'axios';
import { refreshAccessToken } from '@/services/authService';
import { jwtDecode } from 'jwt-decode';
import dayjs from 'dayjs';
import * as metrics from '@/telemetry/metrics';

jest.mock('axios');
jest.mock('@/services/authService');
jest.mock('jwt-decode');
jest.mock('@/telemetry/metrics');

// Mock for the store which is required dynamically
const mockStore = {
  getState: jest.fn(),
};

jest.mock('@/context/store', () => ({
  store: mockStore,
}));

describe('requestHandler Utils', () => {
  const mockOnLogout = jest.fn(() => Promise.resolve());
  const mockedAxios = axios as jest.MockedFunction<typeof axios>;
  const mockedRefreshAccessToken = refreshAccessToken as jest.MockedFunction<typeof refreshAccessToken>;
  const mockedJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.getState.mockReturnValue({
      auth: {
        accessToken: 'valid-token',
      },
    });
    mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }); // 1 hour in future
  });

  it('should return undefined if no access token is present', async () => {
    mockStore.getState.mockReturnValue({
      auth: {
        accessToken: null,
      },
    });

    const result = await apiRequest({ url: '/test' }, mockOnLogout);
    expect(result).toBeUndefined();
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  it('should make a successful API request with a valid token', async () => {
    const mockResponse = { status: 200, data: { foo: 'bar' } };
    mockedAxios.mockResolvedValueOnce(mockResponse);

    const config = { url: '/test', method: 'GET' as const };
    const result = await apiRequest(config, mockOnLogout);

    expect(result).toEqual(mockResponse);
    expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer valid-token',
      }),
    }));
    expect(metrics.recordApiRequest).toHaveBeenCalledWith('GET', '/test', 200);
  });

  it('should refresh token and retry if token is expired before request', async () => {
    mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 3600 }); // 1 hour in past
    mockedRefreshAccessToken.mockResolvedValueOnce({
      accessToken: 'new-token',
      refreshToken: 'refresh',
      idToken: 'id',
      expiresAt: Date.now() + 3600000,
    } as any);

    const mockResponse = { status: 200, data: { success: true } };
    mockedAxios.mockResolvedValueOnce(mockResponse);

    const config = { url: '/test' };
    const result = await apiRequest(config, mockOnLogout);

    expect(mockedRefreshAccessToken).toHaveBeenCalledWith(mockOnLogout);
    expect(result).toEqual(mockResponse);
    expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer new-token',
      }),
    }));
  });

  it('should return if token refresh fails when expired', async () => {
    mockedJwtDecode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 3600 });
    mockedRefreshAccessToken.mockResolvedValueOnce(null);

    const config = { url: '/test' };
    const result = await apiRequest(config, mockOnLogout);

    expect(result).toBeUndefined();
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  it('should retry request on 401 error by refreshing token', async () => {
    const error401 = {
      response: { status: 401 },
      isAxiosError: true,
    };
    mockedAxios.mockRejectedValueOnce(error401);

    mockedRefreshAccessToken.mockResolvedValueOnce({
      accessToken: 'refreshed-token',
      refreshToken: 'refresh',
      idToken: 'id',
      expiresAt: Date.now() + 3600000,
    } as any);

    const mockResponse = { status: 200, data: { retry: 'success' } };
    mockedAxios.mockResolvedValueOnce(mockResponse);

    const config = { url: '/retry-test' };
    const result = await apiRequest(config, mockOnLogout);

    expect(mockedRefreshAccessToken).toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
    expect(mockedAxios).toHaveBeenCalledTimes(2);
    expect(mockedAxios).toHaveBeenLastCalledWith(expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer refreshed-token',
      }),
    }));
  });

  it('should throw error if 401 retry also fails', async () => {
    const error401 = {
      response: { status: 401 },
      isAxiosError: true,
    };
    mockedAxios.mockRejectedValueOnce(error401);

    mockedRefreshAccessToken.mockResolvedValueOnce({
      accessToken: 'refreshed-token',
      refreshToken: 'refresh',
      idToken: 'id',
      expiresAt: Date.now() + 3600000,
    } as any);

    mockedAxios.mockRejectedValueOnce(error401);

    const config = { url: '/double-fail' };
    await expect(apiRequest(config, mockOnLogout)).rejects.toEqual(error401);
    expect(metrics.recordApiRequestError).toHaveBeenCalledWith('GET', '/double-fail', 401);
  });

  it('should throw original error for non-401 failures', async () => {
    const error500 = {
      response: { status: 500 },
      isAxiosError: true,
    };
    mockedAxios.mockRejectedValueOnce(error500);

    const config = { url: '/error-500' };
    await expect(apiRequest(config, mockOnLogout)).rejects.toEqual(error500);
    expect(metrics.recordApiRequestError).toHaveBeenCalledWith('GET', '/error-500', 500);
  });

  it('should handle decoding errors in isAccessTokenExpired', async () => {
    mockedJwtDecode.mockImplementationOnce(() => { throw new Error('decode fail'); });
    mockedRefreshAccessToken.mockResolvedValueOnce(null);

    const config = { url: '/test' };
    await apiRequest(config, mockOnLogout);

    expect(mockedRefreshAccessToken).toHaveBeenCalled();
  });
});

