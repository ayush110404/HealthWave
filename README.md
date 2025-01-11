# HealthWave 💓 - Heart Rate Monitoring Mobile App

## Overview

HealthWave is an innovative mobile application that allows users to record and analyze their heart rate using audio recordings. Leveraging advanced signal processing techniques, the app provides insights into your heart health and emotional state.

## 🌟 Features

- **Heart Rate Recording**: Capture your heart rate using audio input
- **Real-time Analysis**: Instant processing of audio recordings
- **Detailed Reports**: Comprehensive heart rate analysis and insights
- **Recording History**: View and manage past recordings
- **Emotional State Interpretation**: Get insights into your potential emotional state based on heart rate

## 🛠 Tech Stack

- **Frontend**: 
  - React Native
  - Expo
  - TypeScript
- **Key Libraries**:
  - Expo Audio
  - React Native Skia
  - Async Storage
  - Expo Router

## 📱 Supported Platforms

- iOS
- Android
- Web

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo CLI
- Smartphone or Emulator

### Installation

1. Clone the repository
```
bash
git clone https://github.com/yourusername/healthwave.git
cd healthwave
 ```
2. Install dependencies
```
bash
npm install
```
3. Set up environment variables
- Create a `.env` file
- Add your backend server URL:
``` EXPO_PUBLIC_SERVER_URL=https://your-backend-server-url ```
4. Start the development server
``` 
bash
npm start
```


## 🔍 How It Works

1. Record Audio: Capture a short audio recording
2. Upload to Backend: Send audio to signal processing server
3. Analyze Heart Rate: Extract heart rate and peak information
4. Generate Report: Display detailed heart rate insights


## 🤝 Backend Integration

This frontend works with a separate backend service responsible for:
- Audio signal processing
- Heart rate extraction
- Peak detection

## 🔒 Security

- Secure audio processing
- Local storage of recordings
- No persistent personal health data

## 🚧 Limitations

- Requires quiet environment for accurate readings
- Not a medical-grade diagnostic tool
- Accuracy depends on recording quality


