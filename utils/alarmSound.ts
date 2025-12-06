import { Audio } from 'expo-av';

class AlarmSoundManager {
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;

  async initialize() {
    try {
      // Configure audio session to override silent mode and play in background
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true, // Play even when phone is on silent
        staysActiveInBackground: true, // Keep playing in background
        shouldDuckAndroid: false, // Don't lower volume for other sounds
        playThroughEarpieceAndroid: false, // Use speaker
        allowsRecordingIOS: false,
        interruptionModeIOS: 2, // Mix with others but don't duck
        interruptionModeAndroid: 1, // Don't mix with others
      });

      // Use a generated alarm tone (beep sound)
      // Since we don't have an audio file, we'll use expo-av's built-in functionality
      // In production, you would add an alarm.mp3 file to assets
      
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }

  async playAlarm() {
    try {
      if (this.isPlaying) {
        return; // Already playing
      }

      // Initialize if not done
      await this.initialize();

      // Create a continuous alarm sound
      // Note: You should add an alarm.mp3 file to your assets folder for a real alarm sound
      // For now, we'll use expo-av's sound generation capabilities
      const { sound } = await Audio.Sound.createAsync(
        // This is a placeholder - you should add require('../../assets/alarm.mp3') 
        // For demonstration, using a online alarm sound URL
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3' },
        { 
          shouldPlay: true, 
          isLooping: true, // Loop the alarm
          volume: 1.0, // Maximum volume
        }
      );

      this.sound = sound;
      this.isPlaying = true;

      // Ensure it plays
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing alarm:', error);
    }
  }

  async stopAlarm() {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
      this.isPlaying = false;
    } catch (error) {
      console.error('Error stopping alarm:', error);
    }
  }

  isAlarmPlaying(): boolean {
    return this.isPlaying;
  }
}

// Export singleton instance
export const alarmManager = new AlarmSoundManager();
