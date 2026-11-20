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
import { useChatSessions } from "@/hooks/useChatSessions";
import { ChatSession } from "@/types/chat.types";
import { act, create, ReactTestRenderer } from "react-test-renderer";

const mockDb = {
  setUserId: jest.fn(),
  initialize: jest.fn(),
  listSessions: jest.fn(),
  createSession: jest.fn(),
};
jest.mock("@/services/chatDatabase", () => ({
  get chatDatabase() {
    return mockDb;
  },
}));

const session = (id: string): ChatSession =>
  ({ id, title: id, isPinned: false }) as unknown as ChatSession;

let hook: ReturnType<typeof useChatSessions>;
let tree: ReactTestRenderer | undefined;

function TestHost({ userId }: { userId: string | null }) {
  hook = useChatSessions(userId);
  return null;
}

const mount = async (userId: string | null = "test-user") => {
  await act(async () => {
    tree = create(<TestHost userId={userId} />);
  });
};

let warn: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.initialize.mockResolvedValue(undefined);
  mockDb.listSessions.mockResolvedValue([session("older")]);
  warn = jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  act(() => tree?.unmount());
  tree = undefined;
  warn.mockRestore();
});

describe("useChatSessions createNewSession", () => {
  it("creates, lists and activates the new session", async () => {
    await mount();
    mockDb.createSession.mockResolvedValueOnce(session("new"));
    mockDb.listSessions.mockResolvedValueOnce([session("new"), session("older")]);

    let created: ChatSession | null = null;
    await act(async () => {
      created = await hook.createNewSession();
    });

    expect(created).toEqual(session("new"));
    expect(hook.activeSessionId).toBe("new");
    expect(hook.sessions.map((s) => s.id)).toEqual(["new", "older"]);
  });

  it("returns null without touching the shared error when the insert fails", async () => {
    await mount();
    mockDb.createSession.mockRejectedValueOnce(new Error("disk full"));

    let created: ChatSession | null = session("unset");
    await act(async () => {
      created = await hook.createNewSession();
    });

    expect(created).toBeNull();
    expect(hook.activeSessionId).toBe("older");
    expect(hook.error).toBeNull();
  });

  it("returns null with no signed-in user", async () => {
    await mount(null);

    let created: ChatSession | null = session("unset");
    await act(async () => {
      created = await hook.createNewSession();
    });

    expect(created).toBeNull();
    expect(mockDb.createSession).not.toHaveBeenCalled();
  });
});
