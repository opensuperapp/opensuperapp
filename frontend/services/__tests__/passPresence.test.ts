// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
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

// Both platform modules are covered here, imported by their explicit platform
// paths. They present one contract to the hook that drives the card footer and
// answer it from two completely different places: iOS asks PassKit what the
// wallet holds, Android can only remember what this device last did, because
// Google Wallet gives a third-party app nothing to ask.
type ApplePresence = typeof import("@/services/wallet/passPresence.ios");
type AndroidPresence = typeof import("@/services/wallet/passPresence.android");

const mockHasPass = jest.fn();
const mockViewInWallet = jest.fn();
const mockOpenURL = jest.fn();

// AsyncStorage stands in as a real store rather than a pair of spies, so the
// Android module's write and its read are checked against each other instead
// of against the test's own idea of the key format.
const mockStore = new Map<string, string>();

jest.mock("react-native-wallet-manager", () => ({
  __esModule: true,
  default: {
    hasPass: (...args: unknown[]) => mockHasPass(...args),
    viewInWallet: (...args: unknown[]) => mockViewInWallet(...args),
  },
}));

jest.mock("react-native", () => ({
  Linking: { openURL: (url: string) => mockOpenURL(url) },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStore.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mockStore.set(key, value);
    },
  },
}));

const PASS_TYPE_ID = "pass.com.wso2.businesscard";
const SERIAL = "3f0c1b2a-employee";

/**
 * Loads the iOS module against a given pass type identifier. The constant is
 * read at call time but comes from the environment, so it is mocked per case
 * rather than depending on whatever .env the test run happens to see.
 */
const loadApple = (passTypeId = PASS_TYPE_ID): ApplePresence => {
  jest.resetModules();
  jest.doMock("@/constants/Constants", () => ({
    __esModule: true,
    APPLE_PASS_TYPE_ID: passTypeId,
  }));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@/services/wallet/passPresence.ios") as ApplePresence;
};

const loadAndroid = (): AndroidPresence => {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@/services/wallet/passPresence.android") as AndroidPresence;
};

beforeEach(() => {
  mockHasPass.mockReset();
  mockViewInWallet.mockReset();
  mockOpenURL.mockReset();
  mockStore.clear();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("passPresence (iOS) — PassKit answers directly", () => {
  it("asks Wallet for this pass type and this serial", async () => {
    mockHasPass.mockResolvedValue(true);
    const { isPassInWallet } = loadApple();

    await expect(isPassInWallet(SERIAL)).resolves.toBe(true);
    expect(mockHasPass).toHaveBeenCalledWith(PASS_TYPE_ID, SERIAL);
  });

  it("reports a wallet that does not hold the card", async () => {
    mockHasPass.mockResolvedValue(false);
    const { isPassInWallet } = loadApple();

    await expect(isPassInWallet(SERIAL)).resolves.toBe(false);
  });

  it("does not ask without a serial number", async () => {
    const { isPassInWallet } = loadApple();

    await expect(isPassInWallet("")).resolves.toBe(false);
    expect(mockHasPass).not.toHaveBeenCalled();
  });

  it("does not ask without a configured pass type identifier", async () => {
    const { isPassInWallet } = loadApple("");

    await expect(isPassInWallet(SERIAL)).resolves.toBe(false);
    expect(mockHasPass).not.toHaveBeenCalled();
  });

  // This runs while the business card sheet is open. A rejection escaping here
  // would take the sheet down over a question whose worst honest answer is
  // "no", which only costs the employee an add button that is already there.
  it("answers no instead of throwing when PassKit rejects", async () => {
    mockHasPass.mockRejectedValue(new Error("PassKit unavailable"));
    const { isPassInWallet } = loadApple();

    await expect(isPassInWallet(SERIAL)).resolves.toBe(false);
  });

  it("opens Wallet on the card", async () => {
    mockViewInWallet.mockResolvedValue(true);
    const { openPassInWallet } = loadApple();

    await expect(openPassInWallet(SERIAL)).resolves.toBe(true);
    expect(mockViewInWallet).toHaveBeenCalledWith(PASS_TYPE_ID, SERIAL);
  });

  it("remembers nothing on a completed add, because PassKit is the record", async () => {
    const { markPassAdded, isPassInWallet } = loadApple();
    mockHasPass.mockResolvedValue(false);

    await markPassAdded(SERIAL);

    // A flag written here could only ever disagree with the wallet itself.
    await expect(isPassInWallet(SERIAL)).resolves.toBe(false);
  });
});

describe("passPresence (Android) — the app remembers what it did", () => {
  it("writes a marker keyed by the serial number", async () => {
    const { markPassAdded } = loadAndroid();

    await markPassAdded(SERIAL);

    expect([...mockStore.keys()]).toEqual([expect.stringContaining(SERIAL)]);
  });

  it("reads its own marker back", async () => {
    const { markPassAdded, isPassInWallet } = loadAndroid();

    await expect(isPassInWallet(SERIAL)).resolves.toBe(false);
    await markPassAdded(SERIAL);
    await expect(isPassInWallet(SERIAL)).resolves.toBe(true);
  });

  // The key carries the serial so a shared device does not hand the next
  // employee to sign in the previous one's answer.
  it("does not answer for a different card", async () => {
    const { markPassAdded, isPassInWallet } = loadAndroid();

    await markPassAdded(SERIAL);

    await expect(isPassInWallet("someone-else")).resolves.toBe(false);
  });

  it("does not answer without a serial number", async () => {
    const { isPassInWallet } = loadAndroid();

    await expect(isPassInWallet("")).resolves.toBe(false);
  });

  it("opens the Google Wallet app when the intent resolves", async () => {
    mockOpenURL.mockResolvedValue(true);
    const { openPassInWallet } = loadAndroid();

    await expect(openPassInWallet(SERIAL)).resolves.toBe(true);
    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    expect(mockOpenURL.mock.calls[0][0]).toContain(
      "com.google.android.apps.walletnfcrel",
    );
  });

  // Nothing resolves the intent when Google Wallet is not installed, and
  // openURL throws rather than returning false, so the web wallet is the only
  // thing between the employee and a button that does nothing.
  it("falls back to the web wallet when the app is not installed", async () => {
    mockOpenURL
      .mockRejectedValueOnce(new Error("No Activity found to handle Intent"))
      .mockResolvedValueOnce(true);
    const { openPassInWallet } = loadAndroid();

    await expect(openPassInWallet(SERIAL)).resolves.toBe(true);
    expect(mockOpenURL).toHaveBeenCalledTimes(2);
    expect(mockOpenURL.mock.calls[1][0]).toBe("https://wallet.google.com/");
  });

  it("gives up quietly when neither destination opens", async () => {
    mockOpenURL.mockRejectedValue(new Error("nothing to open"));
    const { openPassInWallet } = loadAndroid();

    await expect(openPassInWallet(SERIAL)).resolves.toBe(false);
  });
});
