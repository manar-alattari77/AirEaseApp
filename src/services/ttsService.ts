import axios from 'axios';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const GOOGLE_TTS_KEY = 'AIzaSyCJMDZIIfSkYoSH7l25J_5l0wDg_Vp28U0';

export interface TTSRequest {
  input: { text: string };
  voice: { languageCode: string; ssmlGender: string };
  audioConfig: { audioEncoding: string };
}

export interface TTSResponse {
  audioContent: string;
}

export class TTSService {
  private static instance: TTSService;
  private sound: Audio.Sound | null = null;

  private constructor() {}

  public static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  public async synthesizeText(text: string): Promise<void> {
    try {
      const requestData: TTSRequest = {
        input: { text },
        voice: { languageCode: "en-US", ssmlGender: "FEMALE" },
        audioConfig: { audioEncoding: "MP3" }
      };

      const response = await axios.post<TTSResponse>(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.audioContent) {
        // Decode base64 audio content
        const audioData = response.data.audioContent;
        
        // Create a temporary file path with fallback
        const fileUri = (FileSystem as any).documentDirectory
          ? (FileSystem as any).documentDirectory + "output.mp3"
          : "./output.mp3";
        
        // Write the decoded audio data to file
        await FileSystem.writeAsStringAsync(fileUri, audioData, {
          encoding: 'base64',
        });

        // Stop any currently playing sound
        if (this.sound) {
          await this.sound.unloadAsync();
        }

        // Create and play the new sound
        const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
        this.sound = sound;
        
        await sound.playAsync();
        
        // Clean up after playing
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            this.sound = null;
          }
        });

      } else {
        throw new Error('No audio content received from TTS API');
      }
    } catch (error) {
      console.error('TTS Error:', error);
      throw new Error(`Failed to synthesize text: ${error}`);
    }
  }

  public async stopAudio(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}

export default TTSService.getInstance();
