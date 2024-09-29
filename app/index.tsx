import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, SafeAreaView, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useFonts, Poppins_700Bold, Poppins_400Regular, Poppins_300Light } from '@expo-google-fonts/poppins';
import { Link } from 'expo-router';

const { width, height } = Dimensions.get('window');
const scale = width / 375; // 375 is a standard width for mobile designs

const normalize = (size:number) => {
  const newSize = size * scale;
  return Math.round(newSize);
};

const WellnessDashboard = () => {
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Poppins_400Regular,
    Poppins_300Light,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#e8f5e9', '#c8e6c9']} style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.question}>How are you feeling today?😊</Text>

          <View style={styles.physicalOverview}>
            <Text style={styles.sectionTitle}>My Devices</Text>
          </View>

          <View style={styles.metricsContainer}>
            <DeviceCard
              icon={require('@/assets/images/icon4.png')}
              title="Body Composition"
              subtitle="Smart Scale Pro"
              measurements={[
                { value: '145', unit: 'lb', label: 'Weight' },
                { value: '20.5', label: 'BMI' },
                { value: '22.1', unit: '%', label: 'Body fat' },
              ]}
              date="Measured on Apr 29, 12:04 PM"
            />

            <DeviceCard
              icon={require('@/assets/images/icon4.png')}
              title="Vital Signs"
              subtitle="Health Monitor Plus"
              measurements={[
                { value: '98', unit: '%', label: 'Oxygen' },
                { value: '85', unit: 'bpm', label: 'Pulse' },
                { value: '120/80', unit: 'mmHg', label: 'BP' },
              ]}
              date="Measured on Apr 28, 7:03 PM"
            />
          </View>

          <Link href={{pathname:'/audioRecord'}} style={styles.connectButton}>
            <Text style={styles.connectButtonText}>Connect New Device</Text>
          </Link>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const DeviceCard = ({ icon, title, subtitle, measurements, date }:{icon:ImageSourcePropType,title:string,subtitle:string,measurements:{value:string,unit?:string,label:string}[],date:string}) => (
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
          <Text style={styles.measurementValue}>
            {measurement.value}
            <Text style={styles.measurementUnit}>{measurement.unit}</Text>
          </Text>
          <Text style={styles.measurementLabel}>{measurement.label}</Text>
        </View>
      ))}
    </View>
    <View style={styles.cardFooter}>
      <Text style={styles.cardDate}>{date}</Text>
      <TouchableOpacity>
        <AntDesign name="rightcircle" size={normalize(24)} color="#4caf50" />
      </TouchableOpacity>
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
    fontSize: normalize(14),
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
    alignItems: 'center',
    marginBottom: normalize(20),
  },
  connectButtonText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: normalize(16),
    color: 'white',
  },
});

export default WellnessDashboard;