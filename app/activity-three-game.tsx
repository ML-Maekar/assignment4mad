import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
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
import { savePhotoEvidence, saveVideoEvidence } from '@/services/videoStorageService';
import { scheduleActivityCompleteNotification } from '@/utils/notifications';

const FAN_DEMO_IMAGE = require('../assets/images/activity 3.png');

type TabKey = 'activity' | 'writeup' | 'discussion';

type TargetMaterial = {
  label: string;
  thicknessMm: number;
  stiffness: number;
  note: string;
};

type WriteUpRecord = {
  id: number;
  designNumber: number;
  fanDesign: string;
  prediction: string;
  distanceCm: string;
  bendAngleDegrees: string;
  outcomeDegrees: string;
  observationNotes: string;
  wasPredictionCorrect: string;
  surprises: string;
};

type Result = {
  id: number;
  fanDesign: string;
  targetMaterial: string;
  thicknessMm: number;
  stiffness: number;
  distanceCm: number;
  bendAngleDegrees: number;
  bendAngleRadians: number;
  approximateForce: number;
};

const ACTIVITY_KEY = 'activity-three';
const ACTIVITY_TITLE = 'Hand Fan Challenge';

const TARGET_MATERIALS: TargetMaterial[] = [
  { label: 'Thin printer paper', thicknessMm: 0.1, stiffness: 0.05, note: 'Bends very easily' },
  { label: 'Standard card stock', thicknessMm: 0.25, stiffness: 0.2, note: 'Moderate bend' },
  { label: 'Thin cardboard', thicknessMm: 0.5, stiffness: 0.5, note: 'Much harder to bend' },
  { label: 'Corrugated cardboard', thicknessMm: 3, stiffness: 2.5, note: 'Very stiff, almost no bend' },
];

const PLAYBACK_SPEEDS = [1, 0.5, 0.25, 0.125, 0.1];

function degreesToRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

export default function ActivityThreeGame() {
  const { colors } = useAppTheme();
  // FIX: destructure both cameraGranted AND mediaLibraryGranted.
  // Choose Photo and Choose Video must check mediaLibraryGranted (gallery access),
  // not cameraGranted (camera capture).
  const { cameraGranted, mediaLibraryGranted } = usePermissions();

  const [activeTab, setActiveTab] = useState<TabKey>('activity');

  const [designNumber, setDesignNumber] = useState(1);
  // Shared fan design field — persists across tabs. DO NOT clear inside saveWriteUp().
  const [fanDesign, setFanDesign] = useState('');
  const [prediction, setPrediction] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState(TARGET_MATERIALS[0]);

  const [distanceCm, setDistanceCm] = useState('');
  const [bendAngleDegrees, setBendAngleDegrees] = useState('');
  const [outcomeDegrees, setOutcomeDegrees] = useState('');
  const [observationNotes, setObservationNotes] = useState('');
  const [wasPredictionCorrect, setWasPredictionCorrect] = useState('');
  const [surprises, setSurprises] = useState('');

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoFirebaseUrl, setPhotoFirebaseUrl] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoFirebaseUrl, setVideoFirebaseUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoZoom, setVideoZoom] = useState(1);
  const [isSavingMedia, setIsSavingMedia] = useState(false);

  const [savedWriteUps, setSavedWriteUps] = useState<WriteUpRecord[]>([]);
  const [writeUpSavedFlash, setWriteUpSavedFlash] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const zoomInVideo = () => setVideoZoom((z) => Math.min(z + 0.25, 3));
  const zoomOutVideo = () => setVideoZoom((z) => Math.max(z - 0.25, 1));
  const resetVideoZoom = () => setVideoZoom(1);

  // After taking a photo: save to gallery + upload to Firebase Storage
  const handlePostPhotoSave = async (uri: string) => {
    setIsSavingMedia(true);
    try {
      const { firebaseUrl } = await savePhotoEvidence({
        localUri: uri,
        activityKey: ACTIVITY_KEY,
        mediaLibraryGranted,
      });
      if (firebaseUrl) setPhotoFirebaseUrl(firebaseUrl);
    } catch {
      // Silent fail — photo is still visible from local URI
    } finally {
      setIsSavingMedia(false);
    }
  };

  // After recording a video: save to gallery + upload to Firebase Storage
  const handlePostVideoSave = async (uri: string) => {
    setIsSavingMedia(true);
    try {
      const { firebaseUrl } = await saveVideoEvidence({
        localUri: uri,
        activityKey: ACTIVITY_KEY,
        mediaLibraryGranted,
      });
      if (firebaseUrl) setVideoFirebaseUrl(firebaseUrl);
    } catch {
      // Silent fail — video is still usable from local URI
    } finally {
      setIsSavingMedia(false);
    }
  };

  const takePhotoEvidence = async () => {
    if (!cameraGranted) {
      Alert.alert(
        'Camera Disabled',
        'Camera is turned off in Settings. Go to Settings → Permissions → Camera to enable it.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      setPhotoFirebaseUrl(null);
      handlePostPhotoSave(uri);
    }
  };

  // FIX: choosePhotoEvidence now checks mediaLibraryGranted (gallery access),
  // not cameraGranted.
  const choosePhotoEvidence = async () => {
    if (!mediaLibraryGranted) {
      Alert.alert(
        'Media Storage Disabled',
        'Media Storage is turned off in Settings. Go to Settings → Permissions → Media Storage to enable it.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
      setPhotoFirebaseUrl(null);
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
      videoMaxDuration: 30,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setVideoUri(uri);
      setVideoFirebaseUrl(null);
      setVideoZoom(1);
      handlePostVideoSave(uri);
    }
  };

  // FIX: chooseVideoEvidence now checks mediaLibraryGranted (gallery access),
  // not cameraGranted.
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
    if (!fanDesign.trim()) {
      Alert.alert('Missing Fan Design', 'Please enter the fan design.');
      return;
    }
    if (!prediction.trim()) {
      Alert.alert('Missing Prediction', 'Please enter your prediction.');
      return;
    }

    const newWriteUp: WriteUpRecord = {
      id: Date.now(),
      designNumber,
      fanDesign: fanDesign.trim(),
      prediction: prediction.trim(),
      distanceCm: distanceCm.trim(),
      bendAngleDegrees: bendAngleDegrees.trim(),
      outcomeDegrees: outcomeDegrees.trim(),
      observationNotes: observationNotes.trim(),
      wasPredictionCorrect: wasPredictionCorrect.trim(),
      surprises: surprises.trim(),
    };

    setSavedWriteUps((current) => [newWriteUp, ...current]);

    // FIX: Do NOT clear fanDesign here. The fan design field is shared between
    // the Write Up tab and the Discussion tab's Calculate and Save button.
    // Clearing it inside saveWriteUp() was the root cause of the
    // "Missing Fan Design" alert firing even when the user had filled it in.
    // Only clear the other write-up-specific fields.
    setPrediction('');
    setDistanceCm('');
    setBendAngleDegrees('');
    setOutcomeDegrees('');
    setObservationNotes('');
    setWasPredictionCorrect('');
    setSurprises('');

    // Auto-increment design number for next write-up
    setDesignNumber((current) => Math.min(current + 1, 3));

    // Show ✓ flash for 2 seconds
    setWriteUpSavedFlash(true);
    setTimeout(() => setWriteUpSavedFlash(false), 2000);
  };

  const calculateAndSaveResult = async () => {
    const distanceValue = Number(distanceCm);
    const bendAngleValue = Number(bendAngleDegrees);

    if (!fanDesign.trim()) {
      Alert.alert('Missing Fan Design', 'Please enter the fan design.');
      return;
    }
    if (Number.isNaN(distanceValue) || distanceValue <= 0) {
      Alert.alert('Invalid Distance', 'Please enter the fan distance in cm.');
      return;
    }
    if (Number.isNaN(bendAngleValue) || bendAngleValue < 0) {
      Alert.alert('Invalid Bend Angle', 'Please enter the bend angle in degrees.');
      return;
    }
    if (!photoUri) {
      Alert.alert('Photo Needed', 'Please take or choose a photo of the fan test setup.');
      return;
    }

    try {
      setIsSaving(true);

      const bendAngleRadians = degreesToRadians(bendAngleValue);
      const approximateForce = selectedMaterial.stiffness * bendAngleRadians;

      const savedResultId = await saveAttempt({
        activityKey: ACTIVITY_KEY,
        activityTitle: ACTIVITY_TITLE,
        label: `Design ${designNumber}: ${fanDesign.trim()}`,
        score: approximateForce,
        data: {
          designNumber,
          fanDesign: fanDesign.trim(),
          prediction: prediction.trim(),
          targetMaterial: selectedMaterial.label,
          thicknessMm: selectedMaterial.thicknessMm,
          stiffness: selectedMaterial.stiffness,
          materialNote: selectedMaterial.note,
          distanceCm: distanceValue,
          bendAngleDegrees: bendAngleValue,
          bendAngleRadians,
          approximateForce,
          outcomeDegrees: outcomeDegrees.trim(),
          observationNotes: observationNotes.trim(),
          wasPredictionCorrect: wasPredictionCorrect.trim(),
          surprises: surprises.trim(),
          savedWriteUps,
          // Local URIs + Firebase Storage URLs for both photo and video
          photoUri,
          photoFirebaseUrl,
          videoUri,
          videoFirebaseUrl,
          playbackRate,
          videoZoom,
          formula: 'F ≈ k × θ',
          optionalChallenge: 'Estimate stiffness coefficient k using material stiffness and bend angle.',
        },
      });

      const savedResult: Result = {
        id: savedResultId,
        fanDesign: fanDesign.trim(),
        targetMaterial: selectedMaterial.label,
        thicknessMm: selectedMaterial.thicknessMm,
        stiffness: selectedMaterial.stiffness,
        distanceCm: distanceValue,
        bendAngleDegrees: bendAngleValue,
        bendAngleRadians,
        approximateForce,
      };

      setLastResult(savedResult);
      setResults((current) => [savedResult, ...current]);

      await scheduleActivityCompleteNotification(ACTIVITY_TITLE, approximateForce);

      Alert.alert(
        'Result Saved',
        `Approximate Force: ${approximateForce.toFixed(3)} N`,
        [
          {
            text: 'View Summary',
            onPress: () => router.push(`/result-summary?resultId=${savedResultId}` as never),
          },
          { text: 'Stay Here', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.log('Failed to save Activity 3 result:', error);
      Alert.alert('Save Failed', 'The hand fan result could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearTest = () => {
    setDesignNumber(1);
    setFanDesign('');
    setPrediction('');
    setSelectedMaterial(TARGET_MATERIALS[0]);
    setDistanceCm('');
    setBendAngleDegrees('');
    setOutcomeDegrees('');
    setObservationNotes('');
    setWasPredictionCorrect('');
    setSurprises('');
    setPhotoUri(null);
    setPhotoFirebaseUrl(null);
    setVideoUri(null);
    setVideoFirebaseUrl(null);
    setPlaybackRate(1);
    setVideoZoom(1);
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
            ⚠️ Camera is disabled. Go to Settings → Permissions → Camera to enable photos and video.
          </Text>
        </View>
      )}

      {!mediaLibraryGranted && (
        <View style={[styles.warningBanner, { backgroundColor: `${colors.warning}15`, borderColor: colors.warning }]}>
          <Text style={[styles.warningText, { color: colors.warning }]}>
            ⚠️ Media Storage is disabled. Go to Settings → Permissions → Media Storage to save media to your gallery.
          </Text>
        </View>
      )}

      <Text style={[styles.cardTitle, { color: colors.text }]}>Instructions</Text>

      <View style={[styles.instructionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.body, { color: colors.subtitle }]}>1. Fold a piece of paper back and forward in 1 cm strips to make a hand fan.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>2. Stand a piece of paper or cardboard upright on the table — sticky tape it if needed.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>3. Position the phone to capture the upright paper from the side.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>4. Fan air from 15 cm, 30 cm, or 45 cm away — keep the fan movement consistent.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>5. Record video or photo to measure the bend angle of the paper.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>6. Try different fan designs and different materials. Rotate for each team member.</Text>
      </View>

      <View style={[styles.diagramBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.diagramTitle, { color: colors.text }]}>Setup Diagram</Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>📱 Phone — positioned to see the paper bend</Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>📄 Upright paper/cardboard (target)</Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>🌬️ Hand fan — 15 / 30 / 45 cm away</Text>
        <Text style={[styles.diagramText, { color: colors.subtitle }]}>📐 Measure: angle from vertical the paper bends</Text>
      </View>

      <Image source={FAN_DEMO_IMAGE} style={styles.demoImage} resizeMode="contain" />

      <Text style={[styles.body, { color: colors.subtitle }]}>
        Stand paper or cardboard upright on the table. Fan air from 15 cm, 30 cm, or 45 cm away and record the movement.
      </Text>

      {/* Photo capture */}
      <View style={styles.mediaButtonRow}>
        <Pressable
          onPress={takePhotoEvidence}
          style={({ pressed }) => [
            styles.smallButton,
            { backgroundColor: cameraGranted ? colors.tint : colors.subtitle },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.smallButtonText, { color: colors.buttonText }]}>
            {cameraGranted ? 'Take Photo' : 'Camera Off'}
          </Text>
        </Pressable>

        {/* FIX: Choose Photo checks mediaLibraryGranted, not cameraGranted */}
        <Pressable
          onPress={choosePhotoEvidence}
          style={({ pressed }) => [
            styles.smallOutlineButton,
            { borderColor: mediaLibraryGranted ? colors.tint : colors.subtitle },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.smallButtonText, { color: mediaLibraryGranted ? colors.tint : colors.subtitle }]}>
            {mediaLibraryGranted ? 'Choose Photo' : 'Media Off'}
          </Text>
        </Pressable>
      </View>

      {photoUri ? (
        <>
          <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
          {photoFirebaseUrl && (
            <Text style={[styles.body, { color: colors.success, marginBottom: 8 }]}>
              ☁️ Photo backed up to cloud storage.
            </Text>
          )}
        </>
      ) : (
        <Text style={[styles.body, { color: colors.subtitle }]}>
          Add a photo of the fan, upright material, and phone position.
        </Text>
      )}

      {/* Video capture */}
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

        {/* FIX: Choose Video checks mediaLibraryGranted, not cameraGranted */}
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

      {isSavingMedia && (
        <Text style={[styles.body, { color: colors.subtitle, marginBottom: 8 }]}>
          💾 Saving media to gallery…
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

          {videoFirebaseUrl && (
            <Text style={[styles.body, { color: colors.success, marginBottom: 8 }]}>
              ☁️ Video backed up to cloud storage.
            </Text>
          )}

          <Text style={[styles.label, { color: colors.text }]}>Playback Speed</Text>
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

      <Text style={[styles.label, { color: colors.text }]}>Design Number</Text>
      <View style={styles.optionRow}>
        {[1, 2, 3].map((number) => {
          const selected = designNumber === number;
          return (
            <Pressable
              key={number}
              onPress={() => setDesignNumber(number)}
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

      {/* Fan design field is shared — also used by Discussion tab's Calculate and Save */}
      <TextInput value={fanDesign} onChangeText={setFanDesign} placeholder="Fan design, e.g. 1 cm back-and-forward folds" placeholderTextColor={colors.subtitle} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
      <TextInput value={prediction} onChangeText={setPrediction} placeholder="Predict which fan design moves the paper most" placeholderTextColor={colors.subtitle} multiline style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />

      <Text style={[styles.label, { color: colors.text }]}>Results Table</Text>
      <View style={[styles.tableBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <View style={[styles.tableRow, { borderColor: colors.border }]}>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 2 }]}>Design</Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>Distance (cm)</Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>Angle (°)</Text>
          <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>Force (N)</Text>
        </View>
        {results.length === 0 ? (
          <Text style={[styles.body, { color: colors.subtitle, padding: 10 }]}>
            Calculate results in the Discussion tab to see them here.
          </Text>
        ) : (
          results.map((r) => (
            <View key={r.id} style={[styles.tableRow, { borderColor: colors.border }]}>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]} numberOfLines={2}>{r.fanDesign}</Text>
              <Text style={[styles.tableCell, { color: colors.subtitle, flex: 1 }]}>{r.distanceCm}</Text>
              <Text style={[styles.tableCell, { color: colors.subtitle, flex: 1 }]}>{r.bendAngleDegrees}°</Text>
              <Text style={[styles.tableCell, { color: colors.success, flex: 1 }]}>{r.approximateForce.toFixed(3)}</Text>
            </View>
          ))
        )}
      </View>

      <TextInput value={distanceCm} onChangeText={setDistanceCm} placeholder="Fan distance in cm, e.g. 30" placeholderTextColor={colors.subtitle} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
      <TextInput value={bendAngleDegrees} onChangeText={setBendAngleDegrees} placeholder="Bend angle in degrees, e.g. 30" placeholderTextColor={colors.subtitle} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
      <TextInput value={outcomeDegrees} onChangeText={setOutcomeDegrees} placeholder="Outcome in degrees" placeholderTextColor={colors.subtitle} keyboardType="decimal-pad" style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
      <TextInput value={observationNotes} onChangeText={setObservationNotes} placeholder="Observation notes — what did you notice?" placeholderTextColor={colors.subtitle} multiline style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
      <TextInput value={wasPredictionCorrect} onChangeText={setWasPredictionCorrect} placeholder="Were you right? Explain why or why not." placeholderTextColor={colors.subtitle} multiline style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />
      <TextInput value={surprises} onChangeText={setSurprises} placeholder="Any surprises during testing?" placeholderTextColor={colors.subtitle} multiline style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]} />

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
              Design {writeUp.designNumber}: {writeUp.fanDesign}
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
        <Text style={[styles.discussionHeading, { color: colors.text }]}>How a Hand Fan Creates Force</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>Moving air applies force to objects. When you wave a fan, it pushes air molecules toward the upright paper, creating a pressure difference that bends it. The more air you move, the greater the force.</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>Repeated bending can weaken paper fibres, making it easier to bend over time.</Text>
      </View>

      <View style={[styles.discussionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.discussionHeading, { color: colors.text }]}>The Formula</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>F ≈ k × θ</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>F = approximate force (N)</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>k = stiffness coefficient of the material</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>θ = bend angle in radians</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>High school challenge: if k = 0.5, estimate the bending force from your angle measurement.</Text>
      </View>

      <View style={[styles.discussionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.discussionHeading, { color: colors.text }]}>Material Stiffness Values</Text>
        <View style={[styles.tableBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <View style={[styles.tableRow, { borderColor: colors.border }]}>
            <Text style={[styles.tableHeader, { color: colors.text, flex: 2 }]}>Material</Text>
            <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>k (N/rad)</Text>
            <Text style={[styles.tableHeader, { color: colors.text, flex: 1 }]}>Thickness</Text>
          </View>
          {TARGET_MATERIALS.map((m) => (
            <View key={m.label} style={[styles.tableRow, { borderColor: colors.border }]}>
              <Text style={[styles.tableCell, { color: colors.text, flex: 2 }]}>{m.label}</Text>
              <Text style={[styles.tableCell, { color: colors.subtitle, flex: 1 }]}>{m.stiffness}</Text>
              <Text style={[styles.tableCell, { color: colors.subtitle, flex: 1 }]}>{m.thicknessMm} mm</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Select Target Material</Text>
      <View style={styles.optionGrid}>
        {TARGET_MATERIALS.map((material) => {
          const selected = selectedMaterial.label === material.label;
          return (
            <Pressable
              key={material.label}
              onPress={() => setSelectedMaterial(material)}
              style={({ pressed }) => [
                styles.materialButton,
                {
                  borderColor: selected ? colors.tint : colors.border,
                  backgroundColor: selected ? `${colors.tint}20` : colors.background,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.optionText, { color: selected ? colors.tint : colors.text }]}>{material.label}</Text>
              <Text style={[styles.smallInfo, { color: colors.subtitle }]}>Thickness: {material.thicknessMm} mm | k = {material.stiffness} N/rad</Text>
              <Text style={[styles.smallInfo, { color: colors.subtitle }]}>{material.note}</Text>
            </Pressable>
          );
        })}
      </View>

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
          <Text style={[styles.resultTitle, { color: colors.text }]}>Latest Result</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>Fan Design: {lastResult.fanDesign}</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>Target Material: {lastResult.targetMaterial}</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>Thickness: {lastResult.thicknessMm} mm</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>Stiffness k: {lastResult.stiffness} N/rad</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>Distance: {lastResult.distanceCm} cm</Text>
          <Text style={[styles.body, { color: colors.subtitle }]}>Bend angle: {lastResult.bendAngleDegrees}°</Text>
          <Text style={[styles.score, { color: colors.success }]}>Approx. Force: {lastResult.approximateForce.toFixed(3)} N</Text>
        </View>
      )}

      <View style={[styles.discussionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.discussionHeading, { color: colors.text }]}>Think About This</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• Which fan design moved the paper most?</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• Did more folds always mean more force?</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• Which material was hardest to bend?</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• How did distance from the fan affect the bend angle?</Text>
      </View>

      <View style={[styles.discussionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Text style={[styles.discussionHeading, { color: colors.text }]}>Curriculum Links</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• ACSSU117 – Forces can be exerted by one object on another</Text>
        <Text style={[styles.body, { color: colors.subtitle }]}>• ACSIS126 – Measuring and recording data</Text>
      </View>

      <Pressable onPress={() => router.push('/result-history?activityKey=activity-three' as never)} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.tint }, pressed && styles.buttonPressed]}>
        <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>Open Result History</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/leaderboard?activityKey=activity-three' as never)} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.tint }, pressed && styles.buttonPressed]}>
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
        <Text style={[styles.title, { color: colors.text }]}>Hand Fan Challenge</Text>
        <Text style={[styles.subtitle, { color: colors.subtitle }]}>
          Build a fan, test different designs and materials, and calculate the approximate force.
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
  photo: { width: '100%', height: 220, borderRadius: 16, marginTop: 10, marginBottom: 12 },
  bottomTabRow: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'center', borderTopWidth: 1, paddingTop: 12, gap: 4 },
  bottomTabButton: { paddingHorizontal: 6, paddingBottom: 4, borderBottomWidth: 2 },
  bottomTabText: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, marginBottom: 12 },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  optionGrid: { gap: 10, marginBottom: 14 },
  smallChoice: { width: 58, minHeight: 46, borderWidth: 1, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  materialButton: { borderWidth: 1, borderRadius: 14, padding: 12 },
  optionText: { fontSize: 14, fontWeight: '900' },
  smallInfo: { marginTop: 4, fontSize: 12, lineHeight: 17, fontWeight: '600' },
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
