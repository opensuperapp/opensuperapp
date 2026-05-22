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
import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { apiRequest } from '@/utils/requestHandler';
import { UpdateUserConfiguration } from '@/services/userConfigService';


jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///test-dir/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}));

jest.mock('jszip');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@/utils/requestHandler');
jest.mock('@/services/userConfigService');
jest.mock('@/context/slices/appSlice', () => ({
  addDownloading: jest.fn((id) => ({ type: 'apps/addDownloading', payload: id })),
  removeDownloading: jest.fn((id) => ({ type: 'apps/removeDownloading', payload: id })),
  updateAppStatus: jest.fn((payload) => ({ type: 'apps/updateAppStatus', payload })),
  setApps: jest.fn((payload) => ({ type: 'apps/setApps', payload })),
}));

jest.mock('@/context/store', () => ({
  store: {
    getState: jest.fn().mockReturnValue({
      auth: { accessToken: 'test-token' }
    })
  }
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
}));

jest.mock('@/constants/Constants', () => ({
  APPS: 'apps',
  BASE_URL: 'http://base-url',
  DOWNLOADED: 'downloaded',
  NOT_DOWNLOADED: 'not-downloaded',
  MICRO_APP_STORAGE_DIR: 'storage',
  DEFAULT_VIEWING_MODE: 'default',
  isAndroid: false,
  isIos: true,
}));


describe('appStoreService', () => {
  const mockDispatch = jest.fn();
  const mockLogout = jest.fn();


  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadMicroApp', () => {
    it('should show alert if downloadUrl is missing', async () => {
      await downloadMicroApp(mockDispatch, 'app-id', null, mockLogout);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Download URL is empty.');
    });


    it('should download and unzip successfully', async () => {
      const appId = 'app1';
      const downloadUrl = 'http://test.com/app.zip';

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
      (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ uri: 'file://zip' });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('base64zip');

      const mockZip = {
        files: {
          'index.html': { dir: false, async: jest.fn().mockResolvedValue('html-content') },
          'microapp.json': { dir: false, async: jest.fn().mockResolvedValue(JSON.stringify({ clientId: 'id' })) },
        }
      };
      (JSZip.loadAsync as jest.Mock).mockResolvedValue(mockZip);

      // Mock info for index.html exists
      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: true }) // customDir check
        .mockResolvedValueOnce({ exists: true, size: 100 }) // fileUri check in unzipFile
        .mockResolvedValueOnce({ exists: false }) // folder exists check for index.html
        .mockResolvedValueOnce({ exists: true }) // getIndexPath check
        .mockResolvedValueOnce({ exists: true }); // getMicroAppConfig check

      (FileSystem.readAsStringAsync as jest.Mock)
        .mockResolvedValueOnce('base64zip')
        .mockResolvedValueOnce(JSON.stringify({ clientId: 'my-client-id' }));

      await downloadMicroApp(mockDispatch, appId, downloadUrl, mockLogout);

      expect(FileSystem.downloadAsync).toHaveBeenCalled();
      expect(JSZip.loadAsync).toHaveBeenCalled();
      expect(UpdateUserConfiguration).toHaveBeenCalledWith(appId, 'downloaded', mockLogout);
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'apps/updateAppStatus' }));
    });

    it('should handle failure during download', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error('FileSystem full'));

      await downloadMicroApp(mockDispatch, 'app-id', 'http://url', mockLogout);

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to download or save the file.');
      expect(UpdateUserConfiguration).toHaveBeenCalledWith('app-id', 'not-downloaded', mockLogout);
    });
  });

  describe('removeMicroApp', () => {
    it('should delete directories and update status', async () => {
      await removeMicroApp(mockDispatch, 'app1', mockLogout);

      expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(2);
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'apps/updateAppStatus' }));
      expect(UpdateUserConfiguration).toHaveBeenCalledWith('app1', 'not-downloaded', mockLogout);
    });

    it('should handle error during removal', async () => {
      (FileSystem.deleteAsync as jest.Mock).mockRejectedValue(new Error('fail'));
      await removeMicroApp(mockDispatch, 'app1', mockLogout);
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to remove the app.');
      expect(UpdateUserConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('loadMicroAppDetails', () => {
    it('should fetch apps and update store', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (apiRequest as jest.Mock).mockResolvedValue({
        data: [{ appId: 'app1', versions: [{ version: '1.0', downloadUrl: 'http://url' }] }]
      });

      await loadMicroAppDetails(mockDispatch, mockLogout);

      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'apps/setApps' }));
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should trigger update if version mismatch', async () => {
      const storedApps = [{ appId: 'app1', versions: [{ version: '1.0' }], status: 'downloaded' }];
      const apiApps = [{ appId: 'app1', versions: [{ version: '1.1', downloadUrl: 'http://url' }] }];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedApps));
      (apiRequest as jest.Mock).mockResolvedValue({ data: apiApps });

      await loadMicroAppDetails(mockDispatch, mockLogout);
    });

    it('should handle error in loadMicroAppDetails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('fail'));
      await loadMicroAppDetails(mockDispatch, mockLogout);
      expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'apps/setApps', payload: [] }));
    });
  });
});
