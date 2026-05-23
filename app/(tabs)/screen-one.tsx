import ActivityScreenTemplate from '@/components/ActivityScreenTemplate';

export default function ScreenOne() {
  return (
    <ActivityScreenTemplate
      activityNumber={1}
      title="Parachute Drop Challenge"
      category="Engineering + Physics"
      overview="Design, build, record, and test a parachute for a small toy. Use slow-motion video to review the fall, measure timing, and calculate landing safety."
      equipment={[
        'Mobile phone with STEMM Lab app',
        'Small toy, such as an army toy soldier',
        'Table or elevated surface',
        'Paper or plastic',
        'String',
        'Scissors',
        'Tape',
        'Slow-motion video recording',
      ]}
      instructions={[
        'Drop the toy without a parachute and record the fall as a baseline test.',
        'Build a parachute using paper or plastic, string, tape, and scissors.',
        'Drop the toy from the same height and record the fall using the app or upload a video.',
        'Use slow-motion video to identify when the toy first hits the ground.',
        'Measure contact time from first ground contact until the toy stops moving.',
        'Primary students measure time and calculate final speed.',
        'High school students calculate velocity, acceleration, net force, drag force, and g-force.',
        'Redesign and test up to three prototypes within the time limit.',
      ]}
      startButtonText="Start Parachute Test"
      gameRoute="/activity-one-game"
    />
  );
}