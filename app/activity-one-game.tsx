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

import AppScreen from '@/components/AppScreen';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { saveAttempt } from '@/services/attemptService';
import { saveVideoEvidence } from '@/services/videoStorageService';
import { scheduleActivityCompleteNotification } from '@/utils/notifications';
import {
  getLocalTeamProfile,
  getStudentLevelFromGrade,
} from '@/utils/teamProfileStorage';

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

const ACTIVITY_KEY = 'activity-one';
const ACTIVITY_TITLE = 'Parachute Drop Challenge';
const PLAYBACK_SPEEDS = [1, 0.5, 0.25, 0.125, 0.1];

function getDropLabel(dropType: DropType, prototypeNumber: number) {
  if (dropType === 'baseline') return 'Action 1: No parachute baseline';
  return `Prototype ${prototypeNumber}`;
}

function getSafetyMessage(gForce: number | null) {
  if (gForce === null) return 'Primary calculation complete: final speed calculated.';
  if (gForce <= 5) return '1–5 g: No injury';
  if (gForce <= 10) return '5–10 g: Possible bruising or strains';
  if (gForce <= 30) return '10–30 g: Serious injuries possible';
  if (gForce <= 50) return '30–50 g: High risk of severe injury';
  return '50+ g: Life-threatening injuries likely';
}

export default function ActivityOneGame() {
  const { colors } = useAppTheme();
  // FIX: destructure both cameraGranted AND mediaLibraryGranted from context.
  // Previously chooseVideoEvidence was incorrectly checking cameraGranted
  // for a gallery-pick operation — it must check mediaLibraryGranted.
  const { cameraGranted, mediaLibraryGranted } = usePermissions();

  const [activeTab, setActiveTab] = useState<TabKey>('activity');
  const [studentLevel, setStudentLevel] = useState<StudentLevel>('primary');
  const [teamGradeLevel, setTeamGradeLevel] = useState('');

  const [dropType, setDropType] = useState<DropType>('baseline');
  const [prototypeNumber, setPrototypeNumber] = useState(1);
  const [bounceType, setBounceType] = useState<BounceType>('no-bounce');

  // Shared design name field — persists across tabs so Write Up and Activity
  // tabs always show the same value. DO NOT clear it inside saveWriteUp().
  const [designName, setDesignName] = useState('');
  const [prediction, setPrediction] = useState('');
  const [designNotes, setDesignNotes] = useState('');
  const [easiestDesign, setEasiestDesign] = useState('');
  const [surprises, setSurprises] = useState('');

  const [dropHeight, setDropHeight] = useState('');
  const [predictedTime, setPredictedTime] = useState('');
  const [actualTime, setActualTime] = useState('');
  const [wasPredictionCorrect, setWasPredictionCorrect] = useState('');
  const [stoppingTime, setStoppingTime] = useState('');
  const [toyMass, setToyMass] = useState('');
  const [reboundTime, setReboundTime] = useState('');

  const [videoUri, setVideoUri] = useState<string | null>(null);
  // Tracks the Firebase Storage URL after upload (null until uploaded)
  const [videoFirebaseUrl, setVideoFirebaseUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoZoom, setVideoZoom] = useState(1);
  const [isSavingVideo, setIsSavingVideo] = useState(false);

  const [savedWriteUps, setSavedWriteUps] = useState<WriteUpRecord[]>([]);
  const [writeUpSavedFlash, setWriteUpSavedFlash] = useState(false);
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadTeamProfile() {
      const teamProfile = await getLocalTeamProfile();
      if (!teamProfile) return;
      setTeamGradeLevel(teamProfile.gradeLevel);
      setStudentLevel(getStudentLevelFromGrade(teamProfile.gradeLevel));
    }
    loadTeamProfile();
  }, []);

  const zoomInVideo = () => setVideoZoom((z) => Math.min(z + 0.25, 3));
  const zoomOutVideo = () => setVideoZoom((z) => Math.max(z - 0.25, 1));
  const resetVideoZoom = () => setVideoZoom(1);

  // After recording: save to device gallery (if mediaLibraryGranted) and
  // upload to Firebase Storage. Both are best-effort — the local URI is
  // always kept in state so the video player still works even if saving fails.
  const handlePostRecordSave = async (uri: string) => {
    setIsSavingVideo(true);
    try {
      const { firebaseUrl } = await saveVideoEvidence({
        localUri: uri,
        activityKey: ACTIVITY_KEY,
        mediaLibraryGranted,
      });
      if (firebaseUrl) setVideoFirebaseUrl(firebaseUrl);
    } catch {
      // Silently fail — video is still usable from the local URI
    } finally {
      setIsSavingVideo(false);
    }
  };

  const recordVideoEvidence = async () => {
    if (!cameraGranted) {
      Alert.alert(
        'Camera Disabled',
        'Camera is turned off in Settings. Go to Settings → Permissions → Camera to enable it.'
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
      const uri = result.assets[0].uri;
      setVideoUri(uri);
      setVideoFirebaseUrl(null);
      setVideoZoom(1);
      // Save to gallery + Firebase in the background
      handlePostRecordSave(uri);
    }
  };

  // FIX: now correctly checks mediaLibraryGranted (not cameraGranted) because
  // choosing from the gallery requires Media Library permission, not Camera.
  const chooseVideoEvidence = async () => {
    if (!mediaLibraryGranted) {
      Alert.alert(
        'Media Storage Disabled',
        'Media Storage is turned off in Settings. Go to Settings → Permissions → Media Storage to enable it.'
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
      setVideoFirebaseUrl(null);
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

    setSavedWriteUps((current) => [newWriteUp, ...current]);

    // FIX: Do NOT clear designName here. The design name field is shared
    // between the Write Up tab and the Activity/Discussion tabs. Clearing it
    // after saveWriteUp() caused the "Missing Design Name" alert to fire on
    // the Calculate and Save button even though the user had already filled it in.
    // Only clear the other write-up-specific fields.
    setPrediction('');
    setDesignNotes('');
    setPredictedTime('');
    setActualTime('');
    setWasPredictionCorrect('');
    setStoppingTime('');
    setSurprises('');
    setEasiestDesign('');

    // Show ✓ flash for 2 seconds
    setWriteUpSavedFlash(true);
    setTimeout(() => setWriteUpSavedFlash(false), 2000);
  };

  const calculateAndSaveResult = async () => {
    const dropHeightValue = Number(dropHeight);
    const predictedTimeValue = Number(predictedTime);
    const actualTimeValue = Number(actualTime);
    const stoppingTimeValue = Number(stoppingTime);
    const toyMassValue = Number(toyMass);
    const reboundTimeValue = Number(reboundTime);

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
    if (Number.isNaN(dropHeightValue) || dropHeightValue <= 0) {
      Alert.alert('Invalid Drop Height', 'Please enter the drop height in metres.');
      return;
    }
    if (Number.isNaN(actualTimeValue) || actualTimeValue <= 0) {
      Alert.alert('Invalid Time', 'Please enter the time to first hit the ground.');
      return;
    }
    if (predictedTime.trim() && (Number.isNaN(predictedTimeValue) || predictedTimeValue <= 0)) {
      Alert.alert('Invalid Prediction Time', 'Please enter a valid predicted time.');
      return;
    }
    if (!wasPredictionCorrect.trim()) {
      Alert.alert('Missing Answer', 'Please enter whether your prediction was correct.');
      return;
    }
    if (studentLevel === 'high') {
      if (Number.isNaN(toyMassValue) || toyMassValue <= 0) {
        Alert.alert('Invalid Mass', 'Please enter the toy mass in kg.');
        return;
      }
      if (Number.isNaN(stoppingTimeValue) || stoppingTimeValue <= 0) {
        Alert.alert('Invalid Stopping Time', 'Please enter the stopping time using slow motion.');
        return;
      }
      if (bounceType === 'bounce' && (Number.isNaN(reboundTimeValue) || reboundTimeValue <= 0)) {
        Alert.alert('Invalid Rebound Time', 'Please enter rebound time if the toy bounced.');
        return;
      }
    }

    try {
      setIsSaving(true);

      const finalSpeed = dropHeightValue / actualTimeValue;
      const acceleration = studentLevel === 'high' ? finalSpeed / actualTimeValue : null;
      const netForce = studentLevel === 'high' && acceleration !== null ? toyMassValue * acceleration : null;
      const weight = studentLevel === 'high' ? toyMassValue * 9.8 : null;
      const dragForce = studentLevel === 'high' && weight !== null && netForce !== null ? weight - netForce : null;
      const upwardVelocity = studentLevel === 'high' && bounceType === 'bounce' ? 9.8 * reboundTimeValue : 0;
      const gForce = studentLevel === 'high' ? (finalSpeed + upwardVelocity) / stoppingTimeValue / 9.8 : null;
      const safetyMessage = getSafetyMessage(gForce);
      const score = gForce !== null
        ? Math.max(0, 100 - gForce * 2)
        : Math.max(0, finalSpeed * 10);
      const label = getDropLabel(dropType, prototypeNumber);

      const savedResultId = await saveAttempt({
        activityKey: ACTIVITY_KEY,
        activityTitle: ACTIVITY_TITLE,
        label,
        score,
        data: {
          teamGradeLevel,
          studentLevel,
          dropType,
          prototypeNumber: dropType === 'prototype' ? prototypeNumber : null,
          designName: designName.trim(),
          prediction: prediction.trim(),
          designNotes: designNotes.trim(),
          easiestDesign: easiestDesign.trim(),
          surprises: surprises.trim(),
          savedWriteUps,
          dropHeightMetres: dropHeightValue,
          predictedTimeSeconds: predictedTime.trim() ? predictedTimeValue : null,
          actualTimeToFirstHitGroundSeconds: actualTimeValue,
          wasPredictionCorrect: wasPredictionCorrect.trim(),
          stoppingTimeSeconds: studentLevel === 'high' ? stoppingTimeValue : null,
          finalSpeedMetresPerSecond: finalSpeed,
          toyMassKg: studentLevel === 'high' ? toyMassValue : null,
          accelerationMetresPerSecondSquared: acceleration,
          netForceNewtons: netForce,
          weightNewtons: weight,
          dragForceNewtons: dragForce,
          bounceType: studentLevel === 'high' ? bounceType : null,
          reboundTimeSeconds: studentLevel === 'high' && bounceType === 'bounce' ? reboundTimeValue : null,
          gForce,
          safetyMessage,
          // Include both the local URI and the Firebase Storage URL
          videoUri,
          videoFirebaseUrl,
          playbackRate,
          videoZoom,
        },
      });

      const savedResult: Result = {
        id: savedResultId,
        label,
        designName: designName.trim(),
        finalSpeed,
        acceleration,
        netForce,
        weight,
        dragForce,
        gForce,
        safetyMessage,
      };

      setLastResult(savedResult);

      await scheduleActivityCompleteNotification(ACTIVITY_TITLE);

      Alert.alert(
        'Result Saved',
        `Speed: ${finalSpeed.toFixed(2)} m/s\n${safetyMessage}`,
        [
          {
            text: 'View Summary',
            onPress: () => router.push(`/result-summary?resultId=${savedResultId}` as never),
          },
          { text: 'Stay Here', style: 'cancel' },
        ]
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
    setSurprises('');
    setDropHeight('');
    setPredictedTime('');
    setActualTime('');
    setWasPredictionCorrect('');
    setStoppingTime('');
    setToyMass('');
    setReboundTime('');
    setVideoUri(null);
    setVideoFirebaseUrl(null);
    setPlaybackRate(1);
    setVideoZoom(1);
    setSavedWriteUps([]);
    setLastResult(null);
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
                { borderBottomColor: selected ? colors.tint : 'transparent' },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.bottomTabText, { color: selected ? colors.tint : colors.subtitle }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderActivityTab = () => (
    <View style={[styles.phoneLayoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

      {!cameraGranted && (
        <View style={[styles.warningBanner, { backgroundColor: `${colors.danger}15`, borderColor: colors.danger }]}>
          <Text style={[styles.warningText, { color: colors.danger }]}>
            ⚠️ Camera is disabled. Go to Settings → Permissions → Camera to enable recording.
          </Text>
        </View>
      )}

      {!mediaLibraryGranted && (
        <View style={[styles.warningBanner, { backgroundColor: `${colors.warning}15`, borderColor: colors.warning }]}>
          <Text style={[styles.warningText, { color: colors.warning }]}>
            ⚠️ Media Storage is disabled. Go to Settings → Permissions → Media Storage to save videos to your gallery.
          </Text>
        </View>
      )}

      <Text style={[styles.cardTitle, { color: colors.text }]}>Instructions</Text>

      <View style={[styles.instructionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.body, { color: colors.subtitle }]}>1. Design and build a parachute for a small toy using available materials.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>2. First run with no parachute (baseline) — drop from table height.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>3. Position the phone to capture the full drop — toy, parachute, table and landing area.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>4. Record video using the buttons below, then use slow motion to measure timing.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>5. Zoom in to find: (a) time of release, (b) first hit on ground, (c) stop moving.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>6. Redesign and test up to 3 prototypes. Rotate for each team member.</Text>
      </View>

      <View style={[styles.diagramBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.diagramTitle, { color: colors.text }]}>Setup Diagram</Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>🧸 Toy with parachute attached</Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>↕ Dropped from table height</Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>📱 Phone positioned to capture full drop</Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>🎯 Landing area below</Text>
      </View>

      <Image source={PARACHUTE_DEMO_IMAGE} style={styles.demoImage} resizeMode="contain" />

      <Text style={[styles.body, { color: colors.subtitle }]}>
        Place the phone where it can capture the full drop, including the toy, parachute, table, and landing area.
      </Text>

      <View style={styles.mediaButtonRow}>
        <Pressable
          onPress={recordVideoEvidence}
          style={({ pressed }) => [
            styles.smallButton,
            { backgroundColor: cameraGranted ? colors.tint : colors.subtitle },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.smallButtonText, { color: colors.buttonText }]}>
            {cameraGranted ? 'Record Video' : 'Camera Off'}
          </Text>
        </Pressable>

        {/* FIX: Choose Video now checks mediaLibraryGranted, not cameraGranted */}
        <Pressable
          onPress={chooseVideoEvidence}
          style={({ pressed }) => [
            styles.smallOutlineButton,
            { borderColor: mediaLibraryGranted ? colors.tint : colors.subtitle },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.smallButtonText, { color: mediaLibraryGranted ? colors.tint : colors.subtitle }]}>
            {mediaLibraryGranted ? 'Choose Video' : 'Media Off'}
          </Text>
        </Pressable>
      </View>

      {isSavingVideo && (
        <Text style={[styles.body, { color: colors.subtitle, marginBottom: 8 }]}>
          💾 Saving video to gallery…
        </Text>
      )}

      {videoFirebaseUrl && (
        <Text style={[styles.body, { color: colors.success, marginBottom: 8 }]}>
          ☁️ Video backed up to cloud storage.
        </Text>
      )}

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

          <Text style={[styles.label, { color: colors.text }]}>Slow-Motion Playback</Text>
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
                      backgroundColor: selected ? `${colors.tint}20` : colors.background,
                    },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={[styles.speedText, { color: selected ? colors.tint : colors.text }]}>{speed}x</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>Video Zoom</Text>
          <View style={styles.speedRow}>
            <Pressable onPress={zoomOutVideo} style={({ pressed }) => [styles.speedButton, { borderColor: colors.border, backgroundColor: colors.background }, pressed && styles.buttonPressed]}>
              <Text style={[styles.speedText, { color: colors.text }]}>Zoom -</Text>
            </Pressable>
            <Pressable onPress={resetVideoZoom} style={({ pressed }) => [styles.speedButton, { borderColor: colors.border, backgroundColor: colors.background }, pressed && styles.buttonPressed]}>
              <Text style={[styles.speedText, { color: colors.text }]}>{videoZoom.toFixed(2)}x</Text>
            </Pressable>
            <Pressable onPress={zoomInVideo} style={({ pressed }) => [styles.speedButton, { borderColor: colors.border, backgroundColor: colors.background }, pressed && styles.buttonPressed]}>
              <Text style={[styles.speedText, { color: colors.text }]}>Zoom +</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {renderTabs()}
    </View>
  );

  const renderWriteUpTab = () => (
    <View style={[styles.phoneLayoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Write Up</Text>

      <Text style={[styles.body, { color: colors.subtitle }]}>
        Complete on paper or use the fields below. Rotate for each team member.
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
                  backgroundColor: selected ? `${colors.tint}20` : colors.background,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.optionText, { color: selected ? colors.tint : colors.text }]}>
                {type === 'baseline' ? 'No Parachute (Baseline)' : 'Parachute Prototype'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {dropType === 'prototype' && (
        <>
          <Text style={[styles.label, { color: colors.text }]}>Prototype Number</Text>
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
                      backgroundColor: selected ? `${colors.tint}20` : colors.background,
                    },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={[styles.optionText, { color: selected ? colors.tint : colors.text }]}>{number}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {/* Design name is shared — also visible in Activity/Discussion tab */}
      <TextInput value={designName} onChangeText={setDesignName} placeholder="Design name, e.g. plastic bag with four strings" placeholderTextColor={colors.subtitle} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
      <TextInput value={prediction} onChangeText={setPrediction} placeholder="Predict which design will slow the fall the most" placeholderTextColor={colors.subtitle} multiline style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
      <TextInput value={designNotes} onChangeText={setDesignNotes} placeholder="Sketch or design notes — materials used, shape, string length" placeholderTextColor={colors.subtitle} multiline style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />

      <Text style={[styles.label, { color: colors.text }]}>Results Table</Text>
      <View style={[styles.tableBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <View style={[styles.tableRow, { borderColor: colors.border }]}>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 2 }]}>Design</Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>Predicted (s)</Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>Actual (s)</Text>
        </View>
        {savedWriteUps.length === 0 ? (
          <Text style={[styles.body, { color: colors.subtitle, padding: 10 }]}>Save write-ups below to populate results here.</Text>
        ) : (
          savedWriteUps.map((writeUp) => (
            <View key={writeUp.id} style={[styles.tableRow, { borderColor: colors.border }]}>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={2}>{writeUp.designName}</Text>
              <Text style={[styles.tableCell, { color: colors.subtitle, flex: 1 }]}>{writeUp.predictedTime || '—'}</Text>
              <Text style={[styles.tableCell, { color: colors.subtitle, flex: 1 }]}>{writeUp.actualTime || '—'}</Text>
            </View>
          ))
        )}
      </View>

      <TextInput value={predictedTime} onChangeText={setPredictedTime} placeholder="Predicted time to hit ground (seconds)" placeholderTextColor={colors.subtitle} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
      <TextInput value={actualTime} onChangeText={setActualTime} placeholder="Actual time to first hit ground (seconds)" placeholderTextColor={colors.subtitle} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
      <TextInput value={wasPredictionCorrect} onChangeText={setWasPredictionCorrect} placeholder="Were you right? Explain why or why not." placeholderTextColor={colors.subtitle} multiline style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
      <TextInput value={stoppingTime} onChangeText={setStoppingTime} placeholder="Time from first hit to stop moving (slow motion)" placeholderTextColor={colors.subtitle} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
      <TextInput value={surprises} onChangeText={setSurprises} placeholder="Any surprises during the drop?" placeholderTextColor={colors.subtitle} multiline style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
      <TextInput value={easiestDesign} onChangeText={setEasiestDesign} placeholder="Which design was easiest to make and why?" placeholderTextColor={colors.subtitle} multiline style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />

      {writeUpSavedFlash ? (
        <View style={[styles.flashBox, { backgroundColor: `${colors.success}15`, borderColor: colors.success }]}>
          <Text style={[styles.flashText, { color: colors.success }]}>✓ Write-up saved</Text>
        </View>
      ) : (
        <Pressable
          onPress={saveWriteUp}
          style={({ pressed }) => [styles.button, { backgroundColor: colors.tint }, pressed && styles.buttonPressed]}
        >
          <Text style={[styles.buttonText, { color: colors.buttonText }]}>Save Write-Up</Text>
        </Pressable>
      )}

      {savedWriteUps.length > 0 && (
        <View style={[styles.resultBox, { borderColor: colors.border }]}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>Saved Write-Ups</Text>
          {savedWriteUps.map((writeUp) => (
            <Text key={writeUp.id} style={[styles.body, { color: colors.subtitle }]}>
              {writeUp.label}: {writeUp.designName}
            </Text>
          ))}
        </View>
      )}

      {renderTabs()}
    </View>
  );

  const renderDiscussionTab = () => (
    <View style={[styles.phoneLayoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Discussion</Text>

      <View style={[styles.discussionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.discussionHeading, { color: colors.text }]}>
          Team Level: {teamGradeLevel || 'Not selected'} — {studentLevel === 'primary' ? 'Primary School' : 'High School'} Calculations
        </Text>
        {studentLevel === 'primary' ? (
          <>
            <Text style={[styles.body, { color: colors.subtitle }]}>• Time to hit the ground</Text>
            <Text style={[styles.body, { color: colors.subtitle }]}>• Final speed = drop height ÷ time</Text>
          </>
        ) : (
          <>
            <Text style={[styles.body, { color: colors.subtitle }]}>• Final speed / velocity</Text>
            <Text style={[styles.body, { color: colors.subtitle }]}>• Acceleration = velocity ÷ time</Text>
            <Text style={[styles.body, { color: colors.subtitle }]}>• Net force = mass × acceleration</Text>
            <Text style={[styles.body, { color: colors.subtitle }]}>• Weight = mass × 9.8</Text>
            <Text style={[styles.body, { color: colors.subtitle }]}>• Drag force = weight − net force</Text>
            <Text style={[styles.body, { color: colors.subtitle }]}>• G-force = change in velocity ÷ contact time ÷ 9.8</Text>
          </>
        )}
      </View>

      <View style={[styles.discussionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.discussionHeading, { color: colors.text }]}>What is a Parachute Doing?</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>A parachute increases air resistance (drag force) which slows the fall. The larger the surface area, the more air it catches and the slower the descent.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>The goal is to achieve the slowest and safest landing — the lowest g-force on impact means the least injury risk to the toy.</Text>
      </View>

      <View style={[styles.discussionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.discussionHeading, { color: colors.text }]}>G-Force and Safety</Text>
        <View style={[styles.tableBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
          {[
            ['1–5 g', 'No injury'],
            ['5–10 g', 'Possible bruising or strains'],
            ['10–30 g', 'Serious injuries possible'],
            ['30–50 g', 'High risk of severe injury'],
            ['50+ g', 'Life-threatening injuries likely'],
          ].map(([range, risk]) => (
            <View key={range} style={[styles.tableRow, { borderColor: colors.border }]}>
              <Text style={[styles.tableCell, { color: colors.text, flex: 1 }]}>{range}</Text>
              <Text style={[styles.tableCell, { color: colors.subtitle, flex: 2 }]}>{risk}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.discussionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.discussionHeading, { color: colors.text }]}>Think About This</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• Which design slowed the fall the most?</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• Which design had the lowest g-force on impact?</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• What materials or shapes worked best?</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• What would you change with more time?</Text>
      </View>

      <View style={[styles.discussionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.discussionHeading, { color: colors.text }]}>Curriculum Links</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• ACSSU117 – Forces and motion</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• ACTDEP036 – Testing and improving design solutions</Text>
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Enter Measurements to Calculate</Text>

      <TextInput value={dropHeight} onChangeText={setDropHeight} placeholder="Drop height in metres" placeholderTextColor={colors.subtitle} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />

      {studentLevel === 'high' && (
        <>
          <TextInput value={toyMass} onChangeText={setToyMass} placeholder="Toy mass in kg" placeholderTextColor={colors.subtitle} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />

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
                      backgroundColor: selected ? `${colors.tint}20` : colors.background,
                    },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={[styles.optionText, { color: selected ? colors.tint : colors.text }]}>
                    {type === 'no-bounce' ? 'No Bounce' : 'Bounce'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {bounceType === 'bounce' && (
            <TextInput value={reboundTime} onChangeText={setReboundTime} placeholder="Rebound time to highest point in seconds" placeholderTextColor={colors.subtitle} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
          )}
        </>
      )}

      <Pressable
        onPress={calculateAndSaveResult}
        disabled={isSaving}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: isSaving ? colors.subtitle : colors.tint },
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={[styles.buttonText, { color: colors.buttonText }]}>
          {isSaving ? 'Saving...' : 'Calculate and Save'}
        </Text>
      </Pressable>

      {lastResult && (
        <View style={[styles.resultBox, { borderColor: colors.border }]}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>{lastResult.label}</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>Design: {lastResult.designName}</Text>
          <Text style={[styles.score, { color: colors.success }]}>Final speed: {lastResult.finalSpeed.toFixed(2)} m/s</Text>
          {lastResult.acceleration !== null && <Text style={[styles.body, { color: colors.subtitle }]}>Acceleration: {lastResult.acceleration.toFixed(2)} m/s²</Text>}
          {lastResult.netForce !== null && <Text style={[styles.body, { color: colors.subtitle }]}>Net force: {lastResult.netForce.toFixed(3)} N</Text>}
          {lastResult.weight !== null && <Text style={[styles.body, { color: colors.subtitle }]}>Weight: {lastResult.weight.toFixed(3)} N</Text>}
          {lastResult.dragForce !== null && <Text style={[styles.body, { color: colors.subtitle }]}>Drag force: {lastResult.dragForce.toFixed(3)} N</Text>}
          {lastResult.gForce !== null && <Text style={[styles.body, { color: colors.subtitle }]}>G-force: {lastResult.gForce.toFixed(2)} g</Text>}
          <Text style={[styles.body, { color: colors.subtitle }]}>Safety: {lastResult.safetyMessage}</Text>
        </View>
      )}

      <Pressable onPress={() => router.push('/result-history?activityKey=activity-one' as never)} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.tint }, pressed && styles.buttonPressed]}>
        <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>Open Result History</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/leaderboard?activityKey=activity-one' as never)} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.tint }, pressed && styles.buttonPressed]}>
        <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>View Leaderboard</Text>
      </Pressable>

      <Pressable onPress={clearTest} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, pressed && styles.buttonPressed]}>
        <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Clear Test</Text>
      </Pressable>

      {renderTabs()}
    </View>
  );

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Parachute Drop Challenge</Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Design and test a parachute. Record the drop, complete the write-up, then calculate the result.
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
  phoneLayoutCard: { borderWidth: 2, borderRadius: 24, padding: 18, marginBottom: 16, minHeight: 620 },
  cardTitle: { fontSize: 20, fontWeight: '900', marginBottom: 12 },
  label: { fontSize: 15, fontWeight: '800', marginBottom: 8, marginTop: 4 },
  body: { fontSize: 15, lineHeight: 22 },
  warningBanner: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 14 },
  warningText: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  flashBox: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 8, alignItems: 'center' },
  flashText: { fontSize: 15, fontWeight: '900' },
  instructionBox: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 16, gap: 6 },
  diagramBox: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 16, gap: 4 },
  diagramTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  diagramText: { fontSize: 14, lineHeight: 22 },
  demoImage: { width: '100%', height: 260, marginBottom: 18 },
  bottomTabRow: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', borderTopWidth: 1, paddingTop: 12, gap: 4 },
  bottomTabButton: { paddingHorizontal: 6, paddingBottom: 4, borderBottomWidth: 2 },
  bottomTabText: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 12 },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  optionButton: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 14, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  smallChoice: { width: 58, minHeight: 46, borderWidth: 1, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  optionText: { fontSize: 14, fontWeight: '900' },
  mediaButtonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, marginBottom: 12 },
  smallButton: { minHeight: 44, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  smallOutlineButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  smallButtonText: { fontSize: 13, fontWeight: '900' },
  videoFrame: { width: '100%', height: 230, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  video: { width: '100%', height: 230 },
  speedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  speedButton: { borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  speedText: { fontSize: 13, fontWeight: '900' },
  tableBox: { borderWidth: 1, borderRadius: 14, marginBottom: 14, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 10, paddingVertical: 10 },
  tableHeader: { fontSize: 13, fontWeight: '900' },
  tableCell: { fontSize: 13, fontWeight: '600' },
  button: { minHeight: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  secondaryButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  buttonText: { fontSize: 16, fontWeight: '900' },
  secondaryButtonText: { fontSize: 15, fontWeight: '900' },
  resultBox: { borderTopWidth: 1, paddingTop: 12, marginTop: 14 },
  resultTitle: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  score: { marginTop: 4, fontSize: 15, fontWeight: '900' },
  discussionBox: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12, gap: 6 },
  discussionHeading: { fontSize: 16, fontWeight: '900', marginBottom: 6 },
});
