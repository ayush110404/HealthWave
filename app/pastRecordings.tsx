import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, SafeAreaView, Alert } from 'react-native';
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
  id: string; // Added unique identifier
}

interface PlayingState {
  isPlaying: boolean;
  sound: Audio.Sound | null;
  progress: number;
}

const PastRecordings = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingStates, setPlayingStates] = useState<{ [key: string]: PlayingState }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Poppins_400Regular,
    Poppins_300Light,
  });

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const savedRecordings = await AsyncStorage.getItem('recordings');
      if (savedRecordings) {
        const parsedRecordings: Recording[] = JSON.parse(savedRecordings);
        const loadedRecordings = await Promise.all(
          parsedRecordings.map(async (recording) => {
            const { sound, status } = await Audio.Sound.createAsync(
              { uri: recording.getURI },
              { progressUpdateIntervalMillis: 1000 }
            );
            
            // Add progress update listener
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.isLoaded && !status.isBuffering) {
                const progress = status.durationMillis ? status.positionMillis / status.durationMillis : 0;
                setPlayingStates(prev => ({
                  ...prev,
                  [recording.getURI]: {
                    ...prev[recording.getURI],
                    progress: progress
                  }
                }));
              }
            });

            return {
              ...recording,
              id: recording.id || Math.random().toString(36).substr(2, 9),
              sound,
              status: status as AVPlaybackStatusSuccess,
            };
          })
        );
        setRecordings(loadedRecordings);
        
        const initialStates = loadedRecordings.reduce((acc, recording) => {
          acc[recording.getURI] = { 
            isPlaying: false, 
            sound: recording.sound,
            progress: 0
          };
          return acc;
        }, {} as { [key: string]: PlayingState });
        setPlayingStates(initialStates);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecordings();

    return () => {
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
        setError('Failed to initialize audio');
      }
    })();
  }, []);

  const deleteRecording = async (recordingId: string) => {
    try {
      Alert.alert(
        "Delete Recording",
        "Are you sure you want to delete this recording?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              const recordingToDelete = recordings.find(r => r.id === recordingId);
              if (!recordingToDelete) return;

              // Stop playing if it's currently playing
              if (playingStates[recordingToDelete.getURI]?.isPlaying) {
                await playingStates[recordingToDelete.getURI].sound?.stopAsync();
              }

              // Unload the sound
              await playingStates[recordingToDelete.getURI].sound?.unloadAsync();

              // Delete the file
              await FileSystem.deleteAsync(recordingToDelete.getURI);

              // Update recordings list
              const updatedRecordings = recordings.filter(r => r.id !== recordingId);
              setRecordings(updatedRecordings);

              // Update AsyncStorage
              await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));

              // Update playing states
              const { [recordingToDelete.getURI]: _, ...restStates } = playingStates;
              setPlayingStates(restStates);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting recording:', error);
      Alert.alert('Error', 'Failed to delete recording');
    }
  };

  const togglePlayPause = useCallback(async (uri: string) => {
    try {
      const currentState = playingStates[uri];
      if (!currentState) return;

      if (currentState.isPlaying) {
        await currentState.sound?.pauseAsync();
      } else {
        await Promise.all(
          Object.entries(playingStates).map(async ([key, state]) => {
            if (state.isPlaying && key !== uri) {
              await state.sound?.stopAsync();
              setPlayingStates(prev => ({
                ...prev,
                [key]: { ...prev[key], isPlaying: false, progress: 0 }
              }));
            }
          })
        );

        await currentState.sound?.playAsync();
        
        // Reset progress when starting playback
        currentState.sound?.setPositionAsync(0);
      }

      setPlayingStates(prev => ({
        ...prev,
        [uri]: { ...prev[uri], isPlaying: !currentState.isPlaying }
      }));
    } catch (error) {
      console.error('Error toggling play/pause:', error);
      Alert.alert('Error', 'Failed to play recording');
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
        <View style={styles.cardHeaderContent}>
          <Text style={styles.cardTitle}>{recording.getURI.split('/').pop()}</Text>
          <Text style={styles.cardSubtitle}>Audio Recording</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteRecording(recording.id)}
        >
          <AntDesign name="delete" size={normalize(24)} color="#ff5252" />
        </TouchableOpacity>
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
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar,
                { width: `${(playingStates[recording.getURI]?.progress || 0) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.audioInfoText}>
            Duration: {formatDuration(recording.status.durationMillis || 0)}
          </Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{recording.date}</Text>
        <Link href={{pathname:'/recordingAnalysis',params:{recordings:JSON.stringify(recording)}}}>
          <View style={styles.analyzeButton}>
            <Text style={styles.analyzeButtonText}>Analyze</Text>
            <AntDesign name="rightcircle" size={normalize(24)} color="#4caf50" />
          </View>
        </Link>
      </View>
    </View>
  );

  if (!fontsLoaded) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>Loading recordings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadRecordings}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#e8f5e9', '#c8e6c9']} style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>Your Recordings</Text>
          {recordings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <AntDesign name="sound" size={normalize(48)} color="#4caf50" />
              <Text style={styles.emptyText}>No recordings yet</Text>
              <Text style={styles.emptySubtext}>Your recorded audio will appear here</Text>
            </View>
          ) : (
            recordings.map((recording) => (
              <AudioCard key={recording.id} recording={recording} />
            ))
          )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  cardHeaderContent: {
    flex: 1,
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
  deleteButton: {
    padding: normalize(8),
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
  progressBarContainer: {
    height: normalize(4),
    backgroundColor: '#e0e0e0',
    borderRadius: normalize(2),
    marginBottom: normalize(8),
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: normalize(2),
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
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analyzeButtonText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: normalize(14),
    color: '#4caf50',
    marginRight: normalize(8),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: normalize(40),
  },
  emptyText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: normalize(18),
    color: '#2e7d32',
    marginTop: normalize(16),
  },
  emptySubtext: {
    fontFamily: 'Poppins_400Regular',
    fontSize: normalize(14),
    color: '#4caf50',
    marginTop: normalize(8),
  },
  messageText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: normalize(16),
    color: '#333',
  },
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: normalize(16),
    color: '#ff5252',
    textAlign: 'center',
    marginBottom: normalize(20),
  },
  retryButton: {
    backgroundColor: '#4caf50',
    padding: normalize(10),
    borderRadius: normalize(5),
  },
  retryButtonText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: normalize(16),
    color: 'white',
    textAlign: 'center',
  },
});
export default PastRecordings;