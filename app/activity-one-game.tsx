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
  const { cameraGranted, askForCamera } = usePermissions();

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
  const [surprises, setSurprises] = useState('');

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

  const recordVideoEvidence = async () => {
    // Check app-level camera permission first
    if (!cameraGranted) {
      const granted = await askForCamera();
      if (!granted) return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera Permission Needed', 'Please allow camera access to record the parachute drop.');
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
    // Check app-level camera permission first
    if (!cameraGranted) {
      const granted = await askForCamera();
      if (!granted) return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Media Permission Needed', 'Please allow gallery access to choose a video.');
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

    // Clear fields after saving so user can enter next write-up fresh
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
        Alert.alert('Invalid Stopping Time', 'Please enter the time from first hit to stop moving using slow motion.');
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
          videoUri,
          playbackRate,
          videoZoom,
          formulaPrimary: 'speed = distance ÷ time',
          formulaAcceleration: 'acceleration = velocity ÷ time',
          formulaNetForce: 'net force = mass × acceleration',
          formulaWeight: 'weight = mass × 9.8',
          formulaDrag: 'drag force = weight − net force',
          formulaGForce: 'g-force = change in velocity ÷ contact time ÷ 9.8',
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
    setPlaybackRate(1);
    setVideoZoom(1);
    setSavedWriteUps([]);
    setLastResult(null);
    setActiveTab('activity');
  };

  // ─── Tab renderer ─────────────────────────────────────────────
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
          retu
 