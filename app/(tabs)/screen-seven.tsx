import ActivityScreenTemplate from '@/components/ActivityScreenTemplate';

export default function ScreenSeven() {
  return (
    <ActivityScreenTemplate
      activityNumber={7}
      title="Breathing Pace Trainer"
      category="Medical Science"
      overview="Analyse breathing patterns at rest and after exercise using phone movement data."
      equipment={[
        'Mobile phone with STEMM Lab app',
        'Flat surface or mat',
      ]}
      instructions={[
        'Place the phone gently on the chest.',
        'Record breathing at rest later.',
        'Perform light exercise safely.',
        'Record breathing again.',
        'Compare breathing before and after exercise.',
        'Rotate through each team member.',
      ]}
      startButtonText="Start Breathing Trainer"
      gameRoute="/activity-seven-game"
    />
  );
}