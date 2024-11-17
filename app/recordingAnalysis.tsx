import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, SafeAreaView } from 'react-native';
import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { AntDesign } from '@expo/vector-icons';
import Svg, { Path, Line } from 'react-native-svg';
import { useGlobalSearchParams, useNavigation } from 'expo-router';
import * as FileSystem from "expo-file-system";
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Poppins_700Bold, Poppins_400Regular, Poppins_300Light, Poppins_600SemiBold_Italic, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { savedRecording } from '@/lib/types/main';

const { width, height } = Dimensions.get('window');
const scale = width / 390;
const normalize = (size: number) => Math.round(size * 1);

const CARD_WIDTH = width - normalize(40);
const CARD_PADDING = normalize(16);
const GRAPH_WIDTH = CARD_WIDTH - (CARD_PADDING * 2);
const GRAPH_HEIGHT = height * 0.3;
const server_url = process.env.EXPO_PUBLIC_SERVER_URL;
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const interpretHeartRate = (hr: number) => {
  if (hr < 60) return { status: 'Slow', color: '#2196F3' };
  if (hr >= 60 && hr <= 100) return { status: 'Normal', color: '#4CAF50' };
  return { status: 'Fast', color: '#F44336' };
};

const interpretEmotionalState = (hr: number) => {
  if (hr < 60) return 'You might be feeling relaxed or at rest.';
  if (hr >= 60 && hr <= 100) return 'You seem to be in a calm, neutral state.';
  return 'You might be experiencing stress, anxiety, or excitement.';
};

const getSuggestion = (hr: number) => {
  if (hr < 60) return 'Consider gentle exercise to boost your heart rate if you feel too lethargic.';
  if (hr >= 60 && hr <= 100) return 'Maintain this balanced state with regular exercise and stress management.';
  return 'Try deep breathing exercises or meditation to help calm your heart rate.';
};


const RecordingAnalysis = () => {
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Poppins_400Regular,
    Poppins_300Light,
    Poppins_600SemiBold,
  });

  const params = useGlobalSearchParams();
  const [parsedRecord, setParsedRecord] = useState<savedRecording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pitchData, setPitchData] = useState<number[]>([]);
  const [peakTimes, setPeakTimes] = useState<number[]>([]);
  const [averageHR, setAverageHR] = useState<number | null>(null);
  const [recordingDate, setRecordingDate] = useState<string>('');

  useEffect(() => {
    const initializeData = async () => {
      try {
        let recordData: savedRecording | null = null;
        
        if (params.recordings) {
          recordData = JSON.parse(params.recordings as string);
        } else {
          const recordings = await AsyncStorage.getItem('recordings');
          if (recordings) {
            const parsedRecordings = JSON.parse(recordings);
            if (parsedRecordings.length > 0) {
              recordData = parsedRecordings[parsedRecordings.length - 1];
            }
          }
        }

        if (recordData) {
          setParsedRecord(recordData);
          setAudioUri(recordData.getURI);
          setRecordingDate(recordData.date || 'Unknown date');
        } else {
          console.error('No recording data available');
        }
      } catch (error) {
        console.error('Error initializing data:', error);
      }
    };

    initializeData();
  }, [params.recordings]);

  useEffect(() => {
    if (audioUri) {
      loadAudio();
      fetchAudioData();
    }
  }, [audioUri]);

  const loadAudio = async () => {
    if (audioUri) {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { progressUpdateIntervalMillis: 100, positionMillis: 0 },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
        const status = await newSound.getStatusAsync();
        if (status.isLoaded) {
          setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
        }
      } catch (error) {
        console.error('Error loading audio:', error);
      }
    }
  };

  const fetchAudioData = async () => {
    if (!audioUri) {
      console.error('No audio URI available');
      return;
    }

    try {
      console.log('Uploading audio file:', audioUri);
      const response = await FileSystem.uploadAsync(
        server_url || '',
        audioUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        }
      );
      console.log('Server response:', response);

      const data = JSON.parse(response.body);      const renderPitchVisualization = () => {
        if (!pitchData || pitchData.length === 0) {
          return null; // Handle empty pitchData
        }
      
        const pathData = pitchData.reduce((acc, pitch, index) => {
          const x = (index / pitchData.length) * GRAPH_WIDTH;
          const y = (1 - pitch) * GRAPH_HEIGHT;
          return `${acc} L ${x},${y}`;
        }, `M 0,${GRAPH_HEIGHT}`);
      
        const peakLines = peakTimes.map((time, index) => {
          const x = (time / duration) * GRAPH_WIDTH;
          return (
            <Line
              key={index}
              x1={x}
              y1={0}
              x2={x}
              y2={GRAPH_HEIGHT}
              stroke="red"
              strokeWidth="2"
            />
          );
        });
      
        return (
          <Svg height={GRAPH_HEIGHT} width={GRAPH_WIDTH}>
            <Path d={pathData} fill="none" stroke="black" strokeWidth="2" />
            {peakLines}
          </Svg>
        );
      };
      if (data.result) {
        setPitchData(data.result.pitch_data);
        setPeakTimes(data.result.peak_times);
        setAverageHR(data.result.average_hr);
      } else {
        console.error('No result in response:', data);
      }
    } catch (error) {
      console.error('Error fetching audio data:', error);
    }
  };


  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis / 1000);
    }
  };

  const playSound = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const renderPitchVisualization = () => {
    const pathData = pitchData.reduce((acc, pitch, index) => {
      const x = (index / pitchData.length) * GRAPH_WIDTH;
      const y = (1 - pitch) * GRAPH_HEIGHT;
      return `${acc} L ${x},${y}`;
    }, `M 0,${GRAPH_HEIGHT}`);

    const peakLines = peakTimes.map((time, index) => {
      const x = (time / duration) * GRAPH_WIDTH;
      return (
        <Line
          key={index}
          x1={x}
          y1={0}
          x2={x}
          y2={GRAPH_HEIGHT}
          stroke="red"
          strokeWidth="2"
        />
      );
    });

    return (
      <Svg height={GRAPH_HEIGHT} width={GRAPH_WIDTH}>
        <Path
          d={pathData}
          fill="none"
          stroke="#4caf50"
          strokeWidth="2"
        />
        {peakLines}
      </Svg>
    );
  };

  const renderInfoCard = () => {
    if (averageHR === null) return null;
    
    const { status, color } = interpretHeartRate(averageHR);
    const emotionalState = interpretEmotionalState(averageHR);
    const suggestion = getSuggestion(averageHR);

    return (
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Heart Rate Analysis</Text>
        <View style={styles.hrContainer}>
          <Text style={[styles.hrText, { color }]}>{averageHR.toFixed(0)}</Text>
          <Text style={styles.hrUnit}>BPM</Text>
        </View>
        <Text style={[styles.hrStatus, { color }]}>{status}</Text>
        <Text style={styles.infoText}>{emotionalState}</Text>
        <View style={styles.divider} />
        <Text style={styles.suggestionTitle}>Suggestion:</Text>
        <Text style={styles.suggestionText}>{suggestion}</Text>
      </View>
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#e8f5e9', '#c8e6c9']} style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* <Text style={styles.title}>Audio Analysis</Text> */}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <AntDesign name="sound" size={normalize(24)} color="#2e7d32" />
              <View>
                <Text style={styles.cardTitle}>Recorded Heart Beat</Text>
                <Text style={styles.cardSubtitle}>{recordingDate}</Text>
              </View>
            </View>

            <View style={styles.graphContainer}>
              {renderPitchVisualization()}
            </View>

            <View style={styles.controls}>
              <TouchableOpacity onPress={playSound} style={styles.playButton}>
                <AntDesign name={isPlaying ? "pausecircle" : "play"} color="white" size={normalize(24)} />
              </TouchableOpacity>
              <Text style={styles.duration}>{formatTime(position)} / {formatTime(duration)}</Text>
            </View>
          </View>
          {renderInfoCard()}
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
  title: {
    fontSize: normalize(28),
    marginBottom: normalize(20),
    fontFamily: 'Poppins_700Bold',
    color: '#1b5e20',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: normalize(16),
    padding: CARD_PADDING,
    marginBottom: normalize(16),
    width: CARD_WIDTH,
    alignSelf: 'center',
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
  cardTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: normalize(18),
    color: '#2e7d32',
    marginLeft: normalize(12),
  },
  cardSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: normalize(14),
    color: '#4caf50',
    marginLeft: normalize(12),
  },
  graphContainer: {
    width: GRAPH_WIDTH,
    height: GRAPH_HEIGHT,
    alignSelf: 'center',
    marginBottom: normalize(16),
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playButton: {
    backgroundColor: '#4caf50',
    padding: normalize(10),
    borderRadius: normalize(25),
  },
  duration: {
    fontSize: normalize(16),
    fontFamily: 'Poppins_400Regular',
    color: '#2e7d32',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: normalize(16),
    padding: CARD_PADDING,
    marginBottom: normalize(16),
    width: CARD_WIDTH,
    alignSelf: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: normalize(20),
    color: '#2e7d32',
    marginBottom: normalize(12),
    textAlign: 'center',
  },
  hrContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: normalize(8),
  },
  hrText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: normalize(48),
  },
  hrUnit: {
    fontFamily: 'Poppins_400Regular',
    fontSize: normalize(20),
    color: '#4caf50',
    marginLeft: normalize(4),
  },
  hrStatus: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: normalize(24),
    textAlign: 'center',
    marginBottom: normalize(12),
  },
  infoText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: normalize(16),
    color: '#333',
    marginBottom: normalize(16),
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: normalize(16),
  },
  suggestionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: normalize(18),
    color: '#2e7d32',
    marginBottom: normalize(8),
  },
  suggestionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: normalize(16),
    color: '#333',
    lineHeight: normalize(24),
  },
  analyzeButton: {
    backgroundColor: '#2e7d32',
    borderRadius: normalize(25),
    padding: normalize(16),
    alignItems: 'center',
    marginBottom: normalize(20),
  },
  analyzeButtonText: {
    fontSize: normalize(16),
    color: '#ffffff',
    fontFamily: 'Poppins_700Bold',
  },
});

export default RecordingAnalysis;