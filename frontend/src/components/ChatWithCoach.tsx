import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge"; // Import Badge
import { Send, User, Bot, X } from 'lucide-react'; // Using specific icons
import { useAppStore, useAppActions } from "utils/useAppStore"; // Import app store/actions
import { useCompanionStore, Personality } from 'utils/companionStore'; // Import companion store and type
import brain from "brain";
import { auth } from "app"; // Import auth for getting token
import type { ChatRequest, ChatResponse, ChatMessage as ApiChatMessage } from "types"; // Import types

// Define the structure for displaying messages in the UI
interface DisplayChatMessage {
  role: "user" | "assistant";
  content: string;
  sentiment?: string; // Keep sentiment for user messages if needed later
}

// Restored DisplayChatMessage interface
interface DisplayChatMessage {
  role: "user" | "assistant";
  content: string;
  sentiment?: string; 
}

export function ChatWithCoach() {
  const isOpen = useAppStore((state) => state.isCompanionChatOpen);
  const { closeCompanionChat } = useAppActions();
  const { personality } = useCompanionStore((state) => state); // Restored personality

  // Restored state variables
  const [messages, setMessages] = useState<DisplayChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Still needed for disabling input/button
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Restored effect for initial message
  useEffect(() => {
    if (isOpen) {
      setMessages([
        {
          role: "assistant",
          content: `Hello! I'm your ${personality} companion. How can I help you today?`,
        },
      ]);
      setInput(""); 
      setIsLoading(false); 
    } 
    // Not clearing messages on close for now
  }, [isOpen, personality]);

  // Restored scroll effect
  useEffect(() => {
    if (scrollAreaRef.current) {
        setTimeout(() => {
            if (scrollAreaRef.current) {
              scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
            }
        }, 0);
    }
  }, [messages]);

  // Restored input handler
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  // Updated submit handler to call the actual API
  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const newUserMessage: DisplayChatMessage = { role: "user", content: trimmedInput };
    const updatedMessages = [...messages, newUserMessage]; // Add user message first

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare messages for the API (convert DisplayChatMessage to ApiChatMessage)
      const apiMessages: ApiChatMessage[] = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        // Sentiment is not sent to the backend for user messages in this structure
      }));

      const requestBody: ChatRequest = {
          messages: apiMessages,
          personality: personality // Send the selected personality
      };

      console.log("[ChatWithCoach Debug] Sending to API:", requestBody);

      // Call the API endpoint
      const response = await brain.chat_with_coach(requestBody);

      if (!response.ok) {
        console.error("API Error Response:", response);
        const errorData = await response.json().catch(() => ({ detail: "Unknown error decoding response" }));
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData.detail || 'No details'}`);
      }

      const data: ChatResponse = await response.json();
      console.log("[ChatWithCoach Debug] Received from API:", data);

      const assistantMessage: DisplayChatMessage = {
        role: "assistant",
        content: data.reply,
      };

      // Update the last user message with the received sentiment and add assistant reply
      setMessages((prevMessages) => {
        const updatedPrevMessages = [...prevMessages];
        const lastUserMessageIndex = updatedPrevMessages.length - 1;

        // Ensure the last message was the user's message we just processed
        if (updatedPrevMessages[lastUserMessageIndex]?.role === 'user') {
          updatedPrevMessages[lastUserMessageIndex] = {
            ...updatedPrevMessages[lastUserMessageIndex],
            sentiment: data.sentiment, // Add the sentiment here
          };
          console.log("[ChatWithCoach Debug] Added sentiment to user message:", data.sentiment);
        } else {
          console.warn("[ChatWithCoach] Could not find user message to attach sentiment to.");
        }

        // Add the new assistant message
        return [...updatedPrevMessages, assistantMessage];
      });

    } catch (error) {
      console.error("Failed to send message:", error);
      // Display an error message to the user in the chat
      const errorMessage: DisplayChatMessage = {
        role: "assistant",
        content: `Sorry, I encountered an error. ${error instanceof Error ? error.message : 'Please try again.'}`,
      };
      // Add error message to chat OR use a toast notification
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  console.log("[ChatWithCoach Debug] Rendering. isOpen:", isOpen); // Keep debug log

  const handleSheetOpenChange = (open: boolean) => {
      console.log("[ChatWithCoach Debug] Sheet open state changed:", open); // Keep debug log
      if (!open) {
          closeCompanionChat();
      }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="flex flex-col h-full sm:max-w-lg pt-0"> 
        <SheetHeader className="px-6 pt-6 pb-4 border-b"> 
          <SheetTitle>Chat with your {personality || 'Default'} Companion</SheetTitle> {/* Restored Title */}
           <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
             <X className="h-4 w-4" />
             <span className="sr-only">Close</span>
           </SheetClose>
        </SheetHeader>
        {/* Restored Chat Interface Structure */}
        <div className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1 px-4 py-4" ref={scrollAreaRef}>
                <div className="space-y-4 pr-2">
                    {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex items-end gap-2 ${ // Use items-end for better alignment with badge
                        message.role === "user" ? "justify-end" : ""
                        }`}
                    >
                        {message.role === "assistant" && (
                        <Avatar className="h-8 w-8 border self-start"> {/* Use self-start */}
                            <AvatarFallback><Bot size={16} /></AvatarFallback>
                        </Avatar>
                        )}

                        {/* Sentiment Badge for User Message (Rendered BEFORE bubble for right-alignment) */}
                        {message.role === "user" && message.sentiment && (
                          <Badge
                            variant="outline"
                            className={`text-xs font-normal px-1.5 py-0.5 ml-1 ${ // Add ml-1 for spacing
                              message.sentiment === 'positive' ? 'border-green-500 text-green-700 bg-green-50' :
                              message.sentiment === 'negative' ? 'border-red-500 text-red-700 bg-red-50' :
                              'border-gray-500 text-gray-700 bg-gray-50' // Neutral with subtle background
                            }`}
                          >
                            {message.sentiment.charAt(0).toUpperCase() + message.sentiment.slice(1)}
                          </Badge>
                        )}

                        <div
                        className={`rounded-lg p-3 max-w-[75%] text-sm break-words shadow-sm ${ // Adjusted max-w slightly
                            message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                        >
                        {message.content}
                        </div>
                        {message.role === "user" && (
                        <Avatar className="h-8 w-8 border self-start"> {/* Use self-start */}
                            <AvatarFallback><User size={16}/></AvatarFallback>
                        </Avatar>
                        )}
                    </div>
                    ))}
                    {isLoading && (
                    <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 border">
                            <AvatarFallback><Bot size={16} /></AvatarFallback>
                        </Avatar>
                        <div className="rounded-lg p-3 bg-muted text-muted-foreground shadow-sm">
                            <div className="flex space-x-1">
                                <span className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="h-2 w-2 bg-current rounded-full animate-bounce" />
                            </div>
                        </div>
                    </div>
                    )}
                </div>
            </ScrollArea>
            <SheetFooter className="px-6 py-4 border-t bg-background">
                <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
                    <Input
                        id="message-input" 
                        placeholder="Type your message..."
                        className="flex-1"
                        autoComplete="off"
                        value={input}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        aria-label="Chat message input"
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()} aria-label="Send message">
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
