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
import { ChatSessionsProvider } from "@/components/chat/ChatSessionsContext";
import TabStack from "@/components/headers/TabStack";
import { CHAT_TAB_NAME } from "@/constants/Constants";
import { Stack } from "expo-router";

export default function Layout() {
  return (
    <ChatSessionsProvider>
      <TabStack>
        {/* A conversation, not a list: a standard bar (with the blur) and no large title. */}
        <Stack.Screen
          name="index"
          options={{ title: CHAT_TAB_NAME, headerLargeTitle: false }}
        />
      </TabStack>
    </ChatSessionsProvider>
  );
}
