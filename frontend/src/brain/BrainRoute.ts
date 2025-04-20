import {
  AnalyzeFrameData,
  AnalyzeFrameRequest,
  ChatRequest,
  ChatWithCoachData,
  CheckHealthData,
  FeedbackChatData,
  FeedbackChatRequest,
  FeedbackRequest,
  GenerateCoachingMessageData,
  GenerateCoachingRequest,
  SubmitFeedbackData,
} from "./data-contracts";

export namespace Brain {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  export namespace check_health {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = CheckHealthData;
  }

  /**
   * @description Analyzes a single image frame for facial landmarks and calculates stress.
   * @tags dbtn/module:cv_analysis, dbtn/hasAuth
   * @name analyze_frame
   * @summary Analyze Frame
   * @request POST:/routes/analyze-frame
   */
  export namespace analyze_frame {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = AnalyzeFrameRequest;
    export type RequestHeaders = {};
    export type ResponseBody = AnalyzeFrameData;
  }

  /**
   * @description Receives simple, non-chat feedback from the user about a specific AI interaction. Currently logs to console, Firestore integration pending.
   * @tags Feedback, dbtn/module:feedback_chat, dbtn/hasAuth
   * @name submit_feedback
   * @summary Submit Feedback
   * @request POST:/routes/feedback_chat/feedback
   */
  export namespace submit_feedback {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = FeedbackRequest;
    export type RequestHeaders = {};
    export type ResponseBody = SubmitFeedbackData;
  }

  /**
   * @description Handles chat interaction specifically for collecting break feedback, adding resources if distress detected.
   * @tags Feedback, dbtn/module:feedback_chat, dbtn/hasAuth
   * @name feedback_chat
   * @summary Feedback Chat
   * @request POST:/routes/feedback_chat/chat
   */
  export namespace feedback_chat {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = FeedbackChatRequest;
    export type RequestHeaders = {};
    export type ResponseBody = FeedbackChatData;
  }

  /**
   * @description Generates a dynamic coaching message using OpenAI based on stress level, a *selected* break type, and user habits.
   * @tags dbtn/module:coaching, dbtn/hasAuth
   * @name generate_coaching_message
   * @summary Generate Coaching Message
   * @request POST:/routes/generate-coaching-message
   */
  export namespace generate_coaching_message {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = GenerateCoachingRequest;
    export type RequestHeaders = {};
    export type ResponseBody = GenerateCoachingMessageData;
  }

  /**
   * @description Handles a chat message history from the user to the AI coach, returns reply and sentiment.
   * @tags dbtn/module:chat, dbtn/hasAuth
   * @name chat_with_coach
   * @summary Chat With Coach
   * @request POST:/routes/chat-with-coach
   */
  export namespace chat_with_coach {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = ChatRequest;
    export type RequestHeaders = {};
    export type ResponseBody = ChatWithCoachData;
  }
}
