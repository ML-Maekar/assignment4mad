import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { saveActivityResultToFirestore } from '@/services/activityFirestoreService';
import { saveActivityResult } from '@/utils/activityResultsDb';
import { getActivityLocation } from '@/utils/locationService';
import {
  getLocalTeamProfile,
  getStudentLevelFromGrade,
} from '@/utils/teamProfileStorage';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const PARACHUTE_DEMO_IMAGE = require('../assets/images/activity 1 image.png');

type TabKey = 'activity' | 'writeup' | 'discussion';
type StudentLevel = 'primary' | 'high';
type DropType = 'baseline' | 'prototype';
type BounceType = 'no-bounce' | 'bounce';

type WriteUpRecord = {
  id: number;
  label: string;
  designName: string;
  prediction: string;
  designNotes: string;
  predictedTime: string;
  actualTime: string;
  wasPredictionCorrect: string;
  stoppingTime: string;
  easiestDesign: string;
};

type Result = {
  id: number;
  label: string;
  designName: string;
  finalSpeed: number;
  acceleration: number | null;
  netForce: number | null;
  weight: number | null;
  dragForce: number | null;
  gForce: number | null;
  safetyMessage: string;
};

const PLAYBACK_SPEEDS = [1, 0.5, 0.25, 0.125, 0.1];

function getDropLabel(dropType: DropType, prototypeNumber: number) {
  if (dropType === 'baseline') {
    return 'Action 1: No parachute baseline';
  }

  return `Prototype ${prototypeNumber}`;
}

function getSafetyMessage(gForce: number | null) {
  if (gForce === null) {
    return 'Primary calculation complete: final speed calculated.';
  }

  if (gForce <= 5) return '1–5 g: No injury';
  if (gForce <= 10) return '5–10 g: Possible bruising or strains';
  if (gForce <= 30) return '10–30 g: Serious injuries possible';
  if (gForce <= 50) return '30–50 g: High risk of severe injury';

  return '50+ g: Life-threatening injuries likely';
}

export default function ActivityOneGame() {
  const { colors } = useAppTheme();

  const [activeTab, setActiveTab] = useState<TabKey>('activity');

  const [studentLevel, setStudentLevel] = useState<StudentLevel>('primary');
  const [teamGradeLevel, setTeamGradeLevel] = useState('');

  const [dropType, setDropType] = useState<DropType>('baseline');
  const [prototypeNumber, setPrototypeNumber] = useState(1);
  const [bounceType, setBounceType] = useState<BounceType>('no-bounce');

  const [designName, setDesignName] = useState('');
  const [prediction, setPrediction] = useState('');
  const [designNotes, setDesignNotes] = useState('');
  const [easiestDesign, setEasiestDesign] = useState('');

  const [dropHeight, setDropHeight] = useState('');
  const [predictedTime, setPredictedTime] = useState('');
  const [actualTime, setActualTime] = useState('');
  const [wasPredictionCorrect, setWasPredictionCorrect] = useState('');
  const [stoppingTime, setStoppingTime] = useState('');

  const [toyMass, setToyMass] = useState('');
  const [reboundTime, setReboundTime] = useState('');

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoZoom, setVideoZoom] = useState(1);

  const [savedWriteUps, setSavedWriteUps] = useState<WriteUpRecord[]>([]);
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const [savedResultId, setSavedResultId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadTeamProfile() {
      const teamProfile = await getLocalTeamProfile();

      if (!teamProfile) {
        return;
      }

      setTeamGradeLevel(teamProfile.gradeLevel);
      setStudentLevel(getStudentLevelFromGrade(teamProfile.gradeLevel));
    }

    loadTeamProfile();
  }, []);

  const latestWriteUp = savedWriteUps[0];

  const zoomInVideo = () => {
    setVideoZoom((currentZoom) => Math.min(currentZoom + 0.25, 3));
  };

  const zoomOutVideo = () => {
    setVideoZoom((currentZoom) => Math.max(currentZoom - 0.25, 1));
  };

  const resetVideoZoom = () => {
    setVideoZoom(1);
  };

  const recordVideoEvidence = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Camera Permission Needed',
        'Please allow camera access to record the parachute drop.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 45,
    });

    if (!result.canceled) {
      setVideoUri(result.assets[0].uri);
      setVideoZoom(1);
    }
  };

  const chooseVideoEvidence = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Media Permission Needed',
        'Please allow gallery access to choose a video.'
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
      setVideoZoom(1);
    }
  };

  const saveWriteUp = () => {
    if (!designName.trim()) {
      Alert.alert('Missing Design Name', 'Please enter the design name.');
      return;
    }

    if (!prediction.trim()) {
      Alert.alert('Missing Prediction', 'Please enter your prediction.');
      return;
    }

    if (!designNotes.trim()) {
      Alert.alert('Missing Design Notes', 'Please enter design or sketch notes.');
      return;
    }

    const label = getDropLabel(dropType, prototypeNumber);

    const newWriteUp: WriteUpRecord = {
      id: Date.now(),
      label,
      designName: designName.trim(),
      prediction: prediction.trim(),
      designNotes: designNotes.trim(),
      predictedTime: predictedTime.trim(),
      actualTime: actualTime.trim(),
      wasPredictionCorrect: wasPredictionCorrect.trim(),
      stoppingTime: stoppingTime.trim(),
      easiestDesign: easiestDesign.trim(),
    };

    setSavedWriteUps((currentWriteUps) => [newWriteUp, ...currentWriteUps]);

    setDesignName('');
    setPrediction('');
    setDesignNotes('');
    setPredictedTime('');
    setActualTime('');
    setWasPredictionCorrect('');
    setStoppingTime('');
    setEasiestDesign('');

    Alert.alert('Write-Up Saved', `${label} write-up has been saved.`);
  };

  const calculateAndSaveResult = async () => {
    if (savedResultId !== null) {
      Alert.alert(
        'Result Already Saved',
        'This final result has already been saved. Press Clear Test to start a new result.'
      );
      return;
    }

    const finalDesignName = designName.trim() || latestWriteUp?.designName || '';
    const finalPrediction = prediction.trim() || latestWriteUp?.prediction || '';
    const finalDesignNotes = designNotes.trim() || latestWriteUp?.designNotes || '';
    const finalPredictedTime =
      predictedTime.trim() || latestWriteUp?.predictedTime || '';
    const finalActualTime = actualTime.trim() || latestWriteUp?.actualTime || '';
    const finalWasPredictionCorrect =
      wasPredictionCorrect.trim() || latestWriteUp?.wasPredictionCorrect || '';
    const finalStoppingTime =
      stoppingTime.trim() || latestWriteUp?.stoppingTime || '';
    const finalEasiestDesign =
      easiestDesign.trim() || latestWriteUp?.easiestDesign || '';

    const dropHeightValue = Number(dropHeight);
    const predictedTimeValue = Number(finalPredictedTime);
    const actualTimeValue = Number(finalActualTime);
    const stoppingTimeValue = Number(finalStoppingTime);
    const toyMassValue = Number(toyMass);
    const reboundTimeValue = Number(reboundTime);

    if (!finalDesignName) {
      Alert.alert(
        'Missing Design Name',
        'Please save a write-up first or enter the design name.'
      );
      return;
    }

    if (!finalPrediction) {
      Alert.alert(
        'Missing Prediction',
        'Please save a write-up first or enter your prediction.'
      );
      return;
    }

    if (!finalDesignNotes) {
      Alert.alert(
        'Missing Design Notes',
        'Please save a write-up first or enter design notes.'
      );
      return;
    }

    if (Number.isNaN(dropHeightValue) || dropHeightValue <= 0) {
      Alert.alert('Invalid Drop Height', 'Please enter the drop height in metres.');
      return;
    }

    if (Number.isNaN(actualTimeValue) || actualTimeValue <= 0) {
      Alert.alert(
        'Invalid Time',
        'Please enter the time to first hit the ground, or save it in the Write Up tab.'
      );
      return;
    }

    if (
      finalPredictedTime &&
      (Number.isNaN(predictedTimeValue) || predictedTimeValue <= 0)
    ) {
      Alert.alert('Invalid Prediction Time', 'Please enter a valid predicted time.');
      return;
    }

    if (!finalWasPredictionCorrect) {
      Alert.alert(
        'Missing Answer',
        'Please enter whether your prediction was correct.'
      );
      return;
    }

    if (studentLevel === 'high') {
      if (Number.isNaN(toyMassValue) || toyMassValue <= 0) {
        Alert.alert('Invalid Mass', 'Please enter the toy mass in kg.');
        return;
      }

      if (Number.isNaN(stoppingTimeValue) || stoppingTimeValue <= 0) {
        Alert.alert(
          'Invalid Stopping Time',
          'Please enter the time from first hit to stop moving using slow motion.'
        );
        return;
      }

      if (
        bounceType === 'bounce' &&
        (Number.isNaN(reboundTimeValue) || reboundTimeValue <= 0)
      ) {
        Alert.alert(
          'Invalid Rebound Time',
          'Please enter rebound time if the toy bounced.'
        );
        return;
      }
    }

    try {
      setIsSaving(true);

      const finalSpeed = dropHeightValue / actualTimeValue;

      const acceleration =
        studentLevel === 'high' ? finalSpeed / actualTimeValue : null;

      const netForce =
        studentLevel === 'high' && acceleration !== null
          ? toyMassValue * acceleration
          : null;

      const weight = studentLevel === 'high' ? toyMassValue * 9.8 : null;

      const dragForce =
        studentLevel === 'high' && weight !== null && netForce !== null
          ? weight - netForce
          : null;

      const upwardVelocity =
        studentLevel === 'high' && bounceType === 'bounce'
          ? 9.8 * reboundTimeValue
          : 0;

      const gForce =
        studentLevel === 'high'
          ? (finalSpeed + upwardVelocity) / stoppingTimeValue / 9.8
          : null;

      const safetyMessage = getSafetyMessage(gForce);

      const score =
        gForce !== null
          ? Math.max(0, 100 - gForce * 2)
          : Math.max(0, finalSpeed * 10);

      const label = getDropLabel(dropType, prototypeNumber);
      const locationData = await getActivityLocation();

      const resultData = {
        resultType: 'overall-test-result',
        tabLayout: 'Activity | Write Up | Discussion',
        location: locationData,
        teamGradeLevel,
        studentLevel,
        dropType,
        prototypeNumber: dropType === 'prototype' ? prototypeNumber : null,
        designName: finalDesignName,
        prediction: finalPrediction,
        designNotes: finalDesignNotes,
        easiestDesign: finalEasiestDesign,
        savedWriteUps,
        dropHeightMetres: dropHeightValue,
        predictedTimeSeconds: finalPredictedTime ? predictedTimeValue : null,
        actualTimeToFirstHitGroundSeconds: actualTimeValue,
        wasPredictionCorrect: finalWasPredictionCorrect,
        stoppingTimeSeconds: studentLevel === 'high' ? stoppingTimeValue : null,
        finalSpeedMetresPerSecond: finalSpeed,
        toyMassKg: studentLevel === 'high' ? toyMassValue : null,
        accelerationMetresPerSecondSquared: acceleration,
        netForceNewtons: netForce,
        weightNewtons: weight,
        dragForceNewtons: dragForce,
        bounceType: studentLevel === 'high' ? bounceType : null,
        reboundTimeSeconds:
          studentLevel === 'high' && bounceType === 'bounce'
            ? reboundTimeValue
            : null,
        gForce,
        safetyMessage,
        videoUri,
        playbackRate,
        videoZoom,
        formulaPrimary: 'speed = distance ÷ time',
        formulaAcceleration: 'acceleration = velocity ÷ time',
        formulaNetForce: 'net force = mass × acceleration',
        formulaWeight: 'weight = mass × 9.8',
        formulaDrag: 'drag force = weight − net force',
        formulaGForce: 'g-force = change in velocity ÷ contact time ÷ 9.8',
      };

      const resultId = await saveActivityResult({
        activityKey: 'activity-one',
        activityTitle: 'Parachute Drop Challenge',
        label,
        score,
        data: resultData,
      });

      try {
        await saveActivityResultToFirestore({
          localResultId: resultId,
          activityKey: 'activity-one',
          activityTitle: 'Parachute Drop Challenge',
          label,
          score,
          data: resultData,
        });
      } catch (firestoreError) {
        console.log('Activity 1 saved locally but Firestore failed:', firestoreError);
        Alert.alert(
          'Saved Locally',
          'The result was saved to Result History, but Firestore upload failed. Check Firebase rules or internet connection.'
        );
      }

      const savedResult: Result = {
        id: resultId,
        label,
        designName: finalDesignName,
        finalSpeed,
        acceleration,
        netForce,
        weight,
        dragForce,
        gForce,
        safetyMessage,
      };

      setSavedResultId(resultId);
      setLastResult(savedResult);

      Alert.alert(
        'Overall Result Saved',
        `Saved to Result History and Firestore.\nSpeed: ${finalSpeed.toFixed(
          2
        )} m/s\n${safetyMessage}`
      );
    } catch (error) {
      console.log('Failed to save Activity 1 result:', error);
      Alert.alert('Save Failed', 'The parachute result could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearTest = () => {
    setDropType('baseline');
    setPrototypeNumber(1);
    setBounceType('no-bounce');
    setDesignName('');
    setPrediction('');
    setDesignNotes('');
    setEasiestDesign('');
    setDropHeight('');
    setPredictedTime('');
    setActualTime('');
    setWasPredictionCorrect('');
    setStoppingTime('');
    setToyMass('');
    setReboundTime('');
    setVideoUri(null);
    setPlaybackRate(1);
    setVideoZoom(1);
    setSavedWriteUps([]);
    setLastResult(null);
    setSavedResultId(null);
    setActiveTab('activity');
  };

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
        source={PARACHUTE_DEMO_IMAGE}
        style={styles.demoImage}
        resizeMode="contain"
      />

      <Text style={[styles.body, { color: colors.subtitle }]}>
        Place the phone where it can capture the full drop, including the toy,
        parachute, table, and landing area.
      </Text>

      <View style={styles.mediaButtonRow}>
        <Pressable
          onPress={recordVideoEvidence}
          style={({ pressed }) => [
            styles.smallButton,
            { backgroundColor: colors.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.smallButtonText, { color: colors.buttonText }]}>
            Record Video
          </Text>
        </Pressable>

        <Pressable
          onPress={chooseVideoEvidence}
          style={({ pressed }) => [
            styles.smallOutlineButton,
            { borderColor: colors.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.smallButtonText, { color: colors.tint }]}>
            Choose Video
          </Text>
        </Pressable>
      </View>

      {videoUri ? (
        <>
          <View style={styles.videoFrame}>
            <Video
              source={{ uri: videoUri }}
              style={[styles.video, { transform: [{ scale: videoZoom }] }]}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              rate={playbackRate}
              shouldPlay={false}
            />
          </View>

          <Text style={[styles.label, { color: colors.text }]}>
            Slow-Motion Playback
          </Text>

          <View style={styles.speedRow}>
            {PLAYBACK_SPEEDS.map((speed) => {
              const selected = playbackRate === speed;

              return (
                <Pressable
                  key={speed}
                  onPress={() => setPlaybackRate(speed)}
                  style={({ pressed }) => [
                    styles.speedButton,
                    {
                      borderColor: selected ? colors.tint : colors.border,
                      backgroundColor: selected
                        ? `${colors.tint}20`
                        : colors.background,
                    },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.speedText,
                      { color: selected ? colors.tint : colors.text },
                    ]}
                  >
                    {speed}x
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Video Zoom</Text>

          <View style={styles.speedRow}>
            <Pressable
              onPress={zoomOutVideo}
              style={({ pressed }) => [
                styles.speedButton,
                { borderColor: colors.border, backgroundColor: colors.background },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.speedText, { color: colors.text }]}>
                Zoom -
              </Text>
            </Pressable>

            <Pressable
              onPress={resetVideoZoom}
              style={({ pressed }) => [
                styles.speedButton,
                { borderColor: colors.border, backgroundColor: colors.background },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.speedText, { color: colors.text }]}>
                {videoZoom.toFixed(2)}x
              </Text>
            </Pressable>

            <Pressable
              onPress={zoomInVideo}
              style={({ pressed }) => [
                styles.speedButton,
                { borderColor: colors.border, backgroundColor: colors.background },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.speedText, { color: colors.text }]}>
                Zoom +
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

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

      <Text style={[styles.body, { color: colors.subtitle }]}>
        Save one write-up for each baseline/prototype. After saving, the boxes
        clear so the same write-up is not saved again.
      </Text>

      <Text style={[styles.label, { color: colors.text }]}>Action Type</Text>

      <View style={styles.optionRow}>
        {(['baseline', 'prototype'] as DropType[]).map((type) => {
          const selected = dropType === type;

          return (
            <Pressable
              key={type}
              onPress={() => setDropType(type)}
              style={({ pressed }) => [
                styles.optionButton,
                {
                  borderColor: selected ? colors.tint : colors.border,
                  backgroundColor: selected
                    ? `${colors.tint}20`
                    : colors.background,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: selected ? colors.tint : colors.text },
                ]}
              >
                {type === 'baseline' ? 'No Parachute' : 'Parachute Prototype'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {dropType === 'prototype' && (
        <>
          <Text style={[styles.label, { color: colors.text }]}>
            Prototype Number
          </Text>

          <View style={styles.optionRow}>
            {[1, 2, 3].map((number) => {
              const selected = prototypeNumber === number;

              return (
                <Pressable
                  key={number}
                  onPress={() => setPrototypeNumber(number)}
                  style={({ pressed }) => [
                    styles.smallChoice,
                    {
                      borderColor: selected ? colors.tint : colors.border,
                      backgroundColor: selected
                        ? `${colors.tint}20`
                        : colors.background,
                    },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: selected ? colors.tint : colors.text },
                    ]}
                  >
                    {number}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <TextInput
        value={designName}
        onChangeText={setDesignName}
        placeholder="Design name, e.g. plastic with four strings"
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
        placeholder="Predict which design was best"
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
        value={designNotes}
        onChangeText={setDesignNotes}
        placeholder="Sketch/design notes"
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
        value={predictedTime}
        onChangeText={setPredictedTime}
        placeholder="How long will it take to hit the ground? seconds"
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
        value={actualTime}
        onChangeText={setActualTime}
        placeholder="Time to first hit ground in seconds"
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
        value={stoppingTime}
        onChangeText={setStoppingTime}
        placeholder="Time from first hit to stop moving, from slow motion"
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
        value={easiestDesign}
        onChangeText={setEasiestDesign}
        placeholder="What design was easiest to make?"
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

      <Pressable
        onPress={saveWriteUp}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.tint },
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.buttonText }]}>
          Save Write-Up
        </Text>
      </Pressable>

      {savedWriteUps.length > 0 && (
        <View style={[styles.resultBox, { borderColor: colors.border }]}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            Saved Write-Ups
          </Text>

          {savedWriteUps.map((writeUp) => (
            <Text
              key={writeUp.id}
              style={[styles.body, { color: colors.subtitle }]}
            >
              {writeUp.label}: {writeUp.designName}
            </Text>
          ))}
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
          Team grade/year level: {teamGradeLevel || 'Not selected'}
        </Text>

        <Text style={[styles.body, { color: colors.subtitle }]}>
          This activity is using:{' '}
          {studentLevel === 'primary' ? 'Primary School' : 'High School'} calculations.
        </Text>

        {studentLevel === 'primary' ? (
          <>
            <Text style={[styles.body, { color: colors.subtitle }]}>
              Primary students calculate time to ground and final speed.
            </Text>
            <Text style={[styles.body, { color: colors.subtitle }]}>
              Final speed = drop height ÷ time.
            </Text>
          </>
        ) : (
          <Text style={[styles.body, { color: colors.subtitle }]}>
            High School students calculate velocity, acceleration, force, drag,
            and g-force using slow-motion impact time.
          </Text>
        )}
      </View>

      {latestWriteUp && (
        <View style={[styles.resultBox, { borderColor: colors.border }]}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            Latest Saved Write-Up Used for Result
          </Text>

          <Text style={[styles.body, { color: colors.subtitle }]}>
            {latestWriteUp.label}: {latestWriteUp.designName}
          </Text>
        </View>
      )}

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

          <Text style={[styles.label, { color: colors.text }]}>Landing Type</Text>

          <View style={styles.optionRow}>
            {(['no-bounce', 'bounce'] as BounceType[]).map((type) => {
              const selected = bounceType === type;

              return (
                <Pressable
                  key={type}
                  onPress={() => setBounceType(type)}
                  style={({ pressed }) => [
                    styles.optionButton,
                    {
                      borderColor: selected ? colors.tint : colors.border,
                      backgroundColor: selected
                        ? `${colors.tint}20`
                        : colors.background,
                    },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: selected ? colors.tint : colors.text },
                    ]}
                  >
                    {type === 'no-bounce' ? 'No Bounce' : 'Bounce'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {bounceType === 'bounce' && (
            <TextInput
              value={reboundTime}
              onChangeText={setReboundTime}
              placeholder="Rebound time to highest point in seconds"
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

      {savedResultId === null ? (
        <Pressable
          onPress={calculateAndSaveResult}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.tint },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>
            {isSaving ? 'Saving...' : 'Calculate and Save Overall Result'}
          </Text>
        </Pressable>
      ) : (
        <Text style={[styles.savedText, { color: colors.success }]}>
          Overall result saved to Result History.
        </Text>
      )}

      {lastResult && (
        <View style={[styles.resultBox, { borderColor: colors.border }]}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>
            {lastResult.label}
          </Text>

          <Text style={[styles.body, { color: colors.subtitle }]}>
            Design: {lastResult.designName}
          </Text>

          <Text style={[styles.score, { color: colors.success }]}>
            Final speed: {lastResult.finalSpeed.toFixed(2)} m/s
          </Text>

          {lastResult.gForce !== null && (
            <Text style={[styles.body, { color: colors.subtitle }]}>
              G-force: {lastResult.gForce.toFixed(2)} g
            </Text>
          )}

          <Text style={[styles.body, { color: colors.subtitle }]}>
            Safety: {lastResult.safetyMessage}
          </Text>
        </View>
      )}

      <Pressable
        onPress={() =>
          router.push('/result-history?activityKey=activity-one' as never)
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

      {renderTabs()}
    </View>
  );

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Parachute Drop Challenge
        </Text>

        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Record the drop, save write-ups, then save one overall result.
        </Text>
      </View>

      {activeTab === 'activity' && renderActivityTab()}
      {activeTab === 'writeup' && renderWriteUpTab()}
      {activeTab === 'discussion' && renderDiscussionTab()}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900' },
  subtitle: { marginTop: 8, fontSize: 16, lineHeight: 22 },
  phoneLayoutCard: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    minHeight: 620,
  },
  recordHeader: { alignItems: 'flex-end', marginBottom: 16 },
  recordText: { fontSize: 24, fontWeight: '500' },
  demoImage: { width: '100%', height: 260, marginBottom: 18 },
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
  bottomTabText: { fontSize: 13, fontWeight: '700' },
  cardTitle: { fontSize: 20, fontWeight: '900', marginBottom: 12 },
  label: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  multilineInput: { minHeight: 90, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  optionButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  smallChoice: {
    width: 58,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: { fontSize: 14, fontWeight: '900' },
  mediaButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    marginBottom: 12,
  },
  smallButton: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallOutlineButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallButtonText: { fontSize: 13, fontWeight: '900' },
  videoFrame: {
    width: '100%',
    height: 230,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  video: { width: '100%', height: 230 },
  speedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  speedButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  speedText: { fontSize: 13, fontWeight: '900' },
  formulaBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    gap: 6,
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
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  buttonText: { fontSize: 16, fontWeight: '900' },
  secondaryButtonText: { fontSize: 15, fontWeight: '900' },
  savedText: {
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 12,
  },
  resultBox: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 14,
  },
  resultTitle: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  score: { marginTop: 4, fontSize: 15, fontWeight: '900' },
});
