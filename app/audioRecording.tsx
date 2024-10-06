import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign,MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts, Poppins_700Bold, Poppins_400Regular, Poppins_300Light } from '@expo-google-fonts/poppins';
import { Canvas, Path, Line } from '@shopify/react-native-skia';
import { Audio, AVPlaybackStatus, AVPlaybackStatusError, AVPlaybackStatusSuccess } from 'expo-av';
import { Link, useNavigation } from 'expo-router';
import * as FileSystem from "expo-file-system";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { savedRecording } from '@/lib/types/main';
import { RecordingStatus } from 'expo-av/build/Audio';

const { width, height } = Dimensions.get('window');
const scale = width / 390;
const normalize = (size: number) => Math.round(size * scale);

const CARD_WIDTH = width - normalize(40);
const CARD_PADDING = normalize(16);
const GRAPH_WIDTH = CARD_WIDTH - (CARD_PADDING * 2);
const GRAPH_HEIGHT = height * 0.4;
const POINTS = 200;

const RecordingScreen = () => {
    const [fontsLoaded] = useFonts({
        Poppins_700Bold,
        Poppins_400Regular,
        Poppins_300Light,
    });

    const [isRecording, setIsRecording] = useState(false);
    const [waveformPath, setWaveformPath] = useState('');
    const recordingRef = useRef<Audio.Recording | null>(null);
    const audioBufferRef = useRef(new Float32Array(POINTS).fill(0));
    const [allRecordings, setAllRecordings] = useState<savedRecording[]>([]);

    useEffect(() => {
        loadRecordings();
        return () => {
            if (recordingRef.current) {
                recordingRef.current.stopAndUnloadAsync();
            }
        };
    }, []);

    const loadRecordings = async () => {
        try {
            const storedRecordings = await AsyncStorage.getItem('recordings');
            if (storedRecordings) {
                const parsedRecordings = JSON.parse(storedRecordings);
                setAllRecordings(parsedRecordings);
            }
        } catch (error) {
            console.error('Failed to load recordings', error);
        }
    };

    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('Permission to access microphone was denied');
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const recording = new Audio.Recording();
            await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);

            recording.setOnRecordingStatusUpdate(updateWaveform);
            await recording.startAsync();
            recordingRef.current = recording;
            setIsRecording(true);

        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        setIsRecording(false);
        if (recordingRef.current) {
            try {
                await recordingRef.current.stopAndUnloadAsync();
                const uri = recordingRef.current.getURI();
                if (uri) {
                    const fileName = `recording-${Date.now()}.m4a`;
                    const newUri = `${FileSystem.documentDirectory}${fileName}`;
                    
                    // Ensure the directory exists
                    if(!FileSystem.documentDirectory) return console.error('Document directory does not exist');
                    const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory);
                    if (!dirInfo.exists) {
                        await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory, { intermediates: true });
                    }
                    
                    await FileSystem.moveAsync({
                        from: uri,
                        to: newUri,
                    });

                    const { sound, status } = await Audio.Sound.createAsync({ uri: newUri });
                    const newRecording = {
                        sound: sound,
                        status: status as AVPlaybackStatusSuccess,
                        getURI: newUri,
                        date: new Date().toLocaleString(),
                    };
                    console.log('New recording:', newUri);

                    const updatedRecordings = [...allRecordings, newRecording];
                    setAllRecordings(updatedRecordings);

                    // Save the updated recordings list to AsyncStorage
                    await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));
                }
            } catch (error) {
                console.error('Error stopping recording:', error);
            } finally {
                recordingRef.current = null;
            }
        }
    };

    const updateWaveform = async (status: RecordingStatus) => {
        if (status.isRecording) {
            try {
                const { metering } = status;
                if (metering !== undefined) {
                    const linearValue = Math.pow(10, metering / 20);
                    const newBuffer = new Float32Array(audioBufferRef.current.length);
                    newBuffer.set(audioBufferRef.current.slice(1));
                    newBuffer[newBuffer.length - 1] = linearValue;
                    audioBufferRef.current = newBuffer;
                    const newPath = generateWaveformPath(audioBufferRef.current);
                    setWaveformPath(newPath);
                }
            } catch (error) {
                console.error('Error updating waveform:', error);
            }
        }
    };

    const generateWaveformPath = (audioData: typeof audioBufferRef.current) => {
        let path = '';
        const step = GRAPH_WIDTH / (POINTS - 1);
        const maxValue = Math.max(...audioData);
        const minValue = Math.min(...audioData);
        const range = maxValue - minValue;

        for (let i = 0; i < POINTS; i++) {
            const x = i * step - 5;
            const normalizedY = range !== 0 ? (audioData[i] - minValue) / range : 0.5;
            const y = GRAPH_HEIGHT - (normalizedY * GRAPH_HEIGHT);
            if (i === 0) {
                path += `M ${x} ${y}`;
            } else {
                path += ` L ${x} ${y}`;
            }
        }
        return path;
    };

    const renderGridLines = () => {
        const lines = [];
        const stepX = GRAPH_WIDTH / 10;
        const stepY = GRAPH_HEIGHT / 10;

        for (let i = 0; i <= 10; i++) {
            lines.push(<Line key={`vl-${i}`} p1={{ x: i * stepX, y: 0 }} p2={{ x: i * stepX, y: GRAPH_HEIGHT }} color="#bfbfbf" strokeWidth={1} />);
        }
        for (let i = 0; i <= 10; i++) {
            lines.push(<Line key={`hl-${i}`} p1={{ x: 0, y: i * stepY }} p2={{ x: GRAPH_WIDTH, y: i * stepY }} color="#bfbfbf" strokeWidth={1} />);
        }
        return lines;
    };

    if (!fontsLoaded) {
        return null;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient colors={['#e8f5e9', '#c8e6c9']} style={styles.container}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.question}>Ready to record?</Text>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="record-rec" size={normalize(50)} color="#4caf50" />
                            <View>
                                <Text style={styles.cardTitle}>Audio Recorder</Text>
                                <Text style={styles.cardSubtitle}>Capture your thoughts</Text>
                            </View>
                        </View>

                        <View style={styles.graphContainer}>
                            <Canvas style={styles.graph}>
                                {renderGridLines()}
                                <Path
                                    path={waveformPath}
                                    color="#4caf50"
                                    style="stroke"
                                    strokeWidth={2}
                                />
                            </Canvas>
                        </View>

                        <View style={styles.cardFooter}>
                            <Text style={styles.cardDate}>
                                {isRecording ? 'Recording in progress...' : 'Tap Record to start'}
                            </Text>
                            <TouchableOpacity onPress={isRecording ? stopRecording : startRecording}>
                                <AntDesign name={isRecording ? "pausecircle" : "playcircleo"} size={normalize(24)} color="#4caf50" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.recordButton}
                        onPress={isRecording ? stopRecording : startRecording}
                    >
                        <Text style={styles.recordButtonText}>
                            {isRecording ? 'Stop Recording' : 'Start Recording'}
                        </Text>
                    </TouchableOpacity>
                    <Link
                        href={{
                            pathname: '/recordingAnalysis',
                        }}
                        disabled={recordingRef.current === null || isRecording}
                        style={(recordingRef.current==null || isRecording) ? styles.disabledAnalyzeButton : styles.viewRecordingsButton}
                    >
                        <Text style={styles.viewRecordingsButtonText}>
                            Analyze Recording
                        </Text>
                    </Link>
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
    question: {
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
        alignItems: 'flex-start',
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
    graphContainer: {
        width: GRAPH_WIDTH,
        height: GRAPH_HEIGHT,
        alignSelf: 'center',
    },
    graph: {
        width: '100%',
        height: '100%',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: normalize(16),
    },
    cardDate: {
        fontSize: normalize(12),
        color: '#b0bec5',
        fontFamily: 'Poppins_400Regular',
    },
    recordButton: {
      backgroundColor: '#2e7d32',
      textAlign:'center',
      borderRadius: normalize(25),
      padding: normalize(16),
      alignItems: 'center',
      marginBottom: normalize(20),
    },
    recordButtonText: {
        fontSize: normalize(16),
        color: '#ffffff',
        fontFamily: 'Poppins_700Bold',
    },
    viewRecordingsButton: {
        backgroundColor: '#666666',
        textAlign:'center',
        borderRadius: normalize(25),
        padding: normalize(16),
        alignItems: 'center',
        marginBottom: normalize(20),
      },
      viewRecordingsButtonText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: normalize(16),
        color: 'white',
      },
      disabledAnalyzeButton: {
        backgroundColor: '#666666',
        textAlign:'center',
        borderRadius: normalize(25),
        padding: normalize(16),
        alignItems: 'center',
        marginBottom: normalize(20),
        opacity: 0.5,
      },

});

export default RecordingScreen;