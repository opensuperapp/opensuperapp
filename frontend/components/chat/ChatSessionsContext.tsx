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
import { RootState } from "@/context/store";
import { useChatSessions } from "@/hooks/useChatSessions";
import { resolveChatUserId } from "@/utils/resolveChatUserId";
import React, { createContext, JSX, ReactNode, useContext } from "react";
import { useSelector } from "react-redux";

type ChatSessionsValue = ReturnType<typeof useChatSessions>;

const ChatSessionsContext = createContext<ChatSessionsValue | null>(null);

/**
 * Owns the chat session list for the whole Chat stack, so the conversation screen and
 * the native history sheet (a separate route) read and change the same sessions.
 *
 * @param {{ children: ReactNode }} props - The Chat stack.
 * @returns {JSX.Element} Provider around the stack.
 */
export const ChatSessionsProvider = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const { userId, accessToken } = useSelector(
    (state: RootState) => state.auth
  );
  const value = useChatSessions(resolveChatUserId({ userId, accessToken }));

  return (
    <ChatSessionsContext.Provider value={value}>
      {children}
    </ChatSessionsContext.Provider>
  );
};

/**
 * Session state and handlers shared across the Chat stack.
 *
 * @returns {ChatSessionsValue} The `useChatSessions` result owned by the provider.
 */
export const useChatSessionsContext = (): ChatSessionsValue => {
  const value = useContext(ChatSessionsContext);
  if (!value) {
    throw new Error(
      "useChatSessionsContext must be used inside ChatSessionsProvider"
    );
  }
  return value;
};
