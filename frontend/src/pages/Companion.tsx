import React, { useState, useEffect, useMemo } from "react";
import { useCurrentUser } from "app"; // Import hook to get user
import { Timestamp } from "firebase/firestore";
import { useAppActions, useAppStore } from "utils/useAppStore"; // Import main app actions AND STORE
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, MessageSquareText, Flame } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For errors
import { AlertCircle } from 'lucide-react'; // Icon for error alert
import { useCompanionStore, personalityOptions, moodOptions, Habit } from "utils/companionStore";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// Helper function to check if a Firestore Timestamp matches a specific date (ignoring time)
const isTimestampToday = (
  timestamp: Timestamp | null | undefined,
  compareDate: Date = new Date()
): boolean => {
  if (!timestamp) return false;
  const dateFromTimestamp = timestamp.toDate();
  // Ensure compareDate is also normalized if needed, though we normalize it in useMemo
  return (
    dateFromTimestamp.getDate() === compareDate.getDate() &&
    dateFromTimestamp.getMonth() === compareDate.getMonth() &&
    dateFromTimestamp.getFullYear() === compareDate.getFullYear()
  );
};
const formatGoal = (habit: Habit): string => {
  switch (habit.goalType) {
    case "completion":
      return "Daily";
    case "quantity":
      return `Qty: ${habit.goalValue ?? 'N/A'}`;
    case "duration_minutes":
      return `${habit.goalValue ?? 'N/A'} min`;
    default:
      return "Goal N/A";
  }
};

export default function CompanionPage() {
  // --- Authentication Hook ---
  const { user, loading: userLoading } = useCurrentUser(); // Get user and loading state

  // --- Zustand Stores ---
  const companionActions = useCompanionStore();
  
  const appActions = useAppActions(); // Get main app actions
  const {
    personality,
    selectedMoodEmoji,
    habits,
    isHabitsLoading,
    habitError,
    // Actions below are accessed via companionActions object
  } = useCompanionStore((state) => ({
    personality: state.personality,
    selectedMoodEmoji: state.selectedMoodEmoji,
    habits: state.habits,
    isHabitsLoading: state.isHabitsLoading,
    habitError: state.habitError,
  }));

  // Destructure needed companion actions
  const {
    setPersonality,
    setSelectedMoodEmoji,
    subscribeToHabits,
    unsubscribeFromHabits,
    addHabit,
    toggleHabitCompletion,
    deleteHabit,
    addMoodEntry, // Added mood action
  } = companionActions;

  // --- Direct State Read for Debugging ---
  const companionChatOpen = useAppStore((state) => state.isCompanionChatOpen); // DEBUG: Read state directly

  // --- Local State ---
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitGoalType, setNewHabitGoalType] = useState<Habit['goalType']>("completion");
  const [newHabitGoalValue, setNewHabitGoalValue] = useState<number | string>(""); // Use string for input, parse later

  // Subscribe/unsubscribe to habits based on user auth state
  useEffect(() => {
    if (user) {
      console.log("User found, subscribing to habits for:", user.uid);
      subscribeToHabits(user.uid);
    } else if (!userLoading) {
      // Only unsubscribe if not loading and user is definitely null
      console.log("User logged out or not found, unsubscribing from habits.");
      unsubscribeFromHabits();
    }

    // Cleanup function to unsubscribe when component unmounts or user changes
    return () => {
      console.log("CompanionPage cleanup: Unsubscribing from habits.");
      // Note: unsubscribeFromHabits checks if there's an active subscription
      unsubscribeFromHabits();
    };
  }, [user, userLoading, subscribeToHabits, unsubscribeFromHabits]); // Dependencies

  // --- Handlers ---
  const handleMoodSelect = (emoji: string) => {
    setSelectedMoodEmoji(selectedMoodEmoji === emoji ? null : emoji);
    // TODO: Log mood to Firestore later
  };

  const handleAddHabit = () => {
    const trimmedName = newHabitName.trim();
    if (user && trimmedName) {
      let goalValueNumber: number | null = null;
      if (newHabitGoalType === "quantity" || newHabitGoalType === "duration_minutes") {
        goalValueNumber = parseInt(String(newHabitGoalValue), 10);
        if (isNaN(goalValueNumber) || goalValueNumber <= 0) {
          console.error("Invalid goal value for quantity/duration.");
          // TODO: Show validation error to user
          return;
        }
      }

      const habitData: Pick<Habit, "name" | "goalType" | "goalValue"> = {
        name: trimmedName,
        goalType: newHabitGoalType,
        goalValue: goalValueNumber,
      };

      addHabit(user.uid, habitData); // Pass userId and habitData object

      // Reset form
      setNewHabitName("");
      setNewHabitGoalType("completion");
      setNewHabitGoalValue("");

    } else if (!user) {
        console.error("Cannot add habit: user not logged in.");
        // TODO: Show user a message?
    } else if (!trimmedName) {
        console.error("Cannot add habit: name is empty.");
         // TODO: Show user a message?
    }
  };

  const handleToggleHabit = (habit: Habit) => {
    if (user) {
        // Call the updated action from the store.
        // For now, assume we're toggling for today.
        // The achievedValue is omitted; firestoreUtils logic handles completion toggle.
        toggleHabitCompletion(user.uid, habit.id, new Date());
    } else {
        console.error("Cannot toggle habit: user not logged in.");
    }
  };

    const handleDeleteHabit = (habitId: string) => {
      if (user) {
          // Optional: Add a confirmation dialog here
          console.log("Attempting to delete habit:", habitId);
          deleteHabit(user.uid, habitId); // Pass userId and habitId
      } else {
           console.error("Cannot delete habit: user not logged in.");
      }
  };


    // Calculate weekly progress data
  const weeklyProgressData = useMemo(() => {
    if (!habits || habits.length === 0) return [];

    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const completedCount = habits.filter(
        (habit) => habit.isActive && habit.lastCompletedDate && isTimestampToday(habit.lastCompletedDate, date)
      ).length;

      data.push({
        // Format date as short day name (e.g., "Mon")
        name: date.toLocaleDateString(undefined, { weekday: 'short' }),
        completed: completedCount,
      });
    }
    return data;
  }, [habits]); // Recalculate when habits change


  const handleLogMood = () => {
    // Access habits directly from the store state hook
    const currentHabits = useCompanionStore.getState().habits;

    if (user && selectedMoodEmoji) {
      // Find habits completed today
      const today = new Date(); // Use the same date for checking
      const completedTodayHabitIds = currentHabits
        .filter(habit => habit.isActive && isTimestampToday(habit.lastCompletedDate, today))
        .map(habit => habit.id);

      const moodData: Pick<MoodEntry, "moodEmoji" | "notes" | "linkedHabitIds"> = {
        moodEmoji: selectedMoodEmoji,
        notes: "", // Add notes input later if needed
        linkedHabitIds: completedTodayHabitIds, // Pass the IDs
      };

      addMoodEntry(user.uid, moodData);
      setSelectedMoodEmoji(null); // Reset selection after logging
      console.log(`Mood logged: ${selectedMoodEmoji} with habits: ${completedTodayHabitIds.join(', ')}`);
      // TODO: Optionally show a confirmation toast/message
    } else {
      console.error("Cannot log mood: User not logged in or no mood selected.");
    }
  };

  // --- Render Logic ---
  const renderHabitList = () => {
    if (userLoading || (isHabitsLoading && !habitError)) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      );
    }

    if (habitError) {
       return (
         <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
           <AlertTitle>Error Loading Habits</AlertTitle>
           <AlertDescription>
             Could not load your habits. Please try refreshing the page.
             {/* {habitError.message} */}
           </AlertDescription>
         </Alert>
       );
    }

     if (!user) {
        return <p className="text-center text-muted-foreground">Please log in to track habits.</p>;
     }

    if (habits.length === 0) {
      return <p className="text-center text-muted-foreground">No habits added yet. Add one in the form above!</p>;
    }

    // Sort habits - maybe active first, then by creation date? (optional)
    // const sortedHabits = [...habits].sort((a, b) => /* sorting logic */);

    return (
      <div className="space-y-3">
        {/* Use habits directly for now, add sorting later if needed */}
        {habits.map((habit) => (
          <div
            key={habit.id}
            className={`flex items-center space-x-3 border p-3 rounded-md hover:bg-muted/50 transition-colors group ${
              !habit.isActive ? "opacity-60" : ""
            }`}
          >
            <Checkbox
              id={`habit-${habit.id}`}
              checked={isTimestampToday(habit.lastCompletedDate)} // Use helper
              onCheckedChange={() => handleToggleHabit(habit)} // Updated handler
              aria-label={`Mark habit '${habit.name}' as ${isTimestampToday(habit.lastCompletedDate) ? 'not done' : 'done'} for today`}
              disabled={!habit.isActive}
            />
            <Label
              htmlFor={`habit-${habit.id}`}
              className={`flex-1 cursor-pointer ${
                isTimestampToday(habit.lastCompletedDate) ? "line-through text-muted-foreground" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-medium">{habit.name}</span>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  {habit.currentStreak > 0 && (
                    <span className="flex items-center text-orange-500">
                       <Flame className="h-3 w-3 mr-0.5" /> {habit.currentStreak}
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                     {formatGoal(habit)}
                  </span>
                </div>
              </div>
               {!habit.isActive && <span className="text-xs text-muted-foreground">(Inactive)</span>}
            </Label>
             {/* Delete Button - appears on hover */}
             <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive-foreground hover:bg-destructive/90" // Show on hover
                onClick={() => handleDeleteHabit(habit.id)}
                aria-label={`Delete habit ${habit.name}`}
                disabled={!habit.isActive} // Maybe allow deleting inactive habits?
             >
                 <Trash2 className="h-4 w-4" />
             </Button>
          </div>
        ))}
      </div>
    );
  };

  // --- JSX ---
  return (
    <main className="flex flex-col items-center justify-start min-h-screen p-4 pt-10 pb-10 bg-background text-foreground">
      {/* Title Card */}
      <Card className="w-full max-w-2xl mb-6">
         <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Your Personal Companion
            </CardTitle>
            <CardDescription className="text-center">
              Customize your companion's personality and check in with your mood.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
             <Button 
               onClick={appActions.openCompanionChat} // Use action from useAppActions
               disabled={!user} // Optional: Disable if user isn't logged in
               className="w-full max-w-xs mx-auto" // Make it centered and not full width
             >
                <MessageSquareText className="mr-2 h-4 w-4" /> {/* Added icon */}
               Chat with Your Companion
             </Button>
             {!user && <p className="text-xs text-muted-foreground mt-2">Log in to chat</p>}
          </CardContent>
      </Card>

      {/* Mood Selection Card */}
       <Card className="w-full max-w-2xl mb-6">
          <CardHeader>
            <CardTitle className="text-xl">How are you feeling today?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-center gap-3">
              {moodOptions.map((emoji) => (
                <Button
                  key={emoji}
                  variant={selectedMoodEmoji === emoji ? "default" : "outline"}
                  size="lg"
                  className={`text-2xl p-3 transition-transform duration-150 ease-in-out ${
                    selectedMoodEmoji === emoji ? "scale-110 ring-2 ring-primary ring-offset-2" : "hover:scale-105"
                  }`}
                  onClick={() => handleMoodSelect(emoji)}
                  aria-label={`Select mood: ${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
            {selectedMoodEmoji && (
               <div className="mt-4 text-center">
                 <Button
                   onClick={handleLogMood}
                   disabled={!user || userLoading}
                 >
                   Log Mood: {selectedMoodEmoji}
                 </Button>
                 {!user && <p className="text-xs text-muted-foreground mt-1">Log in to save mood</p>}
               </div>
            )}
          </CardContent>
       </Card>

      {/* Personality Selection Card */}
      <Card className="w-full max-w-2xl mb-6">
        <CardHeader>
           <CardTitle className="text-xl">Choose your Companion's tone:</CardTitle>
         </CardHeader>
         <CardContent>
           <RadioGroup
             value={personality}
             onValueChange={(value) => setPersonality(value as typeof personality)}
             className="space-y-3"
           >
             {personalityOptions.map((option) => (
               <div key={option.value} className="flex items-center space-x-3 border p-3 rounded-md hover:bg-muted/50 transition-colors">
                 <RadioGroupItem value={option.value} id={`personality-${option.value}`} />
                 <Label htmlFor={`personality-${option.value}`} className="flex-1 cursor-pointer text-base">
                   {option.label}
                 </Label>
               </div>
             ))}
           </RadioGroup>
            <p className="mt-4 text-center text-muted-foreground">
                 Current tone: {personalityOptions.find(p => p.value === personality)?.label || personality}
             </p>
         </CardContent>
      </Card>

      {/* Habit Tracking Card */}
      <Card className="w-full max-w-2xl mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Habit Tracking</CardTitle>
          <CardDescription>Add daily habits and mark your progress.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add Habit Form */}
          <div className="space-y-4 mb-6 border-b pb-4">
            <Input
              type="text"
              placeholder={user ? "Enter a new habit name..." : "Log in to add habits"}
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              disabled={!user || userLoading}
              aria-label="New habit name"
            />
            <RadioGroup
                value={newHabitGoalType}
                onValueChange={(value: Habit['goalType']) => {
                  setNewHabitGoalType(value);
                  // Reset goal value if switching back to completion
                  if (value === "completion") {
                    setNewHabitGoalValue("");
                  }
                }}
                className="flex flex-col sm:flex-row gap-4"
                aria-label="Habit goal type"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="completion" id="goal-completion" />
                  <Label htmlFor="goal-completion">Daily Completion</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="quantity" id="goal-quantity" />
                  <Label htmlFor="goal-quantity">Daily Quantity</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="duration_minutes" id="goal-duration" />
                  <Label htmlFor="goal-duration">Daily Duration (min)</Label>
                </div>
            </RadioGroup>

            {(newHabitGoalType === "quantity" || newHabitGoalType === "duration_minutes") && (
              <div className="flex items-center space-x-2">
                <Label htmlFor="goal-value" className="whitespace-nowrap">
                  Target {newHabitGoalType === "quantity" ? "Quantity" : "Minutes"}:
                </Label>
                <Input
                  id="goal-value"
                  type="number"
                  placeholder={`Enter target ${newHabitGoalType === "quantity" ? "amount" : "minutes"}`}
                  value={newHabitGoalValue}
                  onChange={(e) => setNewHabitGoalValue(e.target.value)}
                  min="1"
                  disabled={!user || userLoading}
                  className="w-full"
                  aria-label="Target goal value"
                />
              </div>
            )}
            <Button
              onClick={handleAddHabit}
              disabled={!user || userLoading || !newHabitName.trim() || ((newHabitGoalType === 'quantity' || newHabitGoalType === 'duration_minutes') && !newHabitGoalValue)}
              className="w-full sm:w-auto"
            >
              Add Habit
            </Button>
           </div>

          {/* Habit List */}
          {renderHabitList()} {/* Use render function */}

        </CardContent>
      </Card>

       {/* Weekly Progress Chart Card */}
       <Card className="w-full max-w-2xl mb-6">
         <CardHeader>
           <CardTitle className="text-xl">Weekly Progress</CardTitle>
           <CardDescription>Habits completed per day over the last week.</CardDescription>
         </CardHeader>
         <CardContent>
           {(userLoading || isHabitsLoading) && !habitError && (
             <Skeleton className="h-48 w-full rounded-md" />
           )}
           {!userLoading && !isHabitsLoading && habitError && (
             <p className="text-center text-destructive">Could not load progress data.</p>
           )}
           {!userLoading && !isHabitsLoading && !habitError && weeklyProgressData.length > 0 && (
             <ResponsiveContainer width="100%" height={200}>
               <BarChart data={weeklyProgressData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                 <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} fontSize={12} />
                 <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                 />
                 <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           )}
           {!userLoading && !isHabitsLoading && !habitError && weeklyProgressData.length === 0 && habits.length > 0 && (
                <p className="text-center text-muted-foreground">Complete some habits to see progress!</p>
           )}
           {!userLoading && !isHabitsLoading && !habitError && habits.length === 0 && (
                <p className="text-center text-muted-foreground">Add habits to track progress.</p>
           )}
         </CardContent>
       </Card>

     </main>
  );
}