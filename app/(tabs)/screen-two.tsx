import ActivityScreenTemplate from '@/components/ActivityScreenTemplate';

export default function ScreenTwo() {
  return (
    <ActivityScreenTemplate
      activityNumber={2}
      title="Sound Pollution Hunter"
      category="Environmental Science"
      overview="Measure and compare sound levels from different classroom actions and locations."
      equipment={['Mobile phone with STEMM Lab app', 'Safe classroom space']}
      instructions={[
        'Measure noise from different actions.',
        'Record sound levels.',
        'Record or tag the location.',
        'Compare loud and quiet zones.',
        'Save results and team observations later.',
      ]}
      startButtonText="Start Sound Hunt"
      gameRoute="/activity-two-game"
    />
  );
}