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
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";

export const BRIDGE_FUNCTION = {
  topic: "download_file",
  handler: async (params: any, context: any) => {
    const {
      filename = "file",
      url,
      base64,
      mimeType = "application/octet-stream",
    } = params || {};
    if (!url && !base64) return context.reject("No url or base64 provided");

    try {
      const localUri = await writeTempFile(filename, url, base64);

      const safResult = await saveWithSAF(localUri, filename, mimeType, base64);
      if (safResult) return context.resolve(safResult);

      // Disable media library fallback for now to avoid user confusion
      // const mediaResult = await saveWithMediaLibrary(localUri);
      // if (mediaResult) return context.resolve(mediaResult);

      const shareResult = await shareFallback(localUri, mimeType);
      if (shareResult) return context.resolve(shareResult);

      // Final fallback → open URL
      if (url) {
        const { Linking } = require("react-native");
        await Linking.openURL(url);
        return context.resolve({ opened: true, url });
      }

      return context.reject("Failed to save file to device");
    } catch (err) {
      console.error("download_file error:", err);
      return context.reject(String(err));
    }
  },
};

// -----------------------------------------------------
// Helpers
// -----------------------------------------------------

export async function writeTempFile(
  filename: string,
  url?: string,
  base64?: string
) {
  const target = FileSystem.cacheDirectory + filename;

  if (url) {
    const res = await FileSystem.downloadAsync(url, target);
    return res.uri;
  }

  if (base64) {
    await FileSystem.writeAsStringAsync(target, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  return target;
}

export async function saveWithSAF(
  localUri: string,
  filename: string,
  mimeType: string,
  base64?: string
) {
  if (Platform.OS !== "android") return null;

  try {
    // @ts-ignore
    const perm =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perm?.granted) return null;

    // Create file
    // @ts-ignore
    const dest = await FileSystem.StorageAccessFramework.createFileAsync(
      perm.directoryUri,
      filename,
      mimeType
    );

    // Write data
    const data = base64
      ? base64
      : await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

    // @ts-ignore
    await FileSystem.StorageAccessFramework.writeAsStringAsync(dest, data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { saved: true, uri: dest };
  } catch {
    return null;
  }
}

export async function saveWithMediaLibrary(localUri: string) {
  try {
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (!perm.granted) return null;

    const asset = await MediaLibrary.createAssetAsync(localUri);

    const albumName = "Download";
    let album = await MediaLibrary.getAlbumAsync(albumName);

    if (!album) {
      try {
        await MediaLibrary.createAlbumAsync(albumName, asset, false);
      } catch {
        // some Androids do not support this for PDFs
      }
    }

    return { saved: true, asset, localPath: localUri };
  } catch {
    return null;
  }
}

export async function shareFallback(localUri: string, mimeType: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(localUri, { mimeType });
    return { shared: true, localUri };
  }
  return null;
}
