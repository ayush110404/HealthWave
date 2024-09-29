import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useFonts, Poppins_700Bold, Poppins_400Regular, Poppins_300Light } from '@expo-google-fonts/poppins';
import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { Link } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const scale = width / 390;
const normalize = (size: number): number => Math.round(size * scale);

interface Recording {
  getURI: string;
  status: AVPlaybackStatusSuccess;
  date: string;
}

interface PlayingState {
  isPlaying: boolean;
  sound: Audio.Sound | null;
}

const AudioRecordingsScreen = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingStates, setPlayingStates] = useState<{ [key: string]: PlayingState }>({});

  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Poppins_400Regular,
    Poppins_300Light,
  });

  useEffect(() => {
    const loadRecordings = async () => {
      try {
        const savedRecordings = await AsyncStorage.getItem('recordings');
        if (savedRecordings) {
          const parsedRecordings: Recording[] = JSON.parse(savedRecordings);
          const loadedRecordings = await Promise.all(
            parsedRecordings.map(async (recording) => {
              const { sound, status } = await Audio.Sound.createAsync({ uri: recording.getURI });
              return {
                ...recording,
                sound,
                status: status as AVPlaybackStatusSuccess,
              };
            })
          );
          setRecordings(loadedRecordings);
          
          const initialStates = loadedRecordings.reduce((acc, recording) => {
            acc[recording.getURI] = { isPlaying: false, sound: recording.sound };
            return acc;
          }, {} as { [key: string]: PlayingState });
          setPlayingStates(initialStates);
        }
      } catch (error) {
        console.error('Error loading recordings:', error);
      }
    };

    loadRecordings();

    return () => {
      // Cleanup function to unload all sounds when component unmounts
      Object.values(playingStates).forEach(state => {
        if (state.sound) {
          state.sound.unloadAsync();
        }
      });
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: true,
        });
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    })();
  }, []);

  const togglePlayPause = useCallback(async (uri: string) => {
    try {
      const currentState = playingStates[uri];
      if (!currentState) return;

      if (currentState.isPlaying) {
        await currentState.sound?.pauseAsync();
      } else {
        // Stop all other playing sounds
        await Promise.all(
          Object.entries(playingStates).map(async ([key, state]) => {
            if (state.isPlaying && key !== uri) {
              await state.sound?.stopAsync();
            }
          })
        );

        await currentState.sound?.playAsync();
      }

      setPlayingStates(prev => ({
        ...prev,
        [uri]: { ...prev[uri], isPlaying: !currentState.isPlaying }
      }));
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  }, [playingStates]);

  const formatDuration = (durationMillis: number): string => {
    const totalSeconds = Math.round(durationMillis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const AudioCard: React.FC<{ recording: Recording }> = ({ recording }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Image source={require('@/assets/images/icon.png')} style={styles.cardIcon} />
        <View>
          <Text style={styles.cardTitle}>{recording.getURI.split('/').pop()}</Text>
          <Text style={styles.cardSubtitle}>Audio Recording</Text>
        </View>
      </View>
      <View style={styles.audioPlayerContainer}>
        <TouchableOpacity 
          style={styles.playPauseButton}
          onPress={() => togglePlayPause(recording.getURI)}
        >
          <AntDesign 
            name={playingStates[recording.getURI]?.isPlaying ? "pausecircle" : "playcircleo"} 
            size={normalize(40)} 
            color="#4caf50" 
          />
        </TouchableOpacity>
        <View style={styles.audioInfo}>
          <Text style={styles.audioInfoText}>
            Duration: {formatDuration(recording.status.durationMillis || 0)}
          </Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{recording.date}</Text>
        <Link href={{pathname:'/audioPlayer',params:{recordings:JSON.stringify(recordings)}}}>
          <AntDesign name="rightcircle" size={normalize(24)} color="#4caf50" />
        </Link>
      </View>
    </View>
  );

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#e8f5e9', '#c8e6c9']} style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>Your Recordings</Text>
          {recordings.map((recording, index) => (
            <AudioCard key={index} recording={recording} />
          ))}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#e8f5e9',
  },
  container: {
    flex: 1,
    padding: normalize(20),
  },
  screenTitle: {
    fontSize: normalize(28),
    marginBottom: normalize(20),
    fontFamily: 'Poppins_700Bold',
    color: '#1b5e20',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: normalize(16),
    padding: normalize(16),
    marginBottom: normalize(16),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(16),
  },
  cardIcon: {
    width: normalize(40),
    height: normalize(40),
    marginRight: normalize(12),
  },
  cardTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: normalize(18),
    color: '#2e7d32',
  },
  cardSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: normalize(14),
    color: '#4caf50',
  },
  audioPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(16),
  },
  playPauseButton: {
    marginRight: normalize(16),
  },
  audioInfo: {
    flex: 1,
  },
  audioInfoText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: normalize(14),
    color: '#333',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: normalize(12),
    color: '#b0bec5',
    fontFamily: 'Poppins_400Regular',
  },
});

export default AudioRecordingsScreen;