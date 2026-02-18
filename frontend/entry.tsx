import { setupBackgroundNotificationListener } from "@/utils/push-notification";
import registerRootComponent from "expo-router/entry";

setupBackgroundNotificationListener();

registerRootComponent();