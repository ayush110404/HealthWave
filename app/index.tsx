import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, SafeAreaView, ImageSourcePropType, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign, Feather } from '@expo/vector-icons';
import { useFonts, Poppins_700Bold, Poppins_600SemiBold, Poppins_400Regular, Poppins_300Light } from '@expo-google-fonts/poppins';
import { Link } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { savedRecording } from '@/lib/types/main';

const { width, height } = Dimensions.get('window');
const scale = width / 390;
const normalize = (size: number) => Math.round(size * scale);
const server_url = process.env.EXPO_PUBLIC_SERVER_URL;

const getHeartRateStatus = (hr: number | null): string => {
  if (hr === null) return 'Unknown';
  if (hr < 60) return 'Low';
  if (hr >= 60 && hr <= 100) return 'Normal';
  return 'High';
};

interface RecordingHistoryProps {
  recordingURI: string;
  peakTimes: number[];
  averageHR: number | null;
  date: string; // Added date field
}

const Home = () => {
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Poppins_600SemiBold,
    Poppins_400Regular,
    Poppins_300Light,
  });

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [pastRecordings, setPastRecordings] = useState<RecordingHistoryProps[]>([]);

  const fetchRecordings = useCallback(async () => {
    try {
      const storedRecordings = await AsyncStorage.getItem('recordings');
      const parsedRecordings: savedRecording[] = storedRecordings ? JSON.parse(storedRecordings) : [];
      
      // Clear previous recordings before fetching new ones
      setPastRecordings([]);
      
      // Process only the last 3 recordings
      const lastThreeRecordings = parsedRecordings.slice(-3).reverse();
      
      const processedRecordings = await Promise.all(
        lastThreeRecordings.map(async (recording) => {
          const audioUri = recording.getURI;
          try {
            const response = await FileSystem.uploadAsync(
              server_url || '',
              audioUri,
            );
            const data = JSON.parse(response.body);
            if (data.result) {
              return {
                recordingURI: audioUri,
                peakTimes: data.result.peak_times,
                averageHR: data.result.average_hr,
                date: recording.date || new Date().toISOString(), // Use recording date or current date
              };
            }
          } catch (error) {
            console.error('Error processing recording:', error);
          }
          return null;
        })
      );

      // Filter out any null results and update state
      const validRecordings = processedRecordings.filter((rec): rec is RecordingHistoryProps => rec !== null);
      setPastRecordings(validRecordings);
      
    } catch (error) {
      console.error('Error fetching recordings:', error);
    }
  }, [server_url]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecordings();
    setRefreshing(false);
  }, [fetchRecordings]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#e8f5e9', '#c8e6c9']} style={styles.container}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Good {getTimeOfDay()}</Text>
              <Text style={styles.question}>How are you feeling today?😊</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Recent Recordings</Text>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentRecordingsContainer}
          >
            {pastRecordings.length === 0 ? (
              <Text style={styles.noRecordingsText}>No recordings yet</Text>
            ) : (
              pastRecordings.map((recording) => (
                <View key={recording.recordingURI} style={styles.cardWrapper}>
                  <AudioStatsCard
                    icon={require('@/assets/images/icon.png')}
                    title="Heart Rate Analysis"
                    subtitle={`Analyzed on ${new Date(recording.date).toLocaleDateString()}`}
                    measurements={[
                      { value: recording.averageHR !== null ? recording.averageHR.toFixed(0) : '--', unit: 'BPM', label: 'Avg. Heart Rate' },
                      { value: recording.peakTimes.length.toString(), label: 'Peaks Detected' },
                      { value: getHeartRateStatus(recording.averageHR), label: 'Status' },
                    ]}
                    date="View detailed report"
                  />
                </View>
              ))
            )}
          </ScrollView>

          <Link href={{pathname:'/audioRecording'}} style={styles.connectButton}>
            <Feather name="mic" size={normalize(22)} color="white" />
            <Text style={styles.connectButtonText}> Record Heart Beat</Text>
          </Link>
          <Link href={{pathname:'/pastRecordings'}} style={styles.connectButton}>
            <Feather name="mic" size={normalize(22)} color="white" />
            <Text style={styles.connectButtonText}> Past Recordings</Text>
          </Link>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};
const AudioStatsCard = ({ icon, title, subtitle, measurements, date }: {
  icon: ImageSourcePropType,
  title: string,
  subtitle: string,
  measurements: { value: string, unit?: string, label: string }[],
  date: string
}) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Image source={icon} style={styles.cardIcon} />
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
    </View>
    <View style={styles.measurementsContainer}>
      {measurements.map((measurement, index) => (
        <View key={index} style={styles.measurement}>
          <Text style={[
            styles.measurementValue,
            measurement.label === 'Status' && styles[`status${measurement.value as 'Low' | 'Normal' | 'High' | 'Unknown'}`]
          ]}>
            {measurement.value}
            {measurement.unit && <Text style={styles.measurementUnit}>{measurement.unit}</Text>}
          </Text>
          <Text style={styles.measurementLabel}>{measurement.label}</Text>
        </View>
      ))}
    </View>
    <View style={styles.cardFooter}>
      <Text style={styles.cardDate}>{date}</Text>
      <Link href={{pathname:'/recordingAnalysis'}}>
        <AntDesign name="rightcircle" size={normalize(24)} color="#4caf50" />
      </Link>
    </View>
  </View>
);


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#e8f5e9',
  },
  container: {
    flex: 1,
    padding: normalize(20),
    paddingTop: normalize(60),
  },
  question: {
    fontSize: normalize(28),
    marginBottom: normalize(20),
    fontFamily: 'Poppins_700Bold',
    color: '#1b5e20',
  },
  physicalOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: normalize(20),
  },
  sectionTitle: {
    fontSize: normalize(18),
    fontFamily: 'Poppins_700Bold',
    color: '#2e7d32',
  },
  metricsContainer: {
    marginBottom: normalize(20),
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
    fontSize: normalize(13),
    color: '#4caf50',
  },
  measurementsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: normalize(16),
  },
  measurement: {
    alignItems: 'center',
  },
  measurementValue: {
    fontFamily: 'Poppins_700Bold',
    fontSize: normalize(18),
    color: '#1b5e20',
  },
  measurementUnit: {
    fontFamily: 'Poppins_400Regular',
    fontSize: normalize(14),
    color: '#4caf50',
  },
  measurementLabel: {
    fontFamily: 'Poppins_300Light',
    fontSize: normalize(12),
    color: '#4caf50',
    marginTop: normalize(4),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontFamily: 'Poppins_300Light',
    fontSize: normalize(12),
    color: '#4caf50',
  },
  connectButton: {
    backgroundColor: '#4caf50',
    borderRadius: normalize(25),
    padding: normalize(16),
    marginBottom: normalize(20),
  },
  connectButtonText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: normalize(16),
    color: 'white',
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
  
  statusLow: {
    color: '#2196F3',
  },
  statusNormal: {
    color: '#4CAF50',
  },
  statusHigh: {
    color: '#F44336',
  },
  statusUnknown: {
    color: '#9E9E9E',
  },
  recentRecordingsContainer: {
    paddingHorizontal: normalize(4),
    paddingVertical: normalize(10),
    flexDirection: 'row',
  },
  cardWrapper: {
    width: width - normalize(70), // Adjust card width to be slightly less than screen width
    marginRight: normalize(10),
  },
  noRecordingsText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: normalize(16),
    color: '#4caf50',
    textAlign: 'center',
    width: '100%',
    paddingVertical: normalize(20),
  },
  recentRecordings:{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: normalize(20),
    overflow:'scroll',
    gap:normalize(20),
    overflowY : 'scroll',
    overflowX : 'scroll',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: normalize(24),
  },
  greeting: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: normalize(16),
    color: '#4caf50',
  },
  profileButton: {
    padding: normalize(8),
  },
  profileIcon: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

export default Home;
