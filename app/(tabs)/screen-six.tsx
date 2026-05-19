import ActivityScreenTemplate from '@/components/ActivityScreenTemplate';

export default function ScreenSix() {
  return (
    <ActivityScreenTemplate
      activityNumber={6}
      title="Reaction Board Challenge"
      category="Neuroscience + Mathematics"
      overview="Measure reaction time, coordination and improvement through repeated digital challenges."
      equipment={[
        'Mobile phone with STEMM Lab app',
        'Clear working space',
      ]}
      instructions={[
        'Tap the screen as soon as the hidden button appears.',
        'Record reaction time.',
        'Repeat using the non-dominant hand.',
        'Compare results.',
        'Trace a moving shape on the screen later.',
        'Review accuracy and delay.',
      ]}
      startButtonText="Start Reaction Challenge"
      gameRoute="/activity-six-game"
    />
  );
}