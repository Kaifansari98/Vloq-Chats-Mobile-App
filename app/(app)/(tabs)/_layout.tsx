import {
  createMaterialTopTabNavigator,
  type MaterialTopTabNavigationOptions,
  type MaterialTopTabNavigationEventMap,
  type MaterialTopTabBarProps,
} from "@react-navigation/material-top-tabs";
import { withLayoutContext } from "expo-router";
import { TabBar } from "@/components/tab-bar";
import type { ParamListBase, TabNavigationState } from "@react-navigation/native";

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

export default function TabsLayout() {
  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      tabBar={(props: MaterialTopTabBarProps) => <TabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        lazy: true,
      }}
    >
      <MaterialTopTabs.Screen name="index" options={{ title: "Chats" }} />
      <MaterialTopTabs.Screen name="users" options={{ title: "Users" }} />
      <MaterialTopTabs.Screen name="settings" options={{ title: "Settings" }} />
      <MaterialTopTabs.Screen name="profile" options={{ title: "Profile" }} />
    </MaterialTopTabs>
  );
}
