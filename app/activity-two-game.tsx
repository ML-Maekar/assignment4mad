import React, { useState } from 'react';
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

type Result = {
  id: number;
  actionName: string;
  prediction: string;
  soundLevel: number;
  locationNotes: string;
  wereYouRight: string;
  observation: string;
  riskCategory: string;
  earMuffAdvice: string;
};

function getSoundRisk(soundLevel: number) {
  if (soundLevel <= 30) {
    return '0–30 dB: No risk';
  }

  if (soundLevel <= 60) {
    return '30–60 dB: Safe for long periods';
  }

  if (soundLevel <= 85) {
    return '60–85 dB: Generally safe, but long exposure can cause fatigue';
  }

  if (soundLevel <= 90) {
    return '85–90 dB: Hearing damage possible after long exposure';
  }

  if (soundLevel <= 100) {
    return '90–100 dB: Hearing damage likely after short exposure';
  }

  if (soundLevel <= 110) {
    return '100–110 dB: Serious hearing damage possible in minutes';
  }

  if (soundLevel <= 120) {
    return '110–120 dB: Painful; immediate damage possible';
  }

  if (soundLevel <= 130) {
    return '120–130 dB: Immediate and severe hearing damage risk';
  }

  return '140+ dB: Instant, permanent hearing damage risk';
}

function getEarMuffAdvice(soundLevel: number) {
  if (soundLevel < 85) {
    return 'Ear muffs are usually not needed for this sound level.';
  }

  if (soundLevel <= 100) {
    return 'Ear muffs are recommended if exposure lasts for a long time.';
  }

  return 'Ear muffs or hearing protection are strongly recommended.';
}

export default function ActivityTwoGame() {
  const { colors } = useAppTheme();

  const [actionName, setActionName] = useState('');
  const [prediction, setPrediction] = useState('');
  const [soundLevel, setSoundLevel] = useState('');
  const [locationNotes, setLocationNotes] = useState('');
  const [wereYouRight, setWereYouRight] = useState('');
  const [observation, setObservation] = useState('');

  const [results, setResults] = useState<Result[]>([]);

  const saveResult = () => {
    const soundLevelValue = Number(soundLevel);

    if (!actionName.trim()) {
      Alert.alert('Missing action', 'Please enter the classroom action tested.');
      return;
    }

    if (!prediction.trim()) {
      Alert.alert('Missing prediction', 'Please enter your prediction.');
      return;
    }

    if (soundLevelValue < 0 || Number.isNaN(soundLevelValue)) {
      Alert.alert('Invalid sound level', 'Please enter a valid dB value.');
      return;
    }

    if (!locationNotes.trim()) {
      Alert.alert('Missing location', 'Please enter where the sound was measured.');
      return;
    }

    if (!wereYouRight.trim()) {
      Alert.alert('Missing reflection', 'Please enter whether your prediction was correct.');
      return;
    }

    const riskCategory = getSoundRisk(soundLevelValue);
    const earMuffAdvice = getEarMuffAdvice(soundLevelValue);

    const newResult: Result = {
      id: Date.now(),
      actionName: actionName.trim(),
      prediction: prediction.trim(),
      soundLevel: soundLevelValue,
      locationNotes: locationNotes.trim(),
      wereYouRight: wereYouRight.trim(),
      observation: observation.trim(),
      riskCategory,
      earMuffAdvice,
    };

    setResults((currentResults) => [newResult, ...currentResults]);

    Alert.alert(
      'Sound Result Saved',
      `${soundLevelValue.toFixed(1)} dB\n${riskCategory}`
    );
  };

  const resetForm = () => {
    setActionName('');
    setPrediction('');
    setSoundLevel('');
    setLocationNotes('');
    setWereYouRight('');
    setObservation('');
  };

  const resetResults = () => {
    Alert.alert(
      'Clear Results?',
      'This will remove all sound test attempts from this screen.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setResults([]),
        },
      ]
    );
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Sound Pollution Hunter
        </Text>

        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Measure sound levels from classroom actions, compare predictions, and
          check hearing risk.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Sound Test Details
        </Text>

        <TextInput
          value={actionName}
          onChangeText={setActionName}
          placeholder="Action tested, e.g. Dropping a book"
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
          value={prediction}
          onChangeText={setPrediction}
          placeholder="Prediction: louder or softer than another action?"
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
          value={soundLevel}
          onChangeText={setSoundLevel}
          placeholder="Outcome sound level in dB"
          placeholderTextColor={colors.subtitle}
          keyboardType="decimal-pad"
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
          value={locationNotes}
          onChangeText={setLocationNotes}
          placeholder="Location, e.g. classroom front desk"
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
          value={wereYouRight}
          onChangeText={setWereYouRight}
          placeholder="Were you right? e.g. Yes, louder than expected"
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
          value={observation}
          onChangeText={setObservation}
          placeholder="Any surprises or observation notes?"
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

        <Text style={[styles.helperText, { color: colors.subtitle }]}>
          Use a sound meter reading or classroom measurement result, then enter
          the dB value here. Later this result can include GPS tagging and
          Firestore/SQLite saving.
        </Text>

        <View style={styles.buttonRow}>
          <Pressable
            onPress={saveResult}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              Save Sound Result
            </Text>
          </Pressable>

          <Pressable
            onPress={resetForm}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.border },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Clear Form
            </Text>
          </Pressable>
        </View>
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
            No sound measurements yet. Test three actions and compare which one
            was loudest.
          </Text>
        ) : (
          results.map((result) => (
            <View
              key={result.id}
              style={[styles.resultRow, { borderColor: colors.border }]}
            >
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                {result.actionName}
              </Text>

              <Text style={[styles.body, { color: colors.subtitle }]}>
                Prediction: {result.prediction}
              </Text>

              <Text style={[styles.score, { color: colors.success }]}>
                Outcome: {result.soundLevel.toFixed(1)} dB
              </Text>

              <Text style={[styles.body, { color: colors.subtitle }]}>
                Location: {result.locationNotes}
              </Text>

              <Text style={[styles.body, { color: colors.subtitle }]}>
                Were you right? {result.wereYouRight}
              </Text>

              {result.observation ? (
                <Text style={[styles.body, { color: colors.subtitle }]}>
                  Observation: {result.observation}
                </Text>
              ) : null}

              <Text style={[styles.body, { color: colors.subtitle }]}>
                Hearing risk: {result.riskCategory}
              </Text>

              <Text style={[styles.body, { color: colors.subtitle }]}>
                Ear muff advice: {result.earMuffAdvice}
              </Text>
            </View>
          ))
        )}

        {results.length > 0 && (
          <Pressable
            onPress={resetResults}
            style={({ pressed }) => [
              styles.clearResultsButton,
              { borderColor: colors.danger },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.danger }]}>
              Clear Results
            </Text>
          </Pressable>
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
  multilineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  buttonRow: {
    gap: 10,
  },
  button: {
    minHeight: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.85,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearResultsButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
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