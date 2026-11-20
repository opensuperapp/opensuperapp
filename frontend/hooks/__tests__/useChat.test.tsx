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

// A reply's row is saved as Streaming before its request goes out. If the app is
// killed mid-request nothing settles it, so loading must fail it; but it must
// never touch a reply this runtime is still waiting on.
import { ChatRole, MessageStatus } from "@/constants/enums/Chat";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "@/types/chat.types";
import { act, create, ReactTestRenderer } from "react-test-renderer";

const mockListMessages = jest.fn();
const mockUpdateMessage = jest.fn();
const mockInsertMessage = jest.fn();
jest.mock("@/services/chatDatabase", () => ({
  chatDatabase: {
    listMessages: (...args: unknown[]) => mockListMessages(...args),
    updateMessage: (...args: unknown[]) => mockUpdateMessage(...args),
    insertMessage: (...args: unknown[]) => mockInsertMessage(...args),
    updateSessionTitle: jest.fn(),
  },
  deriveSessionTitle: (s: string) => s,
}));

let mockResolveReply: ((reply: string) => void) | undefined;
jest.mock("@/services/chatService", () => ({
  buildHistoryPayload: () => [],
  sendChatMessage: () =>
    new Promise<string>((resolve) => {
      mockResolveReply = resolve;
    }),
}));

const message = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: "m",
  sessionId: "s1",
  role: ChatRole.Assistant,
  content: "",
  status: MessageStatus.Streaming,
  // Long before this test runtime started.
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

let chat!: ReturnType<typeof useChat>;
function TestHost() {
  chat = useChat("s1");
  return null;
}

const flush = () => act(async () => {});

const mount = async (): Promise<ReactTestRenderer> => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<TestHost />);
  });
  await flush();
  return tree;
};

beforeEach(() => {
  mockListMessages.mockReset();
  mockUpdateMessage.mockReset().mockResolvedValue(undefined);
  mockInsertMessage.mockReset();
  mockResolveReply = undefined;
});

describe("useChat loading a reply cut off by the app being killed", () => {
  it("fails a leftover empty Streaming or Pending reply, in the db and on screen", async () => {
    mockListMessages.mockResolvedValue([
      message({ id: "u1", role: ChatRole.User, content: "hi", status: MessageStatus.Sent }),
      message({ id: "a1" }),
      message({ id: "a2", status: MessageStatus.Pending }),
    ]);

    await mount();

    expect(mockUpdateMessage).toHaveBeenCalledTimes(2);
    expect(mockUpdateMessage).toHaveBeenCalledWith("a1", { status: MessageStatus.Error });
    expect(mockUpdateMessage).toHaveBeenCalledWith("a2", { status: MessageStatus.Error });
    expect(chat.messages.map((m) => m.status)).toEqual([
      MessageStatus.Sent,
      MessageStatus.Error,
      MessageStatus.Error,
    ]);
  });

  it("leaves settled replies and replies with content alone", async () => {
    mockListMessages.mockResolvedValue([
      message({ id: "a1", content: "Hello", status: MessageStatus.Sent }),
      message({ id: "a2", content: "partial", status: MessageStatus.Streaming }),
      message({ id: "a3", content: "Generation stopped.", status: MessageStatus.Stopped }),
    ]);

    await mount();

    expect(mockUpdateMessage).not.toHaveBeenCalled();
  });

  it("never touches a reply this runtime is still waiting on", async () => {
    mockListMessages.mockResolvedValue([]);
    await mount();

    const user = message({ id: "u1", role: ChatRole.User, content: "hi", status: MessageStatus.Sent });
    // Even with an old timestamp, a tracked in-flight reply is not an orphan.
    const pendingReply = message({ id: "a1" });
    mockInsertMessage
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(pendingReply);

    let sending!: Promise<void>;
    act(() => {
      sending = chat.sendMessage("hi");
    });
    await flush();
    expect(mockResolveReply).toBeDefined();

    // A reload mid-request (e.g. switching back to this chat) sees the row.
    mockListMessages.mockResolvedValue([user, pendingReply]);
    await act(async () => {
      await chat.refreshMessages();
    });

    expect(mockUpdateMessage).not.toHaveBeenCalled();
    expect(chat.messages[1].status).toBe(MessageStatus.Streaming);

    mockListMessages.mockResolvedValue([
      user,
      { ...pendingReply, content: "Hello", status: MessageStatus.Sent },
    ]);
    await act(async () => {
      mockResolveReply?.("Hello");
      await sending;
    });
    expect(mockUpdateMessage).toHaveBeenCalledWith("a1", {
      content: "Hello",
      status: MessageStatus.Sent,
    });
  });

  it("does not touch a reply created since this runtime started", async () => {
    mockListMessages.mockResolvedValue([message({ id: "a1", createdAt: Date.now() + 1 })]);

    await mount();

    expect(mockUpdateMessage).not.toHaveBeenCalled();
  });
});
