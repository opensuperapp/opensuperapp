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
import { ChatMenuAction, showChatActionMenu } from "@/components/chat/chatActions";
import { Alert, AlertButton } from "react-native";

jest.mock("@/constants/Constants", () => ({ isIos: false }));

const action = (label: string, destructive = false): ChatMenuAction => ({
  label,
  onPress: jest.fn(),
  destructive,
});

// RN's Android alert keeps three buttons and assigns them from the end: positive,
// negative, then neutral.
const slots = (buttons: AlertButton[]) => {
  const [positive, negative, neutral] = [...buttons].reverse();
  return {
    neutral: neutral?.text,
    negative: negative?.text,
    positive: positive?.text,
  };
};

let alertSpy: jest.SpyInstance;
beforeEach(() => {
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(() => alertSpy.mockRestore());

const shownButtons = (call = 0): AlertButton[] => alertSpy.mock.calls[call][2];

describe("showChatActionMenu on Android", () => {
  it("fits the session menu into the three slots, keeping Delete off the primary one", () => {
    showChatActionMenu("Session", [
      action("Rename"),
      action("Pin"),
      action("Delete", true),
    ]);

    const buttons = shownButtons();
    expect(buttons).toHaveLength(3);
    expect(slots(buttons)).toEqual({
      neutral: "Delete",
      negative: "Rename",
      positive: "Pin",
    });
    expect(alertSpy.mock.calls[0][3]).toEqual({ cancelable: true });
  });

  it("puts Cancel in the negative slot when there is room", () => {
    showChatActionMenu(undefined, [action("Edit"), action("Copy")]);

    expect(slots(shownButtons())).toEqual({
      neutral: "Edit",
      negative: "Cancel",
      positive: "Copy",
    });
  });

  it("shows a single action beside Cancel", () => {
    showChatActionMenu(undefined, [action("Copy")]);

    expect(slots(shownButtons())).toEqual({
      neutral: undefined,
      negative: "Cancel",
      positive: "Copy",
    });
  });

  it("opens the actions past three as a second menu", () => {
    const actions = ["A", "B", "C", "D"].map((label) => action(label));
    showChatActionMenu("Menu", actions);

    const buttons = shownButtons();
    expect(buttons.map((b) => b.text)).toEqual(["A", "B", "More…"]);

    buttons[2].onPress?.();
    expect(shownButtons(1).map((b) => b.text)).toEqual(["C", "Cancel", "D"]);
  });

  it("runs the chosen action", () => {
    const rename = action("Rename");
    showChatActionMenu("Session", [rename]);

    shownButtons()
      .find((b) => b.text === "Rename")
      ?.onPress?.();
    expect(rename.onPress).toHaveBeenCalled();
  });
});
