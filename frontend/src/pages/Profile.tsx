import React, { useState, useEffect, useCallback } from 'react';
import { useUserGuardContext, firebaseApp } from 'app';
import { getFirestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'; // Import Timestamp
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMemoryStore, MemoryItem } from "utils/memoryStore"; // Import memory store

// Helper function to format Date objects or null
const formatMemoryTimestamp = (date: Date | null): string => {
  if (!date) return "Date unknown";
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch (e) {
    console.error("Error formatting date:", e);
    return "Invalid date";
  }
};

const Profile: React.FC = () => {
  const { user } = useUserGuardContext();
  const [journalEntry, setJournalEntry] = useState<string>('');
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true); // Renamed
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const db = getFirestore(firebaseApp);

  // Get state and actions from the memory store
  const {
    memories,
    isLoading: isLoadingMemories,
    error: memoryError,
    subscribeToMemories,
    unsubscribeFromMemories,
  } = useMemoryStore();

  // Fetch existing journal entry on mount
  useEffect(() => {
    if (!user) return;

    const fetchEntry = async () => {
      setIsLoadingProfile(true);
      const profileDocRef = doc(db, 'profiles', user.uid);
      try {
        const docSnap = await getDoc(profileDocRef);
        if (docSnap.exists()) {
          setJournalEntry(docSnap.data()?.journalEntry || '');
        } else {
          console.log('No profile document found for user:', user.uid);
          setJournalEntry(''); // Initialize if no doc exists
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile data.');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchEntry();
  }, [user, db]);

  // Subscribe to memories
  useEffect(() => {
    if (user?.uid) {
      subscribeToMemories(user.uid);
    }
    // Cleanup function to unsubscribe when component unmounts or user changes
    return () => {
      unsubscribeFromMemories();
    };
  }, [user?.uid, subscribeToMemories, unsubscribeFromMemories]);

  // Save journal entry on blur
  const handleSave = useCallback(async () => {
    if (!user || isSaving) return;

    setIsSaving(true);
    const profileDocRef = doc(db, 'profiles', user.uid);
    try {
      await setDoc(profileDocRef, { journalEntry: journalEntry }, { merge: true });
      toast.success('Profile updated!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile data.');
    } finally {
      setIsSaving(false);
    }
  }, [user, db, journalEntry, isSaving]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJournalEntry(event.target.value);
  };

  // Combined loading state for initial page render
  if (isLoadingProfile) {
    // Show skeletons for both sections if profile is loading
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32"/>
            <Skeleton className="h-4 w-full mt-1"/>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <Card>
           <CardHeader>
             <Skeleton className="h-6 w-40"/>
           </CardHeader>
           <CardContent>
             <Skeleton className="h-20 w-full" />
           </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      {/* About You Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">About You</CardTitle>
          <CardDescription>
            Help me know who you are and I will be the best companion ever.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full gap-1.5">
            <Label htmlFor="journal-entry">Your instructions (My Memory 😉)</Label>
            <Textarea
              id="journal-entry"
              placeholder="Write anything here... thoughts, feelings, daily reflections."
              value={journalEntry}
              onChange={handleInputChange}
              onBlur={handleSave} // Save when the user clicks away
              rows={10}
              disabled={isSaving}
              className="resize-none"
            />
            {isSaving && <p className="text-sm text-muted-foreground">Saving...</p>}
          </div>
        </CardContent>
      </Card>

      {/* Companion Memory Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Companion Memory</CardTitle>
          <CardDescription>
            Key facts the companion has learned about you during your chats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px] w-full rounded-md border p-4">
            {isLoadingMemories ? (
              // Show skeleton loaders while memories are loading
              <div className="space-y-3">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-3/4 mt-2" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            ) : memoryError ? (
              // Show error message if fetching failed
              <p className="text-destructive text-sm">
                Error loading memories: {memoryError.message}
              </p>
            ) : memories.length === 0 ? (
              // Show message if no memories exist
              <p className="text-sm text-muted-foreground">
                No memories recorded yet.
              </p>
            ) : (
              // Display the list of memories
              <ul className="space-y-4">
                {memories.map((memory: MemoryItem) => (
                  <li key={memory.id} className="text-sm">
                    <p className="font-medium mb-1">{memory.memory_content}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMemoryTimestamp(memory.timestamp)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;

