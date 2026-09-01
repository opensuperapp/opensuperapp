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
  APPS,
  BASE_URL,
  DEFAULT_VIEWING_MODE,
  DOWNLOADED,
  MICRO_APP_STORAGE_DIR,
  NOT_DOWNLOADED,
} from "@/constants/Constants";
import {
  addDownloading,
  MicroApp,
  removeDownloading,
  setApps,
  updateAppStatus,
  updateDownloadProgress,
} from "@/context/slices/appSlice";
import { AppDispatch, store } from "@/context/store";
import { buildAppsWithTokens } from "@/utils/exchangedTokenRehydrator";
import { persistAppsWithoutTokens } from "@/utils/exchangedTokenStore";
import { apiRequest } from "@/utils/requestHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import JSZip from "jszip";
import { Alert } from "react-native";
import { UpdateUserConfiguration } from "./userConfigService";

const getMicroAppsDirectory = (): Directory =>
  new Directory(Paths.document, MICRO_APP_STORAGE_DIR, "micro-apps");

const fileInDirectory = (directory: Directory, relativePath: string): File => {
  const segments = relativePath.split("/").filter(Boolean);
  return new File(directory, ...segments);
};

const directoryInDirectory = (
  directory: Directory,
  relativePath: string
): Directory => {
  const segments = relativePath.split("/").filter(Boolean);
  return new Directory(directory, ...segments);
};

const ensureDirectoryExists = (directory: Directory): void => {
  if (!directory.exists) {
    directory.create({ intermediates: true });
  }
};

// File handle services
export const downloadMicroApp = async (
  dispatch: AppDispatch,
  appId: string,
  downloadUrl: string | null,
  onLogout: () => Promise<void>
): Promise<boolean> => {
  try {
    dispatch(addDownloading(appId)); // Downloading status for indicator
    dispatch(updateDownloadProgress({ appId, progress: 0 })); // Initialize progress

    if (!downloadUrl) {
      Alert.alert("Error", "Download URL is empty.");
      return false;
    }

    await downloadAndSaveFile(dispatch, appId, downloadUrl); // Download react production build
    dispatch(updateDownloadProgress({ appId, progress: 70 }));

    await unzipFile(dispatch, appId); // Unzip downloaded zip file
    dispatch(updateDownloadProgress({ appId, progress: 90 }));

    await UpdateUserConfiguration(appId, DOWNLOADED, onLogout); // Update user configurations
    dispatch(updateDownloadProgress({ appId, progress: 100 }));
    
    return true;
  } catch (error) {
    await UpdateUserConfiguration(appId, NOT_DOWNLOADED, onLogout); // Update user configurations
    Alert.alert("Error", "Failed to download or save the file.");
    return false;
  } finally {
    dispatch(removeDownloading(appId));
  }
};

const downloadAndSaveFile = async (
  dispatch: AppDispatch,
  appId: string,
  downloadUrl: string
) => {
  const microAppsDir = getMicroAppsDirectory();
  ensureDirectoryExists(microAppsDir);

  const zipFile = new File(microAppsDir, `${appId}.zip`);
  await File.downloadFileAsync(downloadUrl, zipFile, { idempotent: true });

  for (let i = 0; i <= 60; i += 10) {
    dispatch(updateDownloadProgress({ appId, progress: i }));
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

const unzipFile = async (dispatch: AppDispatch, appId: string) => {
  try {
    const microAppsDir = getMicroAppsDirectory();
    const zipFile = new File(microAppsDir, `${appId}.zip`);
    const extractedDir = new Directory(microAppsDir, `${appId}-extracted`);

    if (!zipFile.exists || zipFile.size === 0) {
      Alert.alert("Error", "ZIP file not found or is empty.");
      throw new Error("ZIP file not found or is empty.");
    }

    const zipContent = await zipFile.base64();
    const zip = await JSZip.loadAsync(zipContent, { base64: true });

    ensureDirectoryExists(extractedDir);

    await Promise.all(
      Object.keys(zip.files)
        .filter(
          (relativePath) =>
            !relativePath.startsWith("__MACOSX") &&
            !relativePath.includes("/._")
        )
        .map(async (relativePath) => {
          const entry = zip.files[relativePath];

          if (entry.dir) {
            ensureDirectoryExists(
              directoryInDirectory(extractedDir, relativePath)
            );
          } else {
            const fileData = await entry.async("base64");
            const targetFile = fileInDirectory(extractedDir, relativePath);
            ensureDirectoryExists(targetFile.parentDirectory);
            targetFile.write(fileData, { encoding: "base64" });
          }
        })
    );

    const indexFile = await getIndexFile(extractedDir);
    if (!indexFile) throw new Error("Index file not found");

    const microAppConfig = await getMicroAppConfig(extractedDir);
    if (!microAppConfig.clientId) throw new Error("Client id not found");

    const relativeUri = Paths.relative(Paths.document, indexFile);

    dispatch(
      updateAppStatus({
        appId,
        status: DOWNLOADED,
        webViewUri: encodeURI(relativeUri),
        clientId: microAppConfig.clientId,
        displayMode: microAppConfig.displayMode,
      })
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    Alert.alert("Error", `Failed to unzip file: ${message}`);
    throw error;
  }
};

const getIndexFile = async (
  extractedDir: Directory
): Promise<File | null> => {
  try {
    const candidates = [
      new File(extractedDir, "index.html"),
      new File(extractedDir, "build", "index.html"),
    ];

    for (const file of candidates) {
      if (file.exists) {
        return file;
      }
    }

    Alert.alert("Error", "index.html not found after unzipping.");
    return null;
  } catch (error) {
    console.error("Error reading indexPath:", error);
    return null;
  }
};

const getMicroAppConfig = async (extractedDir: Directory) => {
  try {
    const candidates = [
      new File(extractedDir, "microapp.json"),
      new File(extractedDir, "build", "microapp.json"),
    ];

    for (const file of candidates) {
      if (file.exists) {
        try {
          const jsonString = await file.text();
          const appConfig = JSON.parse(jsonString);
          return {
            clientId: appConfig.clientId || null,
            displayMode: appConfig.displayMode || DEFAULT_VIEWING_MODE,
          };
        } catch (jsonError) {
          console.error("Error parsing microapp.json:", jsonError);
          Alert.alert("Error", "Failed to parse microapp.json.");
          return { clientId: null, displayMode: DEFAULT_VIEWING_MODE };
        }
      }
    }

    Alert.alert("Error", "microapp configs not found after unzipping.");
    return { clientId: null, displayMode: DEFAULT_VIEWING_MODE };
  } catch (error) {
    console.error("Error reading microapp config:", error);
    return { clientId: null, displayMode: DEFAULT_VIEWING_MODE };
  }
};

export const removeMicroApp = async (
  dispatch: AppDispatch,
  appId: string,
  onLogout: () => Promise<void>
) => {
  try {
    const microAppsDir = getMicroAppsDirectory();
    const extractedDir = new Directory(microAppsDir, `${appId}-extracted`);
    const zipFile = new File(microAppsDir, `${appId}.zip`);

    if (extractedDir.exists) {
      extractedDir.delete();
    }
    if (zipFile.exists) {
      zipFile.delete();
    }

    dispatch(
      updateAppStatus({
        appId,
        status: NOT_DOWNLOADED,
        webViewUri: "",
        clientId: "",
        exchangedToken: "",
        exchangedIdToken: "",
        displayMode: DEFAULT_VIEWING_MODE,
      })
    );
    await UpdateUserConfiguration(appId, NOT_DOWNLOADED, onLogout); // Update user configurations
  } catch (error) {
    Alert.alert("Error", "Failed to remove the app.");
  }
};

// API services
const loadStoredApps = async (): Promise<MicroApp[]> => {
  const storedAppsJson = await AsyncStorage.getItem(APPS);
  return storedAppsJson ? JSON.parse(storedAppsJson) : [];
};

const fetchLatestApps = async (
  onLogout: () => Promise<void>
): Promise<MicroApp[]> => {
  const response = await apiRequest(
    { url: `${BASE_URL}/micro-apps`, method: "GET" },
    onLogout
  );
  return response?.data || [];
};

const shouldUpdateApp = (storedApp: MicroApp, latestApp: MicroApp): boolean => {
  return (
    storedApp.status === DOWNLOADED &&
    storedApp.versions.length > 0 &&
    latestApp.versions.length > 0 &&
    latestApp.versions[0].version !== storedApp.versions[0].version
  );
};

const mergeAppData = (latestApp: MicroApp, storedApp?: MicroApp): MicroApp => {
  if (!storedApp) return latestApp;

  return {
    ...latestApp,
    status: storedApp.status,
    webViewUri: storedApp.webViewUri || "",
    clientId: storedApp.clientId || "",
    exchangedToken: storedApp.exchangedToken || "",
    exchangedIdToken: storedApp.exchangedIdToken || "",
    displayMode:
      storedApp.displayMode || latestApp.displayMode || DEFAULT_VIEWING_MODE,
  };
};

// Load app list and if updates available update apps
export const loadMicroAppDetails = async (
  dispatch: AppDispatch,
  onLogout: () => Promise<void>,
  onUpdateStart?: (appId: string) => void,
  onUpdateEnd?: (appId: string) => void
) => {
  try {
    // Load stored apps from AsyncStorage
    const storedApps = await loadStoredApps();

    // Abort if the user logged out during the async operation
    if (!store.getState().auth.userId) return;

    // Dispatch stored apps initially
    dispatch(setApps(storedApps));

    // Fetch latest micro apps list from API
    const latestApps = await fetchLatestApps(onLogout);

    if (latestApps.length > 0) {
      // Update apps list with status and webViewUri
      const apps: MicroApp[] = latestApps.map((latestApp: MicroApp) => {
        const storedApp = storedApps.find(
          (stored) => stored.appId === latestApp.appId
        );

        if (storedApp && shouldUpdateApp(storedApp, latestApp)) {
          onUpdateStart?.(latestApp.appId);

          downloadMicroApp(
            dispatch,
            latestApp.appId,
            latestApp.versions[0].downloadUrl,
            onLogout
          ).finally(() => {
            onUpdateEnd?.(latestApp.appId);
          });
        }

        return mergeAppData(latestApp, storedApp);
      });

      // Abort if the user logged out during the API fetch
      if (!store.getState().auth.userId) return;

      // Update Redux and AsyncStorage
      dispatch(setApps(await buildAppsWithTokens(apps)));
      await persistAppsWithoutTokens(apps);
    }
  } catch (error) {
    console.error("Error loading micro apps:", error);
    dispatch(setApps([]));
  }
};
