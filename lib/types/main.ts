import { Audio, AVPlaybackStatusError, AVPlaybackStatusSuccess } from "expo-av";


export interface savedRecording { 
    sound: Audio.Sound,
    status: AVPlaybackStatusSuccess | AVPlaybackStatusError,
    getURI: string,
    date: string 
}
