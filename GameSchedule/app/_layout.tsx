import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';

const appTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#7C5CFF',
    secondary: '#33D1FF',
    tertiary: '#7DFFB3',
    surface: '#171A2A',
    surfaceVariant: '#22263A',
    background: '#0B1020',
    outline: '#303650',
  },
};

export default function RootLayout() {
  return (
    <PaperProvider theme={appTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: appTheme.colors.background },
        }}
      />
    </PaperProvider>
  );
}
