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
import { useBusinessCardActions } from "@/hooks/useBusinessCardActions";
import React from "react";
import { act, create } from "react-test-renderer";

const mockSaveBusinessCardPass = jest.fn();
const mockMarkPassAdded = jest.fn();

const claims = {
  userid: "3f0c1b2a-employee",
  given_name: "Jane",
  family_name: "Doe",
  email: "jane.doe@example.com",
  jobtitle: "Software Engineer",
  phone_number: "+15550100",
};

jest.mock("react-redux", () => ({
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      userInfo: {
        userInfo: {
          firstName: "Jane",
          lastName: "Doe",
          workEmail: "jane.doe@example.com",
          employeeThumbnail: null,
        },
      },
    }),
}));

jest.mock("@/hooks/useTokenClaims", () => ({
  useTokenClaims: () => claims,
}));

jest.mock("@/hooks/useWalletPassConfig", () => ({
  useWalletPassConfig: () => ({
    cardEnabled: true,
    walletDownloadEnabled: true,
  }),
}));

jest.mock("@/services/authService", () => ({ logout: jest.fn() }));

jest.mock("@/services/walletPassService", () => ({
  saveBusinessCardPass: (...args: unknown[]) =>
    mockSaveBusinessCardPass(...args),
}));

jest.mock("@/services/businessCardService", () => ({
  shareVCard: jest.fn().mockResolvedValue(undefined),
  shareCardImage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/services/wallet/passPresence", () => ({
  isPassInWallet: jest.fn().mockResolvedValue(false),
  markPassAdded: (...args: unknown[]) => mockMarkPassAdded(...args),
  openPassInWallet: jest.fn().mockResolvedValue(true),
}));

jest.mock("react-native-view-shot", () => ({
  captureRef: jest.fn().mockResolvedValue("file:///card.png"),
}));

type Actions = ReturnType<typeof useBusinessCardActions>;

const Probe = ({ report }: { report: (actions: Actions) => void }) => {
  report(useBusinessCardActions(true));
  return null;
};

const renderActions = async (): Promise<() => Actions> => {
  let actions: Actions | undefined;
  await act(async () => {
    create(
      <Probe
        report={(next) => {
          actions = next;
        }}
      />,
    );
  });
  return () => actions!;
};

/** A pass request the case holds open, the way a slow backend would. */
const pendingSave = (): ((added: boolean) => void) => {
  let settle: (added: boolean) => void = () => {};
  mockSaveBusinessCardPass.mockReturnValue(
    new Promise<boolean>((resolve) => {
      settle = resolve;
    }),
  );
  return (added) => settle(added);
};

beforeEach(() => {
  mockSaveBusinessCardPass.mockReset().mockResolvedValue(false);
  mockMarkPassAdded.mockReset().mockResolvedValue(undefined);
});

describe("useBusinessCardActions", () => {
  // `saving` only disables the wallet badge on the render it schedules, so
  // taps that queue while the JS thread is busy all land on an enabled badge.
  // Two of them through the save would be two passes issued and two audit rows.
  it("ignores a second tap while the first save is still running", async () => {
    const settle = pendingSave();
    const actions = await renderActions();
    const save = actions().savePass;

    let taps: Promise<void>[] = [];
    await act(async () => {
      taps = [save(), save()];
    });

    expect(mockSaveBusinessCardPass).toHaveBeenCalledTimes(1);
    expect(actions().saving).toBe(true);

    await act(async () => {
      settle(true);
      await Promise.all(taps);
    });

    expect(mockSaveBusinessCardPass).toHaveBeenCalledTimes(1);
    expect(mockMarkPassAdded).toHaveBeenCalledTimes(1);
  });

  // The guard is about the in-flight call, not a one-shot: a save that failed
  // has to stay retryable.
  it("lets the employee retry once the save has settled", async () => {
    mockSaveBusinessCardPass.mockResolvedValue(false);
    const actions = await renderActions();

    // Opened the way the employee opens it, so the assertion below is about the
    // sheet surviving the failed save rather than about it never having shown.
    await act(async () => {
      actions().savePass();
    });
    expect(actions().disclaimerVisible).toBe(true);

    await act(async () => {
      await actions().savePass();
    });
    await act(async () => {
      await actions().savePass();
    });

    expect(mockSaveBusinessCardPass).toHaveBeenCalledTimes(2);
    expect(actions().saving).toBe(false);
    // The retry is only reachable from the consent sheet, so the sheet having
    // stayed up is the whole point rather than an incidental detail.
    expect(actions().disclaimerVisible).toBe(true);
  });
});
