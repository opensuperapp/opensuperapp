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

// KeyboardLift starts lifting once the keyboard passes the gap between the screen's
// bottom edge and the window's. After a rotation, the screen's layout and the new
// window height can arrive in either order, and the gap has to end up measured
// against the new height both ways.
import ChatScreen from "@/app/(tabs)/chat";
import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";

let mockWindowHeight = 800;
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => ({ width: 400, height: mockWindowHeight, scale: 2, fontScale: 1 }),
}));

jest.mock("expo-router/react-navigation", () => ({
  useNavigation: () => ({ setOptions: jest.fn() }),
  useFocusEffect: () => {},
}));
jest.mock("expo-router", () => ({ router: { navigate: jest.fn() } }));
jest.mock("@/hooks/useLeaveWhenSessionEnds", () => ({
  useLeaveWhenSessionEnds: () => {},
}));
jest.mock("@/hooks/useTrackActiveScreen", () => ({
  useTrackActiveScreen: () => {},
}));
jest.mock("@/hooks/useBrandTheme", () => ({
  useBrandTheme: () => ({ isDark: false }),
}));
jest.mock("@/components/chat/ChatSessionsContext", () => ({
  useChatSessionsContext: () => ({
    activeSessionId: "session-1",
    isLoading: false,
    error: null,
    createNewSession: jest.fn(),
  }),
}));
jest.mock("@/hooks/useChat", () => ({
  useChat: () => ({
    messages: [],
    isGenerating: false,
    error: null,
    sendMessage: jest.fn(),
    stopGeneration: jest.fn(),
    retryMessage: jest.fn(),
    editMessage: jest.fn(),
  }),
}));

jest.mock("@/components/chat/ChatSessionDrawer", () => "ChatSessionDrawer");
jest.mock("@/components/chat/ChatMenuButton", () => "ChatMenuButton");
jest.mock("@/components/chat/EditMessageModal", () => "EditMessageModal");
jest.mock("@/components/chat/ChatComposer", () => "ChatComposer");
jest.mock("@/components/chat/ChatEmptyState", () => "ChatEmptyState");
jest.mock("@/components/chat/ChatMessageRow", () => "ChatMessageRow");
jest.mock("@/components/brand/BrandIcon", () => "BrandIcon");
jest.mock("@/components/brand/WheelLoader", () => "WheelLoader");

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));
jest.mock("react-native-keyboard-controller", () => ({
  useReanimatedKeyboardAnimation: () => ({ height: { value: 0 } }),
  useKeyboardController: () => ({ enabled: true, setEnabled: jest.fn() }),
  KeyboardController: { setInputMode: jest.fn(), setDefaultMode: jest.fn() },
  AndroidSoftInputModes: {},
}));
jest.mock("react-native-safe-area-context", () => {
  const { createContext } = jest.requireActual("react");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaInsetsContext: createContext({ top: 0, bottom: 34, left: 0, right: 0 }),
    useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
  };
});

// Where the screen's view sits in the window, as measureInWindow reports it.
let mockScreenFrame = { y: 0, height: 700 };

let root: ReactTestRenderer | undefined;

// React Native's jest preset backs a View with a class whose measureInWindow is a
// bare jest.fn, so the screen's own instance is given one that reports the frame.
const renderScreen = () => {
  act(() => {
    root = create(<ChatScreen />);
  });
  const native = root!.root.find(
    (node) =>
      typeof node.props.onLayout === "function" &&
      typeof node.instance?.measureInWindow === "function",
  ).instance;
  native.measureInWindow = (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => callback(0, mockScreenFrame.y, 400, mockScreenFrame.height);
  return root!;
};

const rerender = () => {
  act(() => {
    root!.update(<ChatScreen />);
  });
};

const layOut = (renderer: ReactTestRenderer) => {
  act(() => {
    renderer.root
      .findAll((node) => typeof node.props.onLayout === "function")[0]
      .props.onLayout();
  });
};

const screenBottomGap = (renderer: ReactTestRenderer) =>
  renderer.root.find((node) => node.props.screenBottomGap !== undefined).props
    .screenBottomGap as number;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  mockWindowHeight = 800;
  mockScreenFrame = { y: 0, height: 700 };
});

describe("Chat keyboard lift's screen gap", () => {
  it("is the space between the screen's bottom edge and the window's", () => {
    const renderer = renderScreen();
    layOut(renderer);
    expect(screenBottomGap(renderer)).toBe(100);
  });

  it("is measured again when the window height arrives after the layout", () => {
    const renderer = renderScreen();
    layOut(renderer);

    // Rotated: the screen is laid out for the new window first...
    mockScreenFrame = { y: 0, height: 300 };
    layOut(renderer);
    // ...and only then does the new window height come through.
    mockWindowHeight = 400;
    rerender();

    expect(screenBottomGap(renderer)).toBe(100);
  });

  it("is measured again when the layout arrives after the window height", () => {
    const renderer = renderScreen();
    layOut(renderer);

    mockWindowHeight = 400;
    rerender();
    mockScreenFrame = { y: 0, height: 300 };
    layOut(renderer);

    expect(screenBottomGap(renderer)).toBe(100);
  });
});
