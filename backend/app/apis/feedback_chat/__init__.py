import databutton as db
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from openai import OpenAI
from typing import List, Literal
import datetime # Added missing import
from app.auth import AuthorizedUser # Added missing import

# Initialize OpenAI client
# Ensure OPENAI_API_KEY secret is set in Databutton
try:
    client = OpenAI(api_key=db.secrets.get("OPENAI_API_KEY"))
except Exception as e:
    print(f"Failed to initialize OpenAI client: {e}")
    # Consider raising an exception or handling this case appropriately
    client = None


router = APIRouter(prefix="/feedback_chat", tags=["Feedback"]) # Kept prefix for grouping

# --- Pydantic Models ---

class FeedbackRequest(BaseModel):
    """Request model for submitting feedback on an interaction. (Retained for potential future simple feedback)"""
    interaction_id: str = Field(..., description="The ID of the interaction being reviewed.")
    ai_message: str = Field(..., description="The specific AI message being reviewed.")
    rating: int | None = Field(None, description="A numerical rating (e.g., 1-5).", ge=1, le=5)
    comment: str | None = Field(None, description="User's textual feedback.")
    feedback_type: str = Field("general", description="Type of feedback (e.g., 'accuracy', 'helpfulness', 'tone').")

class FeedbackResponse(BaseModel):
    """Response model confirming feedback submission. (Retained)"""
    message: str
    feedback_received_at: datetime.datetime


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class FeedbackChatRequest(BaseModel):
    messages: List[ChatMessage]


class FeedbackChatResponse(BaseModel):
    reply: str


# --- System Prompt for Feedback ---

FEEDBACK_SYSTEM_PROMPT = """
You are BreathePulse's feedback assistant. Your role is to briefly acknowledge the user's feedback about their recent break experience. Be encouraging and let them know their input is valuable. Keep responses concise (1-2 sentences).
Example interactions:
User: That stretch felt great!
Assistant: Glad to hear the stretch helped!
User: The breathing exercise was a bit confusing.
Assistant: Thanks for letting me know. We'll try to make the instructions clearer.
User: I didn't find the puzzle relaxing.
Assistant: Understood. Thanks for sharing your thoughts on the puzzle break.
"""

# --- ASU Resources Constant ---
# Combined the distress message preamble with resources for clarity
DISTRESS_RESOURCES_MESSAGE = """I'm sorry the suggested break didn't seem to help, and I sense you might still be feeling distressed. It's really important to reach out when you feel this way. Please consider connecting with a mental health professional or someone you trust. Your feelings are valid, and support is available.

Here are some resources that might be helpful:
*   ASU Counseling Services: 480-965-6146
*   ASU Health Services: 480-965-3349
*   ASU Help Center: 1-855-278-5080
*   National Suicide Prevention Lifeline: 1-800-273-8255 (or call/text 988)
*   CRISIS TEXT LINE: Text HOME To 741741
*   EMPACT (after hours/weekends): 480-921-1006
*   For emergencies, call 911. For non-emergencies on campus, call ASU Police: 480-965-3456.
*   Find more resources at eoss.asu.edu/resources or contact the Dean of Students Office: 480-965-6547."""


# --- Simple Feedback Endpoint (Retained for potential other uses) ---

@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest, user: AuthorizedUser):
    """
    Receives simple, non-chat feedback from the user about a specific AI interaction.
    Currently logs to console, Firestore integration pending.
    """
    user_id = user.sub
    received_time = datetime.datetime.now(datetime.timezone.utc)

    print("--- Feedback Received ---")
    print(f"User ID: {user_id}")
    print(f"Interaction ID: {request.interaction_id}")
    print(f"AI Message Reviewed: {request.ai_message[:100]}...") # Log snippet
    print(f"Rating: {request.rating}")
    print(f"Comment: {request.comment}")
    print(f"Feedback Type: {request.feedback_type}")
    print(f"Timestamp: {received_time.isoformat()}")
    print("-------------------------")

    # TODO: Implement Firestore logging using Firebase Admin SDK

    return FeedbackResponse(
        message="Feedback received successfully.",
        feedback_received_at=received_time
    )


# --- Sentiment Analysis Helper ---

def check_for_distress(text: str) -> bool:
    """Uses OpenAI to classify if the text indicates significant distress."""
    if not client:
        print("[Sentiment Check] OpenAI client not initialized. Skipping check.")
        return False

    try:
        print(f"[Sentiment Check] Analyzing text: '{text[:50]}...'")
        system_prompt = (
            "Classify the sentiment of the following user message regarding their recent break experience. "
            "Respond ONLY with 'negative_distress' if the user expresses significant ongoing stress, anxiety, "
            "overwhelm, needing help, feeling bad/worse, or strong negative feelings. "
            "Otherwise, respond ONLY with 'other'."
        )

        sentiment_completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            temperature=0.1,  # Low temp for consistent classification
            max_tokens=10,  # Expecting 'negative_distress' or 'other'
        )
        sentiment_result = sentiment_completion.choices[0].message.content.strip().lower()
        print(f"[Sentiment Check] Result: {sentiment_result}")
        return sentiment_result == "negative_distress"

    except Exception as e:
        print(f"[Sentiment Check] Error calling OpenAI for sentiment: {e}")
        return False  # Default to false on error to avoid showing resources unnecessarily

# --- Feedback Chat Endpoint ---

# NOTE: Changed path from /feedback-chat to /chat to match frontend client call
@router.post("/chat", response_model=FeedbackChatResponse)
def feedback_chat(request: FeedbackChatRequest, user: AuthorizedUser) -> FeedbackChatResponse:
    """Handles chat interaction specifically for collecting break feedback, adding resources if distress detected."""
    user_id = user.sub # Get user ID

    if not client:
        raise HTTPException(status_code=503, detail="OpenAI client not available")

    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    # --- Get Standard Acknowledgment ---
    openai_messages = [{"role": "system", "content": FEEDBACK_SYSTEM_PROMPT}]
    # Add user messages for context, ensuring they are dicts
    openai_messages.extend([msg.dict() for msg in request.messages])

    initial_reply = "Thanks for the feedback!"  # Default reply
    try:
        print(f"[Feedback Chat API] Getting initial reply for {len(openai_messages)} messages. User: {user_id}")
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=openai_messages,
            temperature=0.5,
            max_tokens=50,
        )
        response_content = completion.choices[0].message.content
        if response_content:
            initial_reply = response_content.strip()
        print(f"[Feedback Chat API] Initial reply: {initial_reply}")

    except Exception as e:
        print(f"[Feedback Chat API] Error getting initial reply: {e}")
        # Use default reply on error

    # --- Check User's Last Message for Distress ---
    final_reply = initial_reply
    user_last_message = next((msg.content for msg in reversed(request.messages) if msg.role == "user"), None)

    if user_last_message:
        is_distress = check_for_distress(user_last_message)
        if is_distress:
            print("[Feedback Chat API] Distress detected. Formatting resource message.")
            # Combine initial reply with the resources message
            final_reply = initial_reply + "\n\n" + DISTRESS_RESOURCES_MESSAGE
            print("[Feedback Chat API] Final reply contains resources.")
        else:
            print("[Feedback Chat API] No significant distress detected.")
            # final_reply remains initial_reply
    else:
        print("[Feedback Chat API] No user message found in history to analyze.")

    # Basic logging
    print(f"[Feedback Chat API] Final reply generated for user {user_id}. Distress detected: {is_distress if user_last_message else 'N/A'}")

    return FeedbackChatResponse(reply=final_reply)

