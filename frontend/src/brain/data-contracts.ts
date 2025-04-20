/** AnalyzeFrameRequest */
export interface AnalyzeFrameRequest {
  /** Imagedata */
  imageData: string;
}

/** AnalyzeFrameResponse */
export interface AnalyzeFrameResponse {
  /** Stresslevel */
  stressLevel: number;
  /** Facedetected */
  faceDetected: boolean;
}

/** ChatMessage */
export interface ChatMessage {
  /** Role */
  role: "user" | "assistant";
  /** Content */
  content: string;
}

/** ChatMessageModel */
export interface ChatMessageModel {
  /** Role */
  role: "user" | "assistant";
  /** Content */
  content: string;
}

/** ChatRequest */
export interface ChatRequest {
  /** Messages */
  messages: ChatMessageModel[];
  /** Personality */
  personality?: string | null;
}

/** ChatResponse */
export interface ChatResponse {
  /** Reply */
  reply: string;
  /** Sentiment */
  sentiment: string | null;
}

/** FeedbackChatRequest */
export interface FeedbackChatRequest {
  /** Messages */
  messages: ChatMessage[];
}

/** FeedbackChatResponse */
export interface FeedbackChatResponse {
  /** Reply */
  reply: string;
}

/**
 * FeedbackRequest
 * Request model for submitting feedback on an interaction. (Retained for potential future simple feedback)
 */
export interface FeedbackRequest {
  /**
   * Interaction Id
   * The ID of the interaction being reviewed.
   */
  interaction_id: string;
  /**
   * Ai Message
   * The specific AI message being reviewed.
   */
  ai_message: string;
  /**
   * Rating
   * A numerical rating (e.g., 1-5).
   */
  rating?: number | null;
  /**
   * Comment
   * User's textual feedback.
   */
  comment?: string | null;
  /**
   * Feedback Type
   * Type of feedback (e.g., 'accuracy', 'helpfulness', 'tone').
   * @default "general"
   */
  feedback_type?: string;
}

/**
 * FeedbackResponse
 * Response model confirming feedback submission. (Retained)
 */
export interface FeedbackResponse {
  /** Message */
  message: string;
  /**
   * Feedback Received At
   * @format date-time
   */
  feedback_received_at: string;
}

/** GenerateCoachingRequest */
export interface GenerateCoachingRequest {
  /** Stress Level */
  stress_level: number;
}

/** GenerateCoachingResponse */
export interface GenerateCoachingResponse {
  /** Message */
  message: string;
}

/** HTTPValidationError */
export interface HTTPValidationError {
  /** Detail */
  detail?: ValidationError[];
}

/** HealthResponse */
export interface HealthResponse {
  /** Status */
  status: string;
}

/** ValidationError */
export interface ValidationError {
  /** Location */
  loc: (string | number)[];
  /** Message */
  msg: string;
  /** Error Type */
  type: string;
}

export type CheckHealthData = HealthResponse;

export type AnalyzeFrameData = AnalyzeFrameResponse;

export type AnalyzeFrameError = HTTPValidationError;

export type SubmitFeedbackData = FeedbackResponse;

export type SubmitFeedbackError = HTTPValidationError;

export type FeedbackChatData = FeedbackChatResponse;

export type FeedbackChatError = HTTPValidationError;

export type GenerateCoachingMessageData = GenerateCoachingResponse;

export type GenerateCoachingMessageError = HTTPValidationError;

export type ChatWithCoachData = ChatResponse;

export type ChatWithCoachError = HTTPValidationError;
