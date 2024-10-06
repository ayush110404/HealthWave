import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { StyleSheet } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    Poppins_700Bold: require('@expo-google-fonts/poppins/Poppins_700Bold.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{
        headerShown: false,
        headerStyle: styles.header,
        headerTitleStyle: styles.title,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTintColor: '#1b5e20',
      }}>
        <Stack.Screen name="index" options={{headerShown: false}}/>
        <Stack.Screen 
          name="audioRecording" 
          options={{
            headerShown: true,
            title: '',
          }}
        />
        <Stack.Screen 
          name="recordingAnalysis" 
          options={{
            headerShown: true,
            title: 'Heart BPM Report',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#e8f5e9',
    elevation: 0, // for Android
    shadowOpacity: 0, // for iOS
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#1b5e20',
  },
});

