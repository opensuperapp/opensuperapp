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

// The waiting row: the avatar plays the Wave beside a muted "Thinking…". Exit
// animations must only play for the in-place swap, never keep a removed row (or
// the line the reply replaces) on screen.
import ChatMessageRow from "@/components/chat/ChatMessageRow";
import SuperAppAgentIcon from "@/components/chat/SuperAppAgentIcon";
import { CHAT_THINKING } from "@/constants/Constants";
import { ChatRole, MessageStatus } from "@/constants/enums/Chat";
import { ChatMessage } from "@/types/chat.types";
import React from "react";
import { Text } from "react-native";
import { LayoutAnimationConfig } from "react-native-reanimated";
import { act, create, ReactTestRenderer } from "react-test-renderer";

jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("@/components/brand/BrandIcon", () => () => null);
jest.mock("@/components/brand/WaveMark", () => () => null);
jest.mock("@/components/brand/ChoreoMark", () => () => null);
jest.mock("@/components/chat/AssistantMessageContent", () => {
  const { Text: MockText } = jest.requireActual("react-native");
  return ({ content }: { content: string }) => <MockText>{content}</MockText>;
});

const theme = {
  muted: "#888",
  userBubble: "#eee",
  userText: "#111",
  accent: "#f60",
} as unknown as React.ComponentProps<typeof ChatMessageRow>["theme"];

const assistant = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "m1",
  sessionId: "s1",
  role: ChatRole.Assistant,
  content: "",
  status: MessageStatus.Streaming,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

const render = (message: ChatMessage): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <ChatMessageRow message={message} theme={theme} onCopy={jest.fn()} />
    );
  });
  return tree;
};

const thinkingText = (tree: ReactTestRenderer) =>
  tree.root.findAll(
    (node) => node.props.children === CHAT_THINKING && node.type !== Text
  );

describe("ChatMessageRow waiting state", () => {
  it("shows Thinking… without an exit fade, so it never stacks on the reply", () => {
    const tree = render(assistant());
    const [thinking] = thinkingText(tree);
    expect(thinking).toBeDefined();
    expect(thinking.props.exiting).toBeUndefined();

    act(() => {
      tree.update(
        <ChatMessageRow
          message={assistant({ content: "Hello", status: MessageStatus.Sent })}
          theme={theme}
          onCopy={jest.fn()}
        />
      );
    });
    expect(thinkingText(tree)).toHaveLength(0);
  });

  it("leaves the spoken cue to the avatar alone", () => {
    const tree = render(assistant());
    const [thinking] = thinkingText(tree);
    expect(thinking.props.accessibilityElementsHidden).toBe(true);
    expect(thinking.props.importantForAccessibility).toBe("no");
  });
});

describe("SuperAppAgentIcon", () => {
  const renderIcon = (animated: boolean): ReactTestRenderer => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(<SuperAppAgentIcon animated={animated} />);
    });
    return tree;
  };

  it("skips the marks' exits when the whole avatar unmounts", () => {
    const config = renderIcon(true).root.findByType(LayoutAnimationConfig);
    expect(config.props.skipEntering).toBe(true);
    expect(config.props.skipExiting).toBe(true);
  });

  it("keeps the in-place crossfade between the Wave and the mark", () => {
    const tree = renderIcon(true);
    const config = tree.root.findByType(LayoutAnimationConfig);
    const wave = config.findAll((n) => n.props.exiting !== undefined)[0];
    expect(wave).toBeDefined();

    act(() => {
      tree.update(<SuperAppAgentIcon animated={false} />);
    });
    // Same config instance survives the swap, so the swapped child's exit runs.
    expect(tree.root.findByType(LayoutAnimationConfig)).toBe(config);
    const mark = config.findAll(
      (n) => n.props.entering !== undefined && n.props.exiting !== undefined
    )[0];
    expect(mark).toBeDefined();
  });

  it("is focusable while waiting, so the typing cue is announced", () => {
    const waiting = renderIcon(true).root.find(
      (n) => n.props.accessibilityLabel === "Assistant is typing"
    );
    expect(waiting.props.accessible).toBe(true);
    expect(waiting.props.accessibilityRole).toBe("progressbar");
  });
});
