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

// The chat history drawer is an RN Modal, drawn over the whole window rather than
// inside the chat tab, so it has to close whenever the chat screen loses focus;
// otherwise a redirect away from chat leaves it covering the next tab.
import ChatScreen from "@/app/(tabs)/chat";
import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";

type HeaderButton = () => React.ReactElement<{ onPress: () => void }>;
let capturedHeaderLeft: HeaderButton | undefined;
let capturedHeaderRight: HeaderButton | undefined;
const mockSetOptions = jest.fn(
  (options: { headerLeft?: HeaderButton; headerRight?: HeaderButton }) => {
    capturedHeaderLeft = options.headerLeft;
    capturedHeaderRight = options.headerRight;
  },
);
// useFocusEffect's callback runs on focus and its cleanup on blur. The screen
// may register more than one, so the suite keeps the latest of each by call
// order (reset by useNavigation, which the screen calls first on every render)
// and drives focus and blur across all of them by hand.
type FocusEffect = () => void | (() => void);
let mockFocusEffects: FocusEffect[] = [];
let mockFocusSlot = 0;
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => {
    mockFocusSlot = 0;
    return { setOptions: mockSetOptions };
  },
  useFocusEffect: (effect: FocusEffect) => {
    mockFocusEffects[mockFocusSlot++] = effect;
  },
}));

const mockNavigate = jest.fn();
jest.mock("expo-router", () => ({
  router: { navigate: (...args: unknown[]) => mockNavigate(...args) },
}));

let mockLeave: (() => void) | undefined;
jest.mock("@/hooks/useLeaveWhenSessionEnds", () => ({
  useLeaveWhenSessionEnds: (leave: () => void) => {
    mockLeave = leave;
  },
}));
jest.mock("@/hooks/useTrackActiveScreen", () => ({
  useTrackActiveScreen: () => {},
}));
jest.mock("@/hooks/useBrandTheme", () => ({
  useBrandTheme: () => ({ isDark: false }),
}));
const mockCreateNewSession = jest.fn();
const mockSessions = {
  sessions: [] as { id: string; title: string; isPinned: boolean }[],
  activeSessionId: "session-1",
  isLoading: false,
  error: null as string | null,
  createNewSession: (...args: unknown[]) => mockCreateNewSession(...args),
  selectSession: jest.fn(),
  removeSession: jest.fn(),
  togglePinSession: jest.fn(),
  renameSession: jest.fn(),
};
jest.mock("@/components/chat/ChatSessionsContext", () => ({
  useChatSessionsContext: () => mockSessions,
}));
const mockChat = {
  messages: [] as { id: string }[],
  isGenerating: false,
  error: null,
  sendMessage: jest.fn(),
  stopGeneration: jest.fn(),
  retryMessage: jest.fn(),
  editMessage: jest.fn(),
};
jest.mock("@/hooks/useChat", () => ({ useChat: () => mockChat }));

jest.mock("@/components/chat/ChatSessionDrawer", () => "ChatSessionDrawer");
jest.mock("@/components/chat/ChatMenuButton", () => "ChatMenuButton");
jest.mock("@/components/chat/EditMessageModal", () => "EditMessageModal");
jest.mock("@/components/chat/ChatComposer", () => "ChatComposer");
jest.mock("@/components/chat/ChatEmptyState", () => "ChatEmptyState");
jest.mock("@/components/chat/ChatMessageRow", () => "ChatMessageRow");
jest.mock("@/components/brand/BrandIcon", () => "BrandIcon");
jest.mock("@/components/brand/WheelLoader", () => "WheelLoader");
jest.mock("@/components/brand/PrimaryButton", () => "PrimaryButton");
jest.mock("@/components/TextPromptDialog", () => "TextPromptDialog");
jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");

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
    SafeAreaInsetsContext: createContext({
      top: 0,
      bottom: 34,
      left: 0,
      right: 0,
    }),
    useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
  };
});

let root: ReactTestRenderer | undefined;

const renderScreen = () => {
  act(() => {
    root = create(<ChatScreen />);
  });
  return root!;
};

const isDrawerVisible = (renderer: ReactTestRenderer) =>
  renderer.root.find((node) => (node.type as unknown) === "ChatSessionDrawer")
    .props.visible as boolean;

const openDrawer = () => {
  act(() => {
    capturedHeaderLeft!().props.onPress();
  });
};

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  capturedHeaderLeft = undefined;
  capturedHeaderRight = undefined;
  mockFocusEffects = [];
  mockChat.messages = [];
  mockSessions.error = null;
  mockSessions.sessions = [];
  mockLeave = undefined;
  jest.clearAllMocks();
});

describe("Chat history drawer", () => {
  it("opens from the header's history button", () => {
    const renderer = renderScreen();
    expect(isDrawerVisible(renderer)).toBe(false);
    openDrawer();
    expect(isDrawerVisible(renderer)).toBe(true);
  });

  it("closes when the chat screen loses focus", () => {
    const renderer = renderScreen();
    let blurs: (void | (() => void))[] = [];
    act(() => {
      blurs = mockFocusEffects.map((focus) => focus());
    });
    openDrawer();
    expect(isDrawerVisible(renderer)).toBe(true);

    act(() => {
      blurs.forEach((blur) => typeof blur === "function" && blur());
    });
    expect(isDrawerVisible(renderer)).toBe(false);
  });

  it("closes when the session ends and the screen leaves for the feed", () => {
    const renderer = renderScreen();
    openDrawer();
    expect(isDrawerVisible(renderer)).toBe(true);

    act(() => {
      mockLeave?.();
    });
    expect(isDrawerVisible(renderer)).toBe(false);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});

// A promise the test settles by hand, to hold createNewSession in flight.
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

describe("Chat history drawer's new chat button", () => {
  const {
    default: ChatSessionDrawer,
    NEW_CHAT_FAILED_MESSAGE,
  } = jest.requireActual("@/components/chat/ChatSessionDrawer");
  const { getChatTheme } = jest.requireActual("@/constants/ChatTheme");
  const onClose = jest.fn();

  const renderDrawer = () => {
    act(() => {
      root = create(
        <ChatSessionDrawer
          visible
          theme={getChatTheme(false)}
          onClose={onClose}
        />,
      );
    });
    return root!;
  };

  const newChatButton = (renderer: ReactTestRenderer) =>
    renderer.root.find((node) => (node.type as unknown) === "PrimaryButton");

  const tapNewChat = (renderer: ReactTestRenderer) => {
    act(() => {
      newChatButton(renderer).props.onPress();
    });
  };

  it("stays open until the new session is active, then closes", async () => {
    const pending = deferred<{ id: string } | null>();
    mockCreateNewSession.mockReturnValueOnce(pending.promise);
    const renderer = renderDrawer();

    tapNewChat(renderer);
    expect(mockCreateNewSession).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(newChatButton(renderer).props.loading).toBe(true);

    await act(async () => pending.resolve({ id: "session-2" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(newChatButton(renderer).props.loading).toBe(false);
  });

  const failureAlerts = (renderer: ReactTestRenderer) =>
    renderer.root.findAll(
      (node) =>
        node.props.accessibilityRole === "alert" &&
        typeof node.props.children === "string",
    );

  it("stays open and says why when creation fails", async () => {
    mockCreateNewSession.mockResolvedValueOnce(null);
    const renderer = renderDrawer();

    await act(async () => {
      newChatButton(renderer).props.onPress();
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(newChatButton(renderer).props.loading).toBe(false);
    expect(failureAlerts(renderer)[0]?.props.children).toBe(
      NEW_CHAT_FAILED_MESSAGE,
    );
  });

  it("shows its own failure text, not a stale shared error", async () => {
    // e.g. no signed-in user: createNewSession returns null without setting `error`,
    // which still holds an earlier, unrelated failure.
    mockSessions.error = "Failed to rename chat";
    mockCreateNewSession.mockResolvedValueOnce(null);
    const renderer = renderDrawer();

    await act(async () => {
      newChatButton(renderer).props.onPress();
    });
    const texts = failureAlerts(renderer).map((node) => node.props.children);
    expect(texts).toContain(NEW_CHAT_FAILED_MESSAGE);
    expect(texts).not.toContain("Failed to rename chat");
  });

  it("ignores chat picks and closes while the new session is being created", async () => {
    mockSessions.sessions = [
      { id: "session-1", title: "Older chat", isPinned: false },
    ];
    const pending = deferred<{ id: string } | null>();
    mockCreateNewSession.mockReturnValueOnce(pending.promise);
    const renderer = renderDrawer();

    tapNewChat(renderer);
    const pressables = renderer.root.findAll(
      (node) =>
        typeof node.props.onPress === "function" &&
        (node.props.accessibilityLabel === "Older chat" ||
          node.props.accessibilityLabel === "Close chat history"),
    );
    expect(pressables.length).toBeGreaterThan(1);
    act(() => {
      pressables.forEach((node) => node.props.onPress());
    });
    expect(mockSessions.selectSession).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => pending.resolve({ id: "session-2" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.root
        .findAll(
          (node) =>
            typeof node.props.onPress === "function" &&
            node.props.accessibilityLabel === "Older chat",
        )[0]
        .props.onPress();
    });
    expect(mockSessions.selectSession).toHaveBeenCalledWith("session-1");
  });

  it("ignores a second tap while the first session is still being created", async () => {
    const pending = deferred<{ id: string } | null>();
    mockCreateNewSession.mockReturnValueOnce(pending.promise);
    const renderer = renderDrawer();

    act(() => {
      const { onPress } = newChatButton(renderer).props;
      onPress();
      onPress();
    });
    tapNewChat(renderer);
    expect(mockCreateNewSession).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve({ id: "session-2" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Chat header's new chat button", () => {
  it("ignores a second tap while the first session is still being created", async () => {
    const pending = deferred<{ id: string } | null>();
    mockCreateNewSession.mockReturnValueOnce(pending.promise);
    mockChat.messages = [{ id: "message-1" }];
    renderScreen();

    act(() => {
      capturedHeaderRight!().props.onPress();
      capturedHeaderRight!().props.onPress();
    });
    expect(mockCreateNewSession).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve({ id: "session-2" }));
    act(() => {
      capturedHeaderRight!().props.onPress();
    });
    expect(mockCreateNewSession).toHaveBeenCalledTimes(2);
  });
});
