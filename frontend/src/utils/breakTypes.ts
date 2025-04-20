export interface BreakType {
  id: string;
  title: string;
  description: string;
}

export const breakTypes: BreakType[] = [
  {
    id: "breathing",
    title: "Box Breathing",
    description:
      "Slowly inhale for 4 seconds, hold your breath for 4 seconds, slowly exhale for 4 seconds, and hold empty for 4 seconds. Repeat 3-5 times to calm your nervous system.",
  },
  {
    id: "stretch",
    title: "Quick Stretch",
    description:
      "Gently roll your head clockwise, then counter-clockwise. Lift your shoulders up towards your ears, hold for a moment, then relax them down. Reach your arms overhead.",
  },
  {
    id: "eye_rest",
    title: "Eye Rest (20-20-20)",
    description:
      "Look away from your screen at an object at least 20 feet (6 meters) away for 20 seconds. This helps reduce digital eye strain.",
  },
  {
    id: "mindful_moment",
    title: "Mindful Moment",
    description:
      "Close your eyes or soften your gaze. Bring your attention to your senses for 60 seconds. What sounds do you hear? How does your body feel? Just observe without judgment.",
  },
  {
    id: "puzzle",
    title: "Quick Brain Teaser",
    description: "Solve this quick math problem to reset your focus.",
  },
];
