import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore, useAppActions } from "../utils/useAppStore"; // Correct import path
import { ChatMessage } from "../utils/useAppStore"; // Use ChatMessage type from store
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SendHorizontal } from 'lucide-react';
import brain from "brain"; // We'll need this for the API call later

export function FeedbackChatDialog() {
  console.log("[FeedbackChatDialog] Rendering..."); // <-- ADDED LOG
  const { isFeedbackChatOpen, feedbackChatHistory, isFeedbackLoading } = useAppStore();
  const { closeFeedbackChat, addFeedbackMessage, setFeedbackLoading } = useAppActions();

  const [inputValue, setInputValue] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    console.log("[FeedbackChatDialog] Scroll effect running. Ref:", scrollAreaRef.current); // <-- ADDED LOG
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [feedbackChatHistory]);

  const handleSendMessage = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isFeedbackLoading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmedInput };
    addFeedbackMessage(userMessage); // Add user message to store
    setInputValue("");
    setFeedbackLoading(true);

    // Prepare history for the API
    const apiMessages: ChatMessage[] = [...feedbackChatHistory, userMessage];

    try {
      console.log("[FeedbackChat] Calling feedback_chat API with messages:", apiMessages);
      // Call the new backend endpoint
      const response = await brain.feedback_chat({ messages: apiMessages });
      const data = await response.json(); // Assuming response structure matches FeedbackChatResponse

      const assistantResponse: ChatMessage = {
        role: "assistant",
        content: data.reply || "Thanks for the feedback!" // Use reply from API or fallback
      };
      addFeedbackMessage(assistantResponse); // Add assistant response to store
      console.log("[FeedbackChat] Received API response:", assistantResponse);

    } catch (error) {
      console.error("[FeedbackChat] Error calling feedback_chat API:", error);
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Sorry, I couldn't process your feedback right now.",
      };
      addFeedbackMessage(errorMessage);
    } finally {
      setFeedbackLoading(false);
    }

  }, [inputValue, addFeedbackMessage, setFeedbackLoading, feedbackChatHistory, isFeedbackLoading]);

  // Handle Enter key press in input
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isFeedbackLoading) {
      handleSendMessage();
    }
  };

  // Use Dialog's onOpenChange to sync with Zustand state
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      closeFeedbackChat();
    }
    // We don't control opening via this callback, only closing
  };

  console.log("[FeedbackChatDialog] Reached end of render function."); // <-- ADDED LOG
  return (
    <Dialog open={isFeedbackChatOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] flex flex-col h-[60vh]"> {/* Set height */}
        <DialogHeader>
          <DialogTitle>Break Feedback</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-4 mb-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {Array.isArray(feedbackChatHistory) && feedbackChatHistory.map((msg, index) => ( // <-- ADDED CHECK
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-lg px-3 py-2 max-w-[75%] ${ 
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isFeedbackLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 bg-muted text-muted-foreground animate-pulse">
                  Thinking...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
           <div className="flex items-center space-x-2 w-full"> 
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="How was that break? (Optional)"
              disabled={isFeedbackLoading}
              className="flex-grow"
            />
            <Button onClick={handleSendMessage} disabled={isFeedbackLoading || !inputValue.trim()} size="icon">
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
