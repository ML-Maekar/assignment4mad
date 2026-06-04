import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { saveActivityResult } from '@/utils/activityResultsDb';

type Result = {
  id: number;
  objectName: string;
  location: string;
  maxDb: number;
  risk: string;
};

function estimateDbFromMetering(
  metering: number | undefined,
  objectNameValue: string
) {
  if (metering === undefined || metering === null) {
    return null;
  }

  const objectText = objectNameValue.toLowerCase();

  let minDb = 35;
  let maxDb = 80;

  if (objectText.includes('pen') || objectText.includes('pencil')) {
    minDb = 40;
    maxDb = 65;
  } else if (
    objectText.includes('book') ||
    objectText.includes('bottle') ||
    objectText.includes('box')
  ) {
    minDb = 55;
    maxDb = 78;
  } else if (
    objectText.includes('stamp') ||
    objectText.includes('stamping') ||
    objectText.includes('feet') ||
    objectText.includes('foot')
  ) {
    minDb = 60;
    maxDb = 85;
  } else if (
    objectText.includes('talk') ||
    objectText.includes('speaking') ||
    objectText.includes('voice')
  ) {
    minDb = 45;
    maxDb = 70;
  } else if (
    objectText.includes('clap') ||
    objectText.includes('clapping')
  ) {
    minDb = 60;
    maxDb = 82;
  }

  const normalized = Math.max(0, Math.min(1, (metering + 60) / 60));
  const estimatedDb = minDb + normalized * (maxDb - minDb);

  return estimatedDb;
}
function getSoundRisk(db: number) {
  if (db <= 50) return 'Quiet classroom sound';
  if (db <= 65) return 'Small thing dropped not dangerous for ears';
  if (db <= 75) return 'Loud but acceptable classroom sound';
  if (db <= 85) return 'Very loud classroom sound';
  return 'Too loud for long exposure';
}

export default function ActivityTwoGame() {
  const { colors } = useAppTheme();

  const recordingRef = useRef<Audio.Recording | null>(null);

  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [objectName, setObjectName] = useState('');
  const [location, setLocation] = useState('');

  const [currentDb, setCurrentDb] = useState<number | null>(null);
  const [maxDb, setMaxDb] = useState(0);
  const [savedResultId, setSavedResultId] = useState<number | null>(null);

  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    async function requestPermission() {
      const permission = await Audio.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Microphone Permission Needed',
          'Please allow microphone access to record sound.'
        );
        setHasPermission(false);
        return;
      }

      setHasPermission(true);
    }

    requestPermission();
  }, []);

  const startRecording = async () => {
    try {
      if (!hasPermission) {
        Alert.alert('Permission Missing', 'Microphone permission is required.');
        return;
      }

      if (!objectName.trim()) {
        Alert.alert('Missing Object', 'Please enter the object or action tested.');
        return;
      }

      if (!location.trim()) {
        Alert.alert('Missing Location', 'Please enter the test location.');
        return;
      }

      setCurrentDb(null);
      setMaxDb(0);
      setSavedResultId(null);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();

      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
        isMeteringEnabled: true,
      } as any);

      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) return;

        const db = estimateDbFromMetering(status.metering, objectName);

        if (db !== null) {
          setCurrentDb(db);
          setMaxDb((oldMax) => Math.max(oldMax, db));
        }
      });

      recording.setProgressUpdateInterval(250);

      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      console.log('Recording start error:', error);
      Alert.alert('Recording Error', 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    try {
      const recording = recordingRef.current;

      if (!recording) return;

      await recording.stopAndUnloadAsync();

      recordingRef.current = null;
      setIsRecording(false);

      const finalDb = maxDb > 0 ? maxDb : currentDb ?? 0;

      if (finalDb <= 0) {
        Alert.alert('No Sound Reading', 'No sound level was detected.');
        return;
      }

      if (savedResultId !== null) {
        return;
      }

      setIsSaving(true);

      const risk = getSoundRisk(finalDb);

      const resultId = await saveActivityResult({
        activityKey: 'activity-two',
        activityTitle: 'Sound Pollution Hunter',
        label: objectName.trim(),
        score: finalDb,
        data: {
          objectName: objectName.trim(),
          location: location.trim(),
          maximumSoundDb: finalDb,
          hearingImpact: risk,
        },
      });

      setSavedResultId(resultId);

      const newResult: Result = {
        id: resultId,
        objectName: objectName.trim(),
        location: location.trim(),
        maxDb: finalDb,
        risk,
      };

      setResults((currentResults) => [newResult, ...currentResults]);

      Alert.alert(
        'Sound Result Saved',
        `Maximum Sound: ${finalDb.toFixed(1)} dB\n${risk}`
      );
    } catch (error) {
      console.log('Recording stop/save error:', error);
      Alert.alert('Save Error', 'The sound result could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearTest = () => {
    setObjectName('');
    setLocation('');
    setCurrentDb(null);
    setMaxDb(0);
    setSavedResultId(null);
  };

  const displayDb = isRecording ? currentDb : maxDb > 0 ? maxDb : null;

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Sound Pollution Hunter
        </Text>

        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Record a classroom sound and check its sound level.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Sound Test
        </Text>

        <TextInput
          value={objectName}
          onChangeText={setObjectName}
          editable={!isRecording && savedResultId === null}
          placeholder="Object/action tested, e.g. book dropped"
          placeholderTextColor={colors.subtitle}
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        />

        <TextInput
          value={location}
          onChangeText={setLocation}
          editable={!isRecording && savedResultId === null}
          placeholder="Location, e.g. classroom table"
          placeholderTextColor={colors.subtitle}
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        />

        <View
          style={[
            styles.meterBox,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <Text style={[styles.meterLabel, { color: colors.subtitle }]}>
            Sound Level
          </Text>

          <Text style={[styles.dbText, { color: colors.text }]}>
            {displayDb === null ? '--' : displayDb.toFixed(1)} dB
          </Text>

          <Text style={[styles.body, { color: colors.subtitle }]}>
            {maxDb > 0 ? getSoundRisk(maxDb) : 'Press start and make the sound.'}
          </Text>
        </View>

        {savedResultId === null ? (
          <Pressable
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: isRecording ? colors.danger : colors.tint },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              {isSaving
                ? 'Saving...'
                : isRecording
                  ? 'Stop Recording'
                  : 'Start Recording'}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.savedText, { color: colors.success }]}>
            Result saved to Result History.
          </Text>
        )}

        {savedResultId !== null && (
          <Pressable
            onPress={clearTest}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.border },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Clear Test
            </Text>
          </Pressable>
        )}
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Results
        </Text>

        {results.length === 0 ? (
          <Text style={[styles.body, { color: colors.subtitle }]}>
            No results saved yet.
          </Text>
        ) : (
          results.map((result) => (
            <View
              key={result.id}
              style={[styles.resultRow, { borderColor: colors.border }]}
            >
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                {result.objectName}
              </Text>

              <Text style={[styles.body, { color: colors.subtitle }]}>
                Location: {result.location}
              </Text>

              <Text style={[styles.score, { color: colors.success }]}>
                Maximum Sound: {result.maxDb.toFixed(1)} dB
              </Text>

              <Text style={[styles.body, { color: colors.subtitle }]}>
                Impact: {result.risk}
              </Text>
            </View>
          ))
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  meterBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  meterLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  dbText: {
    fontSize: 42,
    fontWeight: '900',
    marginBottom: 8,
  },
  button: {
    minHeight: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  savedText: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
  },
  resultRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  score: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '900',
  },
});