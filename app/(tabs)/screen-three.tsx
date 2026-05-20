import ActivityScreenTemplate from '@/components/ActivityScreenTemplate';

export default function ScreenThree() {
  return (
    <ActivityScreenTemplate
      activityNumber={3}
      title="Hand Fan Challenge"
      category="Physics – Air Movement"
      overview="Test how air movement affects flexible materials such as paper and cardboard."
      equipment={[
        'Paper',
        'Cardboard',
        'Scissors',
        'Mobile phone',
        'Sticky tape',
      ]}
      instructions={[
        'Stand paper upright on a table.',
        'Fan air from different distances.',
        'Observe and record movement.',
        'Repeat with different fan designs.',
        'Repeat with cardboard instead of paper.',
        'Compare bend angle and material stiffness later.',
      ]}
      startButtonText="Start Fan Challenge"
      gameRoute="/activity-three-game"
    />
  );
}