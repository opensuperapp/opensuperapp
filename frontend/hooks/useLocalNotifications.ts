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
import {
  getLocalNotifications,
  reconcileTriggeredNotifications,
} from "@/services/scheduledNotifications";
import type { LocalNotification } from "@/services/scheduledNotifications";
import { useCallback, useEffect, useState } from "react";

export const useLocalNotifications = () => {
  const [localNotifications, setLocalNotifications] = useState<
    LocalNotification[]
  >([]);

  const refresh = useCallback(async () => {
    await reconcileTriggeredNotifications();
    const notifications = await getLocalNotifications();
    setLocalNotifications(notifications);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { localNotifications, refresh };
};
