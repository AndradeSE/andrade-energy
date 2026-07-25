import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
   <Tabs
  screenOptions={{
    headerShown: false,

   tabBarStyle: {
  backgroundColor: '#ffffff',
  borderTopWidth: 0,
  elevation: 5,
  shadowOpacity: 0.1,
},

    tabBarActiveTintColor: '#3b82f6',
tabBarInactiveTintColor: '#000000',
  }}
>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
  name="usinas"
  options={{
    title: 'Usinas',
    tabBarIcon: ({ color, size }) => (
      <Ionicons
        name="flash"
        size={size}
        color={color}
      />
    ),
  }}
/>

 <Tabs.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
  name="faturas"
  options={{
    title: 'Faturas',
    tabBarIcon: ({ color, size }) => (
      <Ionicons
        name="document-text"
        size={size}
        color={color}
      />
    ),
  }}
/>

              <Tabs.Screen
        name="financeiro"
        options={{
          title: 'Financeiro',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
  name="operacao"
  options={{
    title: "Operação",
    tabBarIcon: ({ color, size }) => (
      <Ionicons
        name="construct"
        size={size}
        color={color}
      />
    ),
  }}
/>
    </Tabs>
  );
}
