import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";

import Economia from "../../app/(tabs)/economia";
import Perfil from "../../app/(tabs)/perfil";
import { Colors, Shadows, Typography } from "../../theme";
import ClienteHome from "./ClienteHome";

const Tab = createMaterialTopTabNavigator();

export default function ClientePager() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBarPosition="bottom"
      screenOptions={{
        animationEnabled: true,
        swipeEnabled: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.subtitle,
        tabBarIndicatorStyle: {
          backgroundColor: "transparent",
        },
        tabBarLabelStyle: {
          fontSize: Typography.small,
          fontWeight: "600",
          textTransform: "none",
        },
        tabBarShowIcon: true,
        tabBarStyle: {
          height: 82,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: Colors.surface,
          ...Shadows.card,
        },
      }}
    >
      <Tab.Screen
        component={ClienteHome}
        name="Home"
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />

      <Tab.Screen
        component={Economia}
        name="Economia"
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="flash-outline" size={24} color={color} />
          ),
        }}
      />

      <Tab.Screen
        component={Perfil}
        name="Perfil"
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
