import {
  AnalyzeFrameData,
  AnalyzeFrameError,
  AnalyzeFrameRequest,
  ChatRequest,
  ChatWithCoachData,
  ChatWithCoachError,
  CheckHealthData,
  FeedbackChatData,
  FeedbackChatError,
  FeedbackChatRequest,
  FeedbackRequest,
  GenerateCoachingMessageData,
  GenerateCoachingMessageError,
  GenerateCoachingRequest,
  SubmitFeedbackData,
  SubmitFeedbackError,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Brain<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Check health of application. Returns 200 when OK, 500 when not.
   *
   * @name check_health
   * @summary Check Health
   * @request GET:/_healthz
   */
  check_health = (params: RequestParams = {}) =>
    this.request<CheckHealthData, any>({
      path: `/_healthz`,
      method: "GET",
      ...params,
    });

  /**
   * @description Analyzes a single image frame for facial landmarks and calculates stress.
   *
   * @tags dbtn/module:cv_analysis, dbtn/hasAuth
   * @name analyze_frame
   * @summary Analyze Frame
   * @request POST:/routes/analyze-frame
   */
  analyze_frame = (data: AnalyzeFrameRequest, params: RequestParams = {}) =>
    this.request<AnalyzeFrameData, AnalyzeFrameError>({
      path: `/routes/analyze-frame`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Receives simple, non-chat feedback from the user about a specific AI interaction. Currently logs to console, Firestore integration pending.
   *
   * @tags Feedback, dbtn/module:feedback_chat, dbtn/hasAuth
   * @name submit_feedback
   * @summary Submit Feedback
   * @request POST:/routes/feedback_chat/feedback
   */
  submit_feedback = (data: FeedbackRequest, params: RequestParams = {}) =>
    this.request<SubmitFeedbackData, SubmitFeedbackError>({
      path: `/routes/feedback_chat/feedback`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Handles chat interaction specifically for collecting break feedback, adding resources if distress detected.
   *
   * @tags Feedback, dbtn/module:feedback_chat, dbtn/hasAuth
   * @name feedback_chat
   * @summary Feedback Chat
   * @request POST:/routes/feedback_chat/chat
   */
  feedback_chat = (data: FeedbackChatRequest, params: RequestParams = {}) =>
    this.request<FeedbackChatData, FeedbackChatError>({
      path: `/routes/feedback_chat/chat`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Generates a dynamic coaching message using OpenAI based on stress level, a *selected* break type, and user habits.
   *
   * @tags dbtn/module:coaching, dbtn/hasAuth
   * @name generate_coaching_message
   * @summary Generate Coaching Message
   * @request POST:/routes/generate-coaching-message
   */
  generate_coaching_message = (data: GenerateCoachingRequest, params: RequestParams = {}) =>
    this.request<GenerateCoachingMessageData, GenerateCoachingMessageError>({
      path: `/routes/generate-coaching-message`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });

  /**
   * @description Handles a chat message history from the user to the AI coach, returns reply and sentiment.
   *
   * @tags dbtn/module:chat, dbtn/hasAuth
   * @name chat_with_coach
   * @summary Chat With Coach
   * @request POST:/routes/chat-with-coach
   */
  chat_with_coach = (data: ChatRequest, params: RequestParams = {}) =>
    this.request<ChatWithCoachData, ChatWithCoachError>({
      path: `/routes/chat-with-coach`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
}
