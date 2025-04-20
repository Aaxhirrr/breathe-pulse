import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppActions } from "../utils/useAppStore";
import { toast } from "sonner";

// Define props if needed in the future, for now it uses the store action directly
// interface Props {}

export function PuzzleBreak() {
  // Get all needed actions
  const { recordBreakTaken, openFeedbackChat, dismissBreakSuggestion } = useAppActions();
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answer, setAnswer] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState(0);

  // Generate new puzzle on mount
  useEffect(() => {
    const n1 = Math.floor(Math.random() * 10); // 0-9
    const n2 = Math.floor(Math.random() * 10); // 0-9
    setNum1(n1);
    setNum2(n2);
    setCorrectAnswer(n1 + n2);
    setAnswer(""); // Clear previous answer
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAnswer(event.target.value);
  };

  const handleSubmit = () => {
    if (parseInt(answer, 10) === correctAnswer) {
      toast.success("Correct! Great job.");
      recordBreakTaken(); // Mark break as taken
      // Trigger feedback chat for completion
      openFeedbackChat({
        role: 'assistant',
        content: 'Puzzle solved! Did that little mental exercise help clear your head?'
      });
    } else {
      toast.error("Not quite right, try again!");
      setAnswer(""); // Clear incorrect answer
    }
  };

  const handleSkip = () => {
    toast.info("Puzzle skipped.");
    // Note: Skipping puzzle currently calls recordBreakTaken based on existing logic
    recordBreakTaken(); 
    // Trigger feedback chat for skipping
    openFeedbackChat({
      role: 'assistant',
      content: 'Puzzle skipped. No worries! Ready to get back to it?' // Positive tone due to recordBreakTaken
    });
  };

  // Handle Enter key press in input
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="mt-3 flex flex-col items-center space-y-3">
      <p className="text-lg font-semibold">
        What is {num1} + {num2}?
      </p>
      <Input 
        type="number"
        value={answer}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder="Your answer"
        className="w-24 text-center"
        autoFocus
      />
      <div className="flex space-x-2">
        <Button size="sm" onClick={handleSubmit}>Submit</Button>
        <Button size="sm" variant="outline" onClick={handleSkip}>Skip</Button>
      </div>
    </div>
  );
}