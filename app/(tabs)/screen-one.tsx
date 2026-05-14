import ActivityScreenTemplate from '@/components/ActivityScreenTemplate';

export default function ScreenOne() {
  return (
    <ActivityScreenTemplate
      activityNumber={1}
      title="Parachute Drop Challenge"
      category="Engineering + Physics"
      overview="Design, build and test a parachute for a small toy to reduce landing speed and impact force."
      equipment={[
        'Mobile phone with STEMM Lab app',
        'Small toy',
        'Table or elevated surface',
        'Paper or plastic',
        'String',
        'Scissors',
        'Tape',
      ]}
      instructions={[
        'Drop the toy without a parachute and record the fall.',
        'Build a parachute using provided materials.',
        'Drop the toy from the same height and record the fall.',
        'Review speed and landing accuracy results.',
        'Redesign and test up to three prototypes.',
        'Upload videos, results and team reflections later.',
      ]}
    />
  );
}