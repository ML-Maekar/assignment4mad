import { Audio } from 'expo-av';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { saveActivityResult } from '@/utils/activityResultsDb';

const SOUND_DEMO_IMAGE = require('../assets/images/activity 2.png');

type TabKey = 'activity' | 'writeup' | 'discussion';

type Result = {
  id: number;
  actionName: string;
  location: string;
  prediction: string;
  maxDb: number;
  range: string;
  exampleSound: string;
  risk: string;
  wasPredictionCorrect: string;
  surprises: string;
  earMuffAnswer: string;
};

function estimateDbFromMetering(
  metering: number | undefined,
  actionNameValue: string
) {
  if (metering === undefined || metering === null) {
    return null;
  }

  const actionText = actionNameValue.toLowerCase();

  let minDb = 35;
  let maxDb = 80;

  if (actionText.includes('pen') || actionText.includes('pencil')) {
    minDb = 40;
    maxDb = 65;
  } else if (
    actionText.includes('book') ||
    actionText.includes('bottle') ||
    actionText.includes('box')
  ) {
    minDb = 55;
    maxDb = 78;
  } else if (
    actionText.includes('stamp') ||
    actionText.includes('stamping') ||
    actionText.includes('feet') ||
    actionText.includes('foot')
  ) {
    minDb = 60;
    maxDb = 85;
  } else if (
    actionText.includes('talk') ||
    actionText.includes('speaking') ||
    actionText.includes('voice')
  ) {
    minDb = 45;
    maxDb = 70;
  } else if (actionText.includes('clap') || actionText.includes('clapping')) {
    minDb = 60;
    maxDb = 82;
  }

  const normalized = Math.max(0, Math.min(1, (metering + 60) / 60));

  return minDb + normalized * (maxDb - minDb);
}

function getSoundRisk(db: number) {
  if (db <= 30) {
    return {
      range: '0–30 dB',
      exampleSound: 'Whisper, quiet library',
      risk: 'No risk',
    };
  }

  if (db <= 60) {
    return {
      range: '30–60 dB',
      exampleSound: 'Normal conversation, classroom noise',
      risk: 'Safe for long periods',
    };
  }

  if (db <= 85) {
    return {
      range: '60–85 dB',
      exampleSound: 'Busy traffic, vacuum cleaner',
      risk: 'Generally safe, but long exposure can cause fatigue',
    };
  }

  if (db <= 90) {
    return {
      range: '85–90 dB',
      exampleSound: 'Lawn mower, loud classroom, heavy traffic',
      risk: 'Hearing damage possible after long exposure',
    };
  }

  if (db <= 100) {
    return {
      range: '90–100 dB',
      exampleSound: 'Motorbike, power tools, loud music',
      risk: 'Hearing damage likely after short exposure',
    };
  }

  if (db <= 110) {
    return {
      range: '100–110 dB',
      exampleSound: 'Nightclub, rock concert, chainsaw',
      risk: 'Serious hearing damage in minutes',
    };
  }

  if (db <= 120) {
    return {
      range: '110–120 dB',
      exampleSound: 'Siren close by, car horn at 1 m',
      risk: 'Painful; immediate damage possible',
    };
  }

  if (db <= 130) {
    return {
      range: '120–130 dB',
      exampleSound: 'Jet engine at close range',
      risk: 'Immediate and severe hearing damage',
    };
  }

  return {
    range: '140+ dB',
    exampleSound: 'Explosion, gunshot',
    risk: 'Instant, permanent hearing damage',
  };
}

export default function ActivityTwoGame() {
  const { colors } = useAppTheme();

  const recordingRef = useRef<Audio.Recording | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('activity');
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [actionName, setActionName] = useState('');
  const [location, setLocation] = useState('');

  const [prediction, setPrediction] = useState('');
  const [wasPredictionCorrect, setWasPredictionCorrect] = useState('');
  const [surprises, setSurprises] = useState('');
  const [earMuffAnswer, setEarMuffAnswer] = useState('');

  const [currentDb, setCurrentDb] = useState<number | null>(null);
  const [maxDb, setMaxDb] = useState(0);
  const [savedResultId, setSavedResultId] = useState<number | null>(null);

  const [lastResult, setLastResult] = useState<Result | null>(null);

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

      if (!actionName.trim()) {
        Alert.alert('Missing Action', 'Please enter the action or object tested.');
        return;
      }

      if (!location.trim()) {
        Alert.alert('Missing Location', 'Please enter where the sound was measured.');
        return;
      }

      setCurrentDb(null);
      setMaxDb(0);
      setSavedResultId(null);
      setLastResult(null);

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

        const db = estimateDbFromMetering(status.metering, actionName);

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

      const soundRisk = getSoundRisk(finalDb);

      const resultId = await saveActivityResult({
        activityKey: 'activity-two',
        activityTitle: 'Sound Pollution Hunter',
        label: actionName.trim(),
        score: finalDb,
        data: {
          tabLayout: 'Activity | Write Up | Discussion',
          actionName: actionName.trim(),
          location: location.trim(),
          prediction: prediction.trim(),
          maximumSoundDb: finalDb,
          soundRange: soundRisk.range,
          exampleSound: soundRisk.exampleSound,
          hearingRisk: soundRisk.risk,
          wasPredictionCorrect: wasPredictionCorrect.trim(),
          surprises: surprises.trim(),
          earMuffAnswer: earMuffAnswer.trim(),
        },
      });

      const savedResult: Result = {
        id: resultId,
        actionName: actionName.trim(),
        location: location.trim(),
        prediction: prediction.trim(),
        maxDb: finalDb,
        range: soundRisk.range,
        exampleSound: soundRisk.exampleSound,
        risk: soundRisk.risk,
        wasPredictionCorrect: wasPredictionCorrect.trim(),
        surprises: surprises.trim(),
        earMuffAnswer: earMuffAnswer.trim(),
      };

      setSavedResultId(resultId);
      setLastResult(savedResult);

      Alert.alert(
        'Sound Result Saved',
        `Maximum Sound: ${finalDb.toFixed(1)} dB\n${soundRisk.risk}`
      );
    } catch (error) {
      console.log('Recording stop/save error:', error);
      Alert.alert('Save Error', 'The sound result could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearTest = () => {
    setActionName('');
    setLocation('');
    setPrediction('');
    setWasPredictionCorrect('');
    setSurprises('');
    setEarMuffAnswer('');
    setCurrentDb(null);
    setMaxDb(0);
    setSavedResultId(null);
    setLastResult(null);
    setActiveTab('activity');
  };

  const displayDb = isRecording ? currentDb : maxDb > 0 ? maxDb : null;
  const displayedRisk = maxDb > 0 ? getSoundRisk(maxDb) : null;

  const renderTabs = () => {
    const tabs: { key: TabKey; label: string }[] = [
      { key: 'activity', label: 'Activity' },
      { key: 'writeup', label: 'Write Up' },
      { key: 'discussion', label: 'Discussion' },
    ];

    return (
      <View style={[styles.bottomTabRow, { borderTopColor: colors.border }]}>
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;

          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => [
                styles.bottomTabButton,
                {
                  borderBottomColor: selected ? colors.tint : 'transparent',
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.bottomTabText,
                  { color: selected ? colors.tint : colors.subtitle },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderActivityTab = () => (
    <View
      style={[
        styles.phoneLayoutCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.recordHeader}>
        <Text style={[styles.recordText, { color: colors.text }]}>Record</Text>
      </View>

      <Image
        source={SOUND_DEMO_IMAGE}
        style={styles.demoImage}
        resizeMode="contain"
      />

      <Text style={[styles.body, { color: colors.subtitle }]}>
        Place the phone about 30 cm from the sound source.
      </Text>

      <TextInput
        value={actionName}
        onChangeText={setActionName}
        editable={!isRecording && savedResultId === null}
        placeholder="Action/object, e.g. pen dropped"
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
          {displayedRisk
            ? `${displayedRisk.range}: ${displayedRisk.exampleSound}. ${displayedRisk.risk}`
            : 'Press start and make the sound.'}
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

      {renderTabs()}
    </View>
  );

  const renderWriteUpTab = () => (
    <View
      style={[
        styles.phoneLayoutCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>Write Up</Text>

      <TextInput
        value={prediction}
        onChangeText={setPrediction}
        placeholder="Prediction: louder or softer than another action?"
        placeholderTextColor={colors.subtitle}
        multiline
        style={[
          styles.input,
          styles.multilineInput,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      />

      <TextInput
        value={wasPredictionCorrect}
        onChangeText={setWasPredictionCorrect}
        placeholder="Were you right?"
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
        value={surprises}
        onChangeText={setSurprises}
        placeholder="Any surprises?"
        placeholderTextColor={colors.subtitle}
        multiline
        style={[
          styles.input,
          styles.multilineInput,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      />

      <TextInput
        value={earMuffAnswer}
        onChangeText={setEarMuffAnswer}
        placeholder="Should we wear ear muffs in your classroom?"
        placeholderTextColor={colors.subtitle}
        multiline
        style={[
          styles.input,
          styles.multilineInput,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      />

      {lastResult && (
        <View style={[styles.resultBox, { borderColor: colors.border }]}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {lastResult.actionName}
          </Text>

          <Text style={[styles.body, { color: colors.subtitle }]}>
            Prediction: {lastResult.prediction || 'Not entered'}
          </Text>

          <Text style={[styles.score, { color: colors.success }]}>
            Outcome: {lastResult.maxDb.toFixed(1)} dB
          </Text>

          <Text style={[styles.body, { color: colors.subtitle }]}>
            Were you right? {lastResult.wasPredictionCorrect || 'Not entered'}
          </Text>
        </View>
      )}

      {renderTabs()}
    </View>
  );

  const renderDiscussionTab = () => (
    <View
      style={[
        styles.phoneLayoutCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.cardTitle, { color: colors.text }]}>Discussion</Text>

      <View
        style={[
          styles.formulaBox,
          { borderColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Sound intensity changes depending on energy, distance, and surfaces.
          Prolonged loud noise can affect concentration and hearing.
        </Text>
      </View>

      <View
        style={[
          styles.riskTable,
          { borderColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.tableTitle, { color: colors.text }]}>
          Sound Levels and Hearing Damage Risk
        </Text>

        {[
          ['0–30 dB', 'Whisper, quiet library', 'No risk'],
          [
            '30–60 dB',
            'Normal conversation, classroom noise',
            'Safe for long periods',
          ],
          [
            '60–85 dB',
            'Busy traffic, vacuum cleaner',
            'Generally safe, but long exposure can cause fatigue',
          ],
          [
            '85–90 dB',
            'Lawn mower, loud classroom, heavy traffic',
            'Hearing damage possible after long exposure',
          ],
          [
            '90–100 dB',
            'Motorbike, power tools, loud music',
            'Hearing damage likely after short exposure',
          ],
          [
            '100–110 dB',
            'Nightclub, rock concert, chainsaw',
            'Serious hearing damage in minutes',
          ],
          [
            '110–120 dB',
            'Siren close by, car horn at 1 m',
            'Painful; immediate damage possible',
          ],
          [
            '120–130 dB',
            'Jet engine at close range',
            'Immediate and severe hearing damage',
          ],
          ['140+ dB', 'Explosion, gunshot', 'Instant, permanent hearing damage'],
        ].map((row) => (
          <View
            key={row[0]}
            style={[styles.tableRow, { borderColor: colors.border }]}
          >
            <Text style={[styles.tableRange, { color: colors.text }]}>
              {row[0]}
            </Text>

            <Text style={[styles.tableText, { color: colors.subtitle }]}>
              {row[1]} — {row[2]}
            </Text>
          </View>
        ))}
      </View>

      {lastResult && (
        <View style={[styles.resultBox, { borderColor: colors.border }]}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            Latest Result
          </Text>

          <Text style={[styles.body, { color: colors.subtitle }]}>
            Action: {lastResult.actionName}
          </Text>

          <Text style={[styles.body, { color: colors.subtitle }]}>
            Location: {lastResult.location}
          </Text>

          <Text style={[styles.score, { color: colors.success }]}>
            Maximum Sound: {lastResult.maxDb.toFixed(1)} dB
          </Text>

          <Text style={[styles.body, { color: colors.subtitle }]}>
            Range: {lastResult.range}
          </Text>

          <Text style={[styles.body, { color: colors.subtitle }]}>
            Example Level: {lastResult.exampleSound}
          </Text>

          <Text style={[styles.body, { color: colors.subtitle }]}>
            Hearing Risk: {lastResult.risk}
          </Text>
        </View>
      )}

      <Pressable
        onPress={() =>
          router.push('/result-history?activityKey=activity-two' as never)
        }
        style={({ pressed }) => [
          styles.secondaryButton,
          { borderColor: colors.tint },
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>
          Open Result History
        </Text>
      </Pressable>

      {renderTabs()}
    </View>
  );

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Sound Pollution Hunter
        </Text>

        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Record classroom sounds, complete the write-up, and check hearing risk.
        </Text>
      </View>

      {activeTab === 'activity' && renderActivityTab()}
      {activeTab === 'writeup' && renderWriteUpTab()}
      {activeTab === 'discussion' && renderDiscussionTab()}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
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
  phoneLayoutCard: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    minHeight: 620,
  },
  recordHeader: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  recordText: {
    fontSize: 24,
    fontWeight: '500',
  },
  demoImage: {
    width: '100%',
    height: 260,
    marginBottom: 18,
  },
  bottomTabRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 4,
  },
  bottomTabButton: {
    paddingHorizontal: 6,
    paddingBottom: 4,
    borderBottomWidth: 2,
  },
  bottomTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
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
  multilineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
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
  formulaBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  riskTable: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  tableRow: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
  },
  tableRange: {
    fontSize: 13,
    fontWeight: '900',
  },
  tableText: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    minHeight: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
    fontWeight: '900',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  savedText: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 4,
  },
  resultBox: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 14,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  score: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '900',
  },
});