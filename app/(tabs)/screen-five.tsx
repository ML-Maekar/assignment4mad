import ActivityScreenTemplate from '@/components/ActivityScreenTemplate';

export default function ScreenFive() {
  return (
    <ActivityScreenTemplate
      activityNumber={5}
      title="Human Performance Lab"
      category="Medical Science + Biomechanics"
      overview="Measure speed, smoothness and coordination during controlled stretching activities."
      equipment={[
        'Mobile phone with STEMM Lab app',
        'Open space to move safely',
      ]}
      instructions={[
        'Hold the phone firmly in one hand.',
        'Perform guided movement slowly.',
        'Record movement data later.',
        'Repeat with vibration feedback later.',
        'Review speed, smoothness and range-of-motion data.',
        'Upload results and reflect as a group.',
      ]}
      startButtonText="Start Performance Lab"
      gameRoute="/activity-five-game"
    />
  );
}