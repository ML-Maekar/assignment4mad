import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
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

type StudentLevel = 'primary' | 'high';
type BounceType = 'no-bounce' | 'bounce';

type Result = {
  id: number;
  studentLevel: StudentLevel;
  designName: string;
  prediction: string;
  sketchDescription: string;
  videoUri: string | null;
  dropHeight: number;
  predictedTime: number;
  timeToGround: number;
  toyMass: number;
  contactTime: number;
  bounceType: BounceType;
  reboundTime: number;
  finalSpeed: number;
  acceleration: number;
  netForce: number;
  weight: number;
  dragForce: number;
  upwardVelocity: number;
  gForce: number;
  predictionDifference: number;
  riskCategory: string;
};

function getRiskCategory(gForce: number) {
  if (gForce <= 5) {
    return '1–5 g: Low impact, no injury expected';
  }

  if (gForce <= 10) {
    return '5–10 g: Moderate impact, possible bruising or strain';
  }

  if (gForce <= 30) {
    return '10–30 g: High impact, serious injuries possible';
  }

  if (gForce <= 50) {
    return '30–50 g: Very high impact, severe injury risk';
  }

  return '50+ g: Extreme impact, major redesign needed';
}

export default function ActivityOneGame() {
  const { colors } = useAppTheme();

  const [studentLevel, setStudentLevel] = useState<StudentLevel>('primary');
  const [bounceType, setBounceType] = useState<BounceType>('no-bounce');
  const [playbackRate, setPlaybackRate] = useState(0.5);

  const [designName, setDesignName] = useState('');
  const [prediction, setPrediction] = useState('');
  const [sketchDescription, setSketchDescription] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [dropHeight, setDropHeight] = useState('');
  const [predictedTime, setPredictedTime] = useState('');
  const [timeToGround, setTimeToGround] = useState('');

  const [toyMass, setToyMass] = useState('');
  const [contactTime, setContactTime] = useState('');
  const [reboundTime, setReboundTime] = useState('');
  const [reflection, setReflection] = useState('');

  const [results, setResults] = useState<Result[]>([]);

  const recordVideoEvidence = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Camera permission needed',
        'Please allow camera access to record parachute drop evidence.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const chooseVideoEvidence = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Media permission needed',
        'Please allow media access to choose parachute drop video evidence.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const calculateResult = () => {
    const heightValue = Number(dropHeight);
    const predictedTimeValue = Number(predictedTime);
    const timeValue = Number(timeToGround);
    const massValue = Number(toyMass);
    const contactTimeValue = Number(contactTime);
    const reboundTimeValue = bounceType === 'bounce' ? Number(reboundTime) : 0;

    if (!designName.trim()) {
      Alert.alert('Missing design name', 'Please enter a parachute design name.');
      return;
    }

    if (!prediction.trim()) {
      Alert.alert('Missing prediction', 'Please enter your prediction.');
      return;
    }

    if (!sketchDescription.trim()) {
      Alert.alert(
        'Missing sketch/design description',
        'Please describe your parachute design or sketch.'
      );
      return;
    }

    if (heightValue <= 0 || predictedTimeValue <= 0 || timeValue <= 0) {
      Alert.alert(
        'Invalid primary measurements',
        'Please enter valid positive numbers for drop height, predicted time, and actual time to ground.'
      );
      return;
    }

    if (studentLevel === 'high') {
      if (massValue <= 0 || contactTimeValue <= 0) {
        Alert.alert(
          'Invalid high school measurements',
          'High school mode requires toy mass and contact/stopping time from slow-motion video.'
        );
        return;
      }

      if (bounceType === 'bounce' && reboundTimeValue <= 0) {
        Alert.alert(
          'Missing rebound time',
          'If the toy bounced, enter the time to maximum rebound height from slow-motion video.'
        );
        return;
      }
    }

    const finalSpeed = heightValue / timeValue;
    const acceleration = finalSpeed / timeValue;

    const netForce = studentLevel === 'high' ? massValue * acceleration : 0;
    const weight = studentLevel === 'high' ? massValue * 9.8 : 0;
    const dragForce = studentLevel === 'high' ? weight - netForce : 0;

    const upwardVelocity =
      studentLevel === 'high' && bounceType === 'bounce'
        ? 9.8 * reboundTimeValue
        : 0;

    const velocityChange =
      studentLevel === 'high' && bounceType === 'bounce'
        ? finalSpeed + upwardVelocity
        : finalSpeed;

    const gForce =
      studentLevel === 'high'
        ? velocityChange / contactTimeValue / 9.8
        : 0;

    const predictionDifference = Math.abs(predictedTimeValue - timeValue);
    const riskCategory =
      studentLevel === 'high' ? getRiskCategory(gForce) : 'Primary mode';

    const newResult: Result = {
      id: Date.now(),
      studentLevel,
      designName: designName.trim(),
      prediction: prediction.trim(),
      sketchDescription: sketchDescription.trim(),
      videoUri,
      dropHeight: heightValue,
      predictedTime: predictedTimeValue,
      timeToGround: timeValue,
      toyMass: studentLevel === 'high' ? massValue : 0,
      contactTime: studentLevel === 'high' ? contactTimeValue : 0,
      bounceType,
      reboundTime: studentLevel === 'high' ? reboundTimeValue : 0,
      finalSpeed,
      acceleration: studentLevel === 'high' ? acceleration : 0,
      netForce,
      weight,
      dragForce,
      upwardVelocity,
      gForce,
      predictionDifference,
      riskCategory,
    };

    setResults((currentResults) => [newResult, ...currentResults]);

    if (studentLevel === 'primary') {
      Alert.alert(
        'Primary Result Complete',
        `Final speed: ${finalSpeed.toFixed(2)} m/s`
      );
    } else {
      Alert.alert(
        'High School Result Complete',
        `Final speed: ${finalSpeed.toFixed(2)} m/s\nG-force: ${gForce.toFixed(2)}g`
      );
    }
  };

  const resetForm = () => {
    setDesignName('');
    setPrediction('');
    setSketchDescription('');
    setVideoUri(null);
    setDropHeight('');
    setPredictedTime('');
    setTimeToGround('');
    setToyMass('');
    setContactTime('');
    setReboundTime('');
    setReflection('');
    setBounceType('no-bounce');
    setPlaybackRate(0.5);
  };

  const resetResults = () => {
    Alert.alert(
      'Clear Results?',
      'This will remove all parachute test attempts from this screen.',
      [
        { text: 'Cancel', style: 'cancel' },
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
          Parachute Drop Test
        </Text>

        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Record or upload video evidence, replay it slowly, measure timing,
          then calculate results based on student level.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Student Level
        </Text>

        <View style={styles.optionRow}>
          <Pressable
            onPress={() => setStudentLevel('primary')}
            style={[
              styles.optionButton,
              {
                borderColor:
                  studentLevel === 'primary' ? colors.tint : colors.border,
                backgroundColor:
                  studentLevel === 'primary'
                    ? `${colors.tint}22`
                    : colors.background,
              },
            ]}
          >
            <Text style={[styles.optionText, { color: colors.text }]}>
              Primary School
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setStudentLevel('high')}
            style={[
              styles.optionButton,
              {
                borderColor:
                  studentLevel === 'high' ? colors.tint : colors.border,
                backgroundColor:
                  studentLevel === 'high'
                    ? `${colors.tint}22`
                    : colors.background,
              },
            ]}
          >
            <Text style={[styles.optionText, { color: colors.text }]}>
              High School
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.body, { color: colors.subtitle }]}>
          Primary mode calculates final speed. High School mode also calculates
          acceleration, net force, drag force, and g-force.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Video Evidence and Slow-Motion Review
        </Text>

        <Text style={[styles.body, { color: colors.subtitle }]}>
          Record or choose a video of the parachute drop. Replay it slowly to
          identify when the toy first hits the ground and when it stops moving.
        </Text>

        <View style={styles.buttonRow}>
          <Pressable
            onPress={recordVideoEvidence}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              Record Video
            </Text>
          </Pressable>

          <Pressable
            onPress={chooseVideoEvidence}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: colors.border },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
              Choose Video
            </Text>
          </Pressable>
        </View>

        {videoUri && (
          <View style={styles.videoSection}>
            <Text style={[styles.videoAttachedText, { color: colors.success }]}>
              Video evidence attached.
            </Text>

            <Video
              source={{ uri: videoUri }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              rate={playbackRate}
              shouldCorrectPitch={false}
            />

            <Text style={[styles.label, { color: colors.text }]}>
              Playback Speed
            </Text>

            <View style={styles.optionRow}>
              <Pressable
                onPress={() => setPlaybackRate(1)}
                style={[
                  styles.optionButton,
                  {
                    borderColor:
                      playbackRate === 1 ? colors.tint : colors.border,
                    backgroundColor:
                      playbackRate === 1
                        ? `${colors.tint}22`
                        : colors.background,
                  },
                ]}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>
                  1x
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setPlaybackRate(0.5)}
                style={[
                  styles.optionButton,
                  {
                    borderColor:
                      playbackRate === 0.5 ? colors.tint : colors.border,
                    backgroundColor:
                      playbackRate === 0.5
                        ? `${colors.tint}22`
                        : colors.background,
                  },
                ]}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>
                  0.5x
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setPlaybackRate(0.25)}
                style={[
                  styles.optionButton,
                  {
                    borderColor:
                      playbackRate === 0.25 ? colors.tint : colors.border,
                    backgroundColor:
                      playbackRate === 0.25
                        ? `${colors.tint}22`
                        : colors.background,
                  },
                ]}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>
                  0.25x
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.helperText, { color: colors.subtitle }]}>
              Use 0.25x or 0.5x speed to measure the time from first ground
              contact until the toy stops moving.
            </Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Design and Measurements
        </Text>

        <TextInput
          value={designName}
          onChangeText={setDesignName}
          placeholder="Design name, e.g. Plastic parachute"
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
          placeholder="Prediction: which design will be best?"
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
          value={sketchDescription}
          onChangeText={setSketchDescription}
          placeholder="Sketch/design description"
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
          value={dropHeight}
          onChangeText={setDropHeight}
          placeholder="Drop height in metres"
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
          value={predictedTime}
          onChangeText={setPredictedTime}
          placeholder="Predicted time to hit ground in seconds"
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
          value={timeToGround}
          onChangeText={setTimeToGround}
          placeholder="Actual time to first hit ground in seconds"
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

        {studentLevel === 'high' && (
          <>
            <TextInput
              value={toyMass}
              onChangeText={setToyMass}
              placeholder="Toy mass in kg"
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
              value={contactTime}
              onChangeText={setContactTime}
              placeholder="Contact/stopping time from slow-motion video"
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

            <Text style={[styles.helperText, { color: colors.subtitle }]}>
              Measure the time from first ground contact until the toy stops
              moving using the slow-motion video review above.
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>
              Did the toy bounce?
            </Text>

            <View style={styles.optionRow}>
              <Pressable
                onPress={() => setBounceType('no-bounce')}
                style={[
                  styles.optionButton,
                  {
                    borderColor:
                      bounceType === 'no-bounce'
                        ? colors.tint
                        : colors.border,
                    backgroundColor:
                      bounceType === 'no-bounce'
                        ? `${colors.tint}22`
                        : colors.background,
                  },
                ]}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>
                  No Bounce
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setBounceType('bounce')}
                style={[
                  styles.optionButton,
                  {
                    borderColor:
                      bounceType === 'bounce' ? colors.tint : colors.border,
                    backgroundColor:
                      bounceType === 'bounce'
                        ? `${colors.tint}22`
                        : colors.background,
                  },
                ]}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>
                  Bounce
                </Text>
              </Pressable>
            </View>

            {bounceType === 'bounce' && (
              <TextInput
                value={reboundTime}
                onChangeText={setReboundTime}
                placeholder="Time to maximum rebound height in seconds"
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
            )}
          </>
        )}

        <TextInput
          value={reflection}
          onChangeText={setReflection}
          placeholder="Reflection: Were you correct? What was easiest to make?"
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

        <View style={styles.buttonRow}>
          <Pressable
            onPress={calculateResult}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.tint },
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
              Calculate Result
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
            No attempts yet. Complete a parachute test to compare designs.
          </Text>
        ) : (
          results.map((result) => (
            <View
              key={result.id}
              style={[styles.resultRow, { borderColor: colors.border }]}
            >
              <Text style={[styles.resultTitle, { color: colors.text }]}>
                {result.designName}
              </Text>

              <Text style={[styles.body, { color: colors.subtitle }]}>
                Level:{' '}
                {result.studentLevel === 'primary'
                  ? 'Primary School'
                  : 'High School'}
              </Text>

              <Text style={[styles.body, { color: colors.subtitle }]}>
                Prediction: {result.prediction}
              </Text>

              <Text style={[styles.body, { color: colors.subtitle }]}>
                Predicted time: {result.predictedTime.toFixed(2)} s
              </Text>

              <Text style={[styles.body, { color: colors.subtitle }]}>
                Actual time: {result.timeToGround.toFixed(2)} s
              </Text>

              <Text style={[styles.body, { color: colors.subtitle }]}>
                Prediction difference: {result.predictionDifference.toFixed(2)} s
              </Text>

              <Text style={[styles.score, { color: colors.success }]}>
                Final speed: {result.finalSpeed.toFixed(2)} m/s
              </Text>

              {result.studentLevel === 'primary' && (
                <Text style={[styles.body, { color: colors.subtitle }]}>
                  Primary focus: measure time and calculate final speed.
                </Text>
              )}

              {result.studentLevel === 'high' && (
                <>
                  <Text style={[styles.body, { color: colors.subtitle }]}>
                    Acceleration: {result.acceleration.toFixed(2)} m/s²
                  </Text>

                  <Text style={[styles.body, { color: colors.subtitle }]}>
                    Net force: {result.netForce.toFixed(2)} N
                  </Text>

                  <Text style={[styles.body, { color: colors.subtitle }]}>
                    Weight: {result.weight.toFixed(2)} N
                  </Text>

                  <Text style={[styles.body, { color: colors.subtitle }]}>
                    Drag force: {result.dragForce.toFixed(2)} N
                  </Text>

                  {result.bounceType === 'bounce' && (
                    <Text style={[styles.body, { color: colors.subtitle }]}>
                      Upward rebound velocity:{' '}
                      {result.upwardVelocity.toFixed(2)} m/s
                    </Text>
                  )}

                  <Text style={[styles.score, { color: colors.success }]}>
                    G-force: {result.gForce.toFixed(2)}g
                  </Text>

                  <Text style={[styles.body, { color: colors.subtitle }]}>
                    Risk: {result.riskCategory}
                  </Text>
                </>
              )}

              {result.videoUri && (
                <Text style={[styles.videoAttachedText, { color: colors.success }]}>
                  Video evidence attached.
                </Text>
              )}
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
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '900' },
  subtitle: { marginTop: 8, fontSize: 16, lineHeight: 22 },
  card: { borderWidth: 1, borderRadius: 22, padding: 18, marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 22 },
  label: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
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
    marginTop: -6,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  optionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    alignItems: 'center',
  },
  optionText: { fontSize: 15, fontWeight: '800' },
  buttonRow: { gap: 10 },
  button: {
    minHeight: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  buttonText: { fontSize: 16, fontWeight: '800' },
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
  secondaryButtonText: { fontSize: 15, fontWeight: '800' },
  resultRow: { borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  resultTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  score: { marginTop: 4, fontSize: 15, fontWeight: '900' },
  videoAttachedText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '800',
  },
  videoSection: {
    marginTop: 14,
  },
  video: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 14,
    backgroundColor: '#000000',
  },
});