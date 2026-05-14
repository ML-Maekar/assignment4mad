import ActivityScreenTemplate from '@/components/ActivityScreenTemplate';

export default function ScreenFour() {
  return (
    <ActivityScreenTemplate
      activityNumber={4}
      title="Earthquake-Resistant Structure"
      category="Engineering + Earth Science"
      overview="Design structures that withstand vibration, simulating earthquake movement."
      equipment={[
        'Cardboard',
        'Paper',
        'Scissors',
        'Sticky tape',
        'Plastic or paper cups',
        'Mobile phone with vibration sensor',
      ]}
      instructions={[
        'Build an anti-vibration layer using folded paper or cardboard.',
        'Place a flat cardboard platform on top.',
        'Place the phone in the centre.',
        'Activate the vibration activity later.',
        'Modify the structure to reduce movement.',
        'Compare structure designs.',
      ]}
    />
  );
}