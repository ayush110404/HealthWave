import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, SafeAreaView } from 'react-native';
import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { AntDesign } from '@expo/vector-icons';
import Svg, { Path, Line } from 'react-native-svg';
import { useGlobalSearchParams } from 'expo-router';
import * as FileSystem from "expo-file-system";
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Poppins_700Bold, Poppins_400Regular, Poppins_300Light } from '@expo-google-fonts/poppins';

const { width, height } = Dimensions.get('window');
const scale = width / 390;
const normalize = (size: number) => Math.round(size * scale);

const CARD_WIDTH = width - normalize(40);
const CARD_PADDING = normalize(16);
const GRAPH_WIDTH = CARD_WIDTH - (CARD_PADDING * 2);
const GRAPH_HEIGHT = height * 0.3;

interface AudioPlayerProps {
  audioUri: string;
}

interface Recording {
  getURI: string;
  status: AVPlaybackStatusSuccess;
  date: string;
}

const EnhancedAudioPlayer: React.FC<AudioPlayerProps> = () => {
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Poppins_400Regular,
    Poppins_300Light,
  });

  const params = useGlobalSearchParams();
  const parsedRecord: Recording[] = JSON.parse(params.recordings as string);
  const audioUri = parsedRecord[0].getURI;
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pitchData, setPitchData] = useState<number[]>([]);
  const [peakTimes, setPeakTimes] = useState<number[]>([]);
  const [averageHR, setAverageHR] = useState<number | null>(null);
  const [recordingDate, setRecordingDate] = useState<string>('');

  useEffect(() => {
    loadAudio();
    fetchAudioData();
    setRecordingDate(parsedRecord[0].date || 'Unknown date');
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
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
    try {
      const response = await FileSystem.uploadAsync(
        'http://192.168.29.6:5000/audio',
        audioUri,
      );
      const data = JSON.parse(response.body);
      if (data.result) {
        setPitchData(data.result.pitch_data);
        setPeakTimes(data.result.peak_times);
        setAverageHR(data.result.average_hr);
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const seekAudio = (seekPosition: number) => {
    if (sound) {
      const newPosition = (seekPosition / GRAPH_WIDTH) * duration;
      sound.setPositionAsync(newPosition * 1000);
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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#e8f5e9', '#c8e6c9']} style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Audio Analysis</Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <AntDesign name="sound" size={normalize(24)} color="#2e7d32" />
              <View>
                <Text style={styles.cardTitle}>Recorded Audio</Text>
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

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Audio Analysis Results</Text>
            <Text style={styles.infoText}>Average Heart Rate: {averageHR !== null ? `${averageHR.toFixed(2)} BPM` : 'Calculating...'}</Text>
            <Text style={styles.infoText}>Number of Peaks Detected: {peakTimes.length}</Text>
            <Text style={styles.infoText}>Recording Duration: {formatTime(duration)}</Text>
          </View>

          <TouchableOpacity style={styles.analyzeButton}>
            <Text style={styles.analyzeButtonText}>Analyze Again</Text>
          </TouchableOpacity>
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
  },
  infoTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: normalize(18),
    color: '#2e7d32',
    marginBottom: normalize(12),
  },
  infoText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: normalize(16),
    color: '#4caf50',
    marginBottom: normalize(8),
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

export default EnhancedAudioPlayer;