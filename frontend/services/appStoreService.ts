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
  addRemoving,
  MicroApp,
  removeDownloading,
  removeRemoving,
  setApps,
  updateAppStatus,
  updateDownloadProgress,
} from "@/context/slices/appSlice";
import { selectIsSignedIn } from "@/context/slices/authSlice";
import { AppDispatch, store } from "@/context/store";
import { buildAppsWithTokens } from "@/utils/exchangedTokenRehydrator";
import { persistAppsWithoutTokens } from "@/utils/exchangedTokenStore";
import { parseRequiredPermissions } from "@/utils/microAppManifest";
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
  downloadUrl: string | null
): Promise<boolean> => {
  try {
    dispatch(addDownloading(appId)); // Downloading status for indicator
    dispatch(updateDownloadProgress({ appId, progress: 0 })); // Initialize progress

    if (!downloadUrl) {
      throw new Error("Download URL is empty.");
    }

    await downloadAndSaveFile(dispatch, appId, downloadUrl); // Download react production build
    dispatch(updateDownloadProgress({ appId, progress: 70 }));

    const installed = await unzipFile(appId); // Unzip downloaded zip file
    dispatch(updateDownloadProgress({ appId, progress: 90 }));

    // The user config list has to gain the app before its status flips: the My
    // Apps screen reconciles what is on disk against that list, and would
    // uninstall the app again if it saw the new status first.
    // A rejected write reports itself by returning false, not by throwing, and
    // has already rolled the list back — so flipping the status here would
    // leave an installed app the sync effect immediately uninstalls.
    const entitled = await UpdateUserConfiguration(appId, DOWNLOADED); // Update user configurations
    if (!entitled) {
      throw new Error("Failed to update user configuration.");
    }

    dispatch(
      updateAppStatus({
        appId,
        status: DOWNLOADED,
        webViewUri: installed.webViewUri,
        clientId: installed.clientId,
        displayMode: installed.displayMode,
        requiredPermissions: installed.requiredPermissions,
      })
    );
    dispatch(updateDownloadProgress({ appId, progress: 100 }));

    return true;
  } catch (error) {
    await UpdateUserConfiguration(appId, NOT_DOWNLOADED); // Update user configurations
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

const unzipFile = async (appId: string) => {
  try {
    const microAppsDir = getMicroAppsDirectory();
    const zipFile = new File(microAppsDir, `${appId}.zip`);
    const extractedDir = new Directory(microAppsDir, `${appId}-extracted`);

    if (!zipFile.exists || zipFile.size === 0) {
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

    return {
      webViewUri: encodeURI(relativeUri),
      clientId: microAppConfig.clientId as string,
      displayMode: microAppConfig.displayMode,
      requiredPermissions: microAppConfig.requiredPermissions,
    };
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
            requiredPermissions: parseRequiredPermissions(
              appConfig.requiredPermissions
            ),
          };
        } catch (jsonError) {
          console.error("Error parsing microapp.json:", jsonError);
          Alert.alert("Error", "Failed to parse microapp.json.");
          return EMPTY_MICRO_APP_CONFIG;
        }
      }
    }

    Alert.alert("Error", "microapp configs not found after unzipping.");
    return EMPTY_MICRO_APP_CONFIG;
  } catch (error) {
    console.error("Error reading microapp config:", error);
    return EMPTY_MICRO_APP_CONFIG;
  }
};

const EMPTY_MICRO_APP_CONFIG = {
  clientId: null,
  displayMode: DEFAULT_VIEWING_MODE,
  requiredPermissions: [] as string[],
};

export const removeMicroApp = async (dispatch: AppDispatch, appId: string) => {
  try {
    // Marks the app busy for the whole removal. The My Apps screen reconciles
    // disk against the user's app list, and every intermediate state here looks
    // to it like something to undo.
    dispatch(addRemoving(appId));

    const microAppsDir = getMicroAppsDirectory();
    const extractedDir = new Directory(microAppsDir, `${appId}-extracted`);
    const zipFile = new File(microAppsDir, `${appId}.zip`);

    // Drop the entitlement before flipping the status. The status dispatch
    // re-triggers the My Apps sync effect, which would otherwise still see this
    // app as entitled but missing from disk and immediately re-download it.
    // A rejected write returns false rather than throwing and rolls the list
    // back, so the app stays entitled. Deleting the files anyway is what makes
    // the sync effect download it again.
    const unentitled = await UpdateUserConfiguration(appId, NOT_DOWNLOADED);
    if (!unentitled) {
      throw new Error("Failed to update user configuration.");
    }

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
  } catch (error) {
    Alert.alert("Error", "Failed to remove the app.");
  } finally {
    dispatch(removeRemoving(appId));
  }
};

// API services
const loadStoredApps = async (): Promise<MicroApp[]> => {
  const storedAppsJson = await AsyncStorage.getItem(APPS);
  return storedAppsJson ? JSON.parse(storedAppsJson) : [];
};

// Null when no request went out (no token, or the refresh failed), so the caller can tell
// that apart from a list that came back empty.
const fetchLatestApps = async (): Promise<MicroApp[] | null> => {
  const response = await apiRequest({
    url: `${BASE_URL}/micro-apps`,
    method: "GET",
  });
  if (!response) return null;
  return response.data || [];
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
    // The installed microapp.json is what the host enforces against, so it wins over
    // the store listing. An app that is not installed has no manifest, only the
    // listing's pre-install preview: removing an app stores an empty list.
    requiredPermissions:
      (storedApp.status === DOWNLOADED
        ? storedApp.requiredPermissions
        : undefined) ??
      latestApp.requiredPermissions ??
      [],
  };
};

// Load app list and if updates available update apps. Resolves true only when the latest
// list was fetched and applied, so a caller can tell a real update check from a skipped one.
export const loadMicroAppDetails = async (
  dispatch: AppDispatch,
  onUpdateStart?: (appId: string) => void,
  onUpdateEnd?: (appId: string) => void
): Promise<boolean> => {
  try {
    // Load stored apps from AsyncStorage
    const storedApps = await loadStoredApps();

    // Abort if the session ended during the async operation. On the session, not
    // userId: a session restored offline is signed in with Redux auth cleared.
    if (!selectIsSignedIn(store.getState())) return false;

    // Dispatch stored apps initially
    dispatch(setApps(storedApps));

    // Fetch latest micro apps list from API
    const latestApps = await fetchLatestApps();
    if (!latestApps) return false;

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
            latestApp.versions[0].downloadUrl
          ).finally(() => {
            onUpdateEnd?.(latestApp.appId);
          });
        }

        return mergeAppData(latestApp, storedApp);
      });

      // Abort if the session ended during the API fetch
      if (!selectIsSignedIn(store.getState())) return false;

      // Update Redux and AsyncStorage
      dispatch(setApps(await buildAppsWithTokens(apps)));
      await persistAppsWithoutTokens(apps);
    }
    return true;
  } catch (error) {
    // The list already on screen came from disk and is still the user's. Clearing it is
    // for the end of a session (endSession), not for a request that did not get through.
    console.error("Error loading micro apps:", error);
    return false;
  }
};
