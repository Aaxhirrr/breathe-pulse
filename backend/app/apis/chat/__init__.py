import databutton as db
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from textblob import TextBlob # Add TextBlob import
from app.auth import AuthorizedUser
from typing import Literal
from app.apis.coaching import firestore_db, get_user_habits # Import Firestore client and habit fetching from coaching API
from google.cloud.firestore_v1.base_query import FieldFilter
import datetime
import pytz # For timezone-aware date comparison
from google.cloud import firestore # Import SERVER_TIMESTAMP

# Helper to check if a Firestore Timestamp is today in user's local time
def is_timestamp_today(timestamp, user_timezone_str='UTC'):
    """Checks if a Firestore timestamp falls on the current date in the user's timezone."""
    if not timestamp:
        return False

    # Ensure timestamp is timezone-aware (Firestore stores in UTC)
    if isinstance(timestamp, datetime.datetime) and timestamp.tzinfo is None:
        # If somehow it's naive, assume UTC as Firestore does
        timestamp = timestamp.replace(tzinfo=pytz.utc)
    elif not isinstance(timestamp, datetime.datetime):
         # If it's not a datetime object at all (e.g., from older data), cannot compare
         print(f"Warning: Received non-datetime object for timestamp comparison: {type(timestamp)}")
         return False

    try:
        user_timezone = pytz.timezone(user_timezone_str)
    except pytz.UnknownTimeZoneError:
        print(f"Warning: Unknown timezone '{user_timezone_str}'. Falling back to UTC.")
        user_timezone = pytz.utc # Fallback to UTC

    now_local = datetime.datetime.now(user_timezone)
    timestamp_local = timestamp.astimezone(user_timezone)

    return timestamp_local.date() == now_local.date()

# --- OpenAI Client ---
try:
    openai_api_key = db.secrets.get("OPENAI_API_KEY")
    if not openai_api_key:
        print("WARNING: OPENAI_API_KEY not set. Chat functionality will fail.")
        client = None
    else:
        client = OpenAI(api_key=openai_api_key)
except Exception as e:
    print(f"ERROR: Failed to initialize OpenAI client: {e}")
    client = None
# --- End OpenAI Client ---

router = APIRouter()

# Pydantic model for individual chat messages (matching frontend) is defined in request body below


# Define ChatMessage directly within ChatRequest for clarity in this API
class ChatMessageModel(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessageModel] # Expect a list of messages now
    personality: str | None = None # Allow frontend to send personality


class ChatResponse(BaseModel):
    reply: str # Changed from 'response' to 'reply'
    sentiment: str | None # Added sentiment analysis result

@router.post("/chat-with-coach", response_model=ChatResponse)
def chat_with_coach(request: ChatRequest, user: AuthorizedUser):
    """Handles a chat message history from the user to the AI coach, returns reply and sentiment."""

    if not client:
        raise HTTPException(status_code=500, detail="OpenAI client not configured.")

    # Extract messages from request
    incoming_messages = request.messages
    if not incoming_messages:
        raise HTTPException(status_code=400, detail="No messages provided.")

    user_id = user.sub
    print(f"Received {len(incoming_messages)} chat messages from user {user_id}. Last: {incoming_messages[-1].content}")

    # --- Initialize Context Variables ---
    user_habits_dict_list: list[dict] = []
    habits_fetched_successfully = False
    habit_summary = "(Habit tracking context is unavailable)" # Default/error message
    latest_mood_summary = "(Mood context is unavailable)" # Default/error message
    journal_entry_context = "(No personal journal entry provided yet)" # Default/error message
    companion_memory_context = "(No companion memory recorded yet)" # Default/error message

    # --- Fetch User Habits --- 
    if firestore_db:
        try:
            user_habits_dict_list = get_user_habits(user_id) # Fetch the raw list first
            habits_fetched_successfully = True # Mark as successful fetch attempt
            print(f"Fetched {len(user_habits_dict_list)} habits (raw) for user {user_id} via coaching API helper.")
        except Exception as e:
            print(f"[Chat API] Error fetching habits for user {user_id} using coaching helper: {e}")
            habit_summary = "(Error retrieving habit context)" # Update summary on error
            # habits_fetched_successfully remains False
    else:
        print("[Chat API] Firestore client unavailable for habits.")

    # --- Fetch Latest Mood Entry --- 
    if firestore_db:
        try:
            mood_entries_ref = firestore_db.collection(f"users/{user_id}/moodEntries")
            latest_mood_query = mood_entries_ref.order_by("timestamp", direction="DESCENDING").limit(1)
            mood_docs = list(latest_mood_query.stream())

            if mood_docs:
                latest_mood_data = mood_docs[0].to_dict()
                mood_emoji = latest_mood_data.get("moodEmoji")
                mood_timestamp = latest_mood_data.get("timestamp") # Firestore Timestamp
                if mood_emoji and mood_timestamp:
                    # TODO: Consider fetching user's actual timezone preference later
                    today_mood_prefix = "Today's mood: " if is_timestamp_today(mood_timestamp) else "Latest recorded mood: "
                    latest_mood_summary = f"{today_mood_prefix}{mood_emoji}"
                    print(f"Fetched latest mood for user {user_id}: {mood_emoji}")
                else:
                    latest_mood_summary = "(No complete mood entry found)" # Mood logged but maybe incomplete?
            else:
                latest_mood_summary = "(No mood entries recorded yet)"

        except Exception as e:
            print(f"[Chat API] Error fetching mood for user {user_id}: {e}")
            latest_mood_summary = "(Error retrieving mood context)" # Update summary on error
    else:
        print("[Chat API] Firestore client unavailable for mood.")

    # --- Fetch Profile Journal Entry ---
    if firestore_db:
        try:
            profile_doc_ref = firestore_db.collection('profiles').document(user_id)
            profile_doc = profile_doc_ref.get()
            if profile_doc.exists:
                profile_data = profile_doc.to_dict()
                journal_entry = profile_data.get("journalEntry")
                if journal_entry and isinstance(journal_entry, str) and journal_entry.strip():
                    # Limit length to avoid overly large prompts
                    max_len = 500
                    truncated_entry = (journal_entry[:max_len] + '...') if len(journal_entry) > max_len else journal_entry
                    journal_entry_context = f"User's Personal Journal Entry:\n{truncated_entry}"
                    print(f"Fetched journal entry for user {user_id}. Length: {len(journal_entry)}")
                # If entry exists but is empty/whitespace, keep default message
            # If profile doc doesn't exist, keep default message
        except Exception as e:
            print(f"[Chat API] Error fetching profile journal for user {user_id}: {e}")
            journal_entry_context = "(Error retrieving personal journal context)" # Update summary on error

    # --- Fetch Companion Memory ---
    if firestore_db:
        try:
            memory_ref = firestore_db.collection(f'users/{user_id}/companionMemory')
            # Fetch, order by timestamp, limit results (e.g., 10)
            # TODO: Make limit configurable or based on user input
            memory_query = memory_ref.order_by("timestamp", direction="DESCENDING").limit(10)
            memory_docs = list(memory_query.stream())

            if memory_docs:
                memory_lines = []
                # Reverse to show oldest first in prompt context
                for doc in reversed(memory_docs):
                    mem_data = doc.to_dict()
                    content = mem_data.get("memory_content", "")
                    timestamp = mem_data.get("timestamp") # Firestore Timestamp
                    if content and timestamp:
                        # Optional: Format timestamp for readability in prompt
                        ts_str = timestamp.strftime("%Y-%m-%d") if isinstance(timestamp, datetime.datetime) else "[unknown date]"
                        memory_lines.append(f"- [{ts_str}] {content}")

                if memory_lines:
                    companion_memory_context = "Known facts about the user (from memory):\n" + "\n".join(memory_lines)
                    print(f"Fetched {len(memory_lines)} memories for user {user_id}.")
                # If query ran but no valid memory docs found, keep default
            # If no docs found at all, keep default
        except Exception as e:
            print(f"[Chat API] Error fetching companion memory for user {user_id}: {e}")
            companion_memory_context = "(Error retrieving companion memory)" # Update summary on error
    else:
        print("[Chat API] Firestore client unavailable for companion memory.")


    # --- Process Habits into Summary (only if fetched successfully) ---
    if habits_fetched_successfully:
        if user_habits_dict_list: # Check if list has content
            active_habit_lines = []
            for habit_dict in user_habits_dict_list:
                if not habit_dict.get('isActive', False):
                    continue # Skip inactive habits

                name = habit_dict.get('name', 'Unnamed Habit')
                last_completed_ts = habit_dict.get('lastCompletedDate') # Firestore Timestamp or None
                streak = habit_dict.get('currentStreak', 0)

                # Determine completion status for today
                completed_today = is_timestamp_today(last_completed_ts)
                status = "Completed Today" if completed_today else "Not Done Today"

                line = f"- {name} [{status}]"
                if streak > 0:
                    line += f" (Current Streak: {streak} days)"
                active_habit_lines.append(line)

            if active_habit_lines:
                habit_summary = "User's Active Habits:\n" + "\n".join(active_habit_lines)
            else:
                # Habits fetched, but none were active
                habit_summary = "(User has no active habits)"
        else:
             # Habit fetch was successful, but the list was empty
             habit_summary = "(User has not set up any habits yet)"
    # else: habit_summary keeps its error/unavailable message set during fetch attempt


    # Print the context summaries that will be used in the prompt
    print(f"Mood Context for Prompt: {latest_mood_summary}")
    print(f"Habit Context for Prompt: {habit_summary}")
    print(f"Journal Context for Prompt: {journal_entry_context}")
    print(f"Companion Memory Context for Prompt: {companion_memory_context}")

    # --- Analyze Sentiment of Last User Message using TextBlob ---
    sentiment_category = "neutral" # Default
    sentiment_instructions = "" # Default instructions for prompt
    last_user_message_content = None
    if incoming_messages and incoming_messages[-1].role == 'user':
        last_user_message_content = incoming_messages[-1].content

    if last_user_message_content:
        try:
            blob = TextBlob(last_user_message_content)
            polarity = blob.sentiment.polarity
            print(f"TextBlob sentiment polarity: {polarity:.2f} for message: {last_user_message_content}")

            if polarity > 0.1:
                sentiment_category = "positive"
                sentiment_instructions = "The user's last message seems positive. Feel free to use positive emojis like 😊, 👍, 🎉 occasionally."
            elif polarity < -0.1:
                sentiment_category = "negative"
                sentiment_instructions = "The user's last message seems negative. Respond with extra empathy and support. Avoid overly cheerful emojis."
            else:
                sentiment_category = "neutral"
                sentiment_instructions = "The user's last message seems neutral. You can use neutral or gently positive emojis like 🙂, 🤔 occasionally."

        except Exception as e:
            print(f"[Chat API] Error during TextBlob sentiment analysis for user {user_id}: {e}")
            sentiment_category = "neutral" # Default to neutral on error
            sentiment_instructions = "(Sentiment analysis failed, proceed neutrally)"

    # --- Get Reply from AI --- 

    # Use personality from request, fallback to cheerful
    companion_personality = request.personality if request.personality else "cheerful"
    personality_tones = {
        "cheerful": "friendly, positive, and gently encouraging",
        "serious": "calm, clear, and direct",
        "motivating": "energetic, supportive, and action-oriented"
    }
    tone = personality_tones.get(companion_personality, "neutral and helpful") # Default to neutral if invalid key

    # Construct the system prompt
    # Note: Using triple double quotes for the f-string to handle potential quotes in summaries
    system_prompt = f"""
You are BreathePulse, an AI wellness companion with a {tone} personality.
You are chatting with a user (ID: {user_id}).
Keep your responses concise, supportive, and focused on wellness, mindfulness, or productivity.

SENTIMENT CONTEXT:
{sentiment_instructions} # Add sentiment instructions here

USER CONTEXT:
{latest_mood_summary}
{habit_summary}
{journal_entry_context}
{companion_memory_context} # Add companion memory here

INSTRUCTIONS:
- Look at the USER CONTEXT (Mood, Habits, Journal) and SENTIMENT CONTEXT provided above.
- Start your response by acknowledging the user's latest mood, especially if it was recorded today. Adapt your tone based on the mood, your personality ({tone}), and the SENTIMENT CONTEXT.
- Next, greet the user by the name mentioned in their Personal Journal Entry, if available.
- Then, briefly mention the status of their active habits for today.
- Finally, continue the conversation naturally based on the user's last message and the overall context.
- Keep your responses concise and supportive.
"""

    # Prepare messages for OpenAI (Combine system prompt and history)
    openai_messages = [
        {"role": "system", "content": system_prompt}
    ] + [msg.model_dump() for msg in incoming_messages] # Convert Pydantic models to dicts

    ai_reply = ""
    try:
        print(f"Sending chat history to OpenAI for user {user_id}. Personality: {companion_personality}, Sentiment: {sentiment_category}")
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=openai_messages,
            temperature=0.7,
            max_tokens=150
        )
        ai_reply = completion.choices[0].message.content.strip()
        print(f"Received reply from OpenAI for user {user_id}: {ai_reply}")

    except Exception as e:
        print(f"[Chat API] Error calling OpenAI for reply for user {user_id}: {e}")
        # Don't raise immediately, try sentiment analysis first, then return error if reply is empty
        ai_reply = "Sorry, I couldn't process that request. Please try again." # Fallback reply

    # --- Extract and Save New Memory from User's Last Message ---
    if last_user_message_content and firestore_db:
        try:
            print(f"Attempting memory extraction for user {user_id} from message: {last_user_message_content[:100]}...")
            extraction_prompt = (f"""
Analyze the following user message and extract the single most important new fact or piece of information the user shared about themselves, their preferences, their situation, or significant events. Output ONLY the extracted fact as a concise phrase or sentence. If no significant new information is shared, output \"NONE\".

User Message:
{last_user_message_content}

Extracted Fact:""")

            extraction_completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an information extraction assistant."},
                    {"role": "user", "content": extraction_prompt}
                ],
                temperature=0.2, # Low temp for factual extraction
                max_tokens=50
            )
            extracted_memory = extraction_completion.choices[0].message.content.strip()

            if extracted_memory and extracted_memory.upper() != "NONE":
                print(f"Extracted memory for user {user_id}: {extracted_memory}")
                memory_ref = firestore_db.collection(f'users/{user_id}/companionMemory')
                # Attempt to add the document and get the result
                update_time, doc_ref = memory_ref.add({
                    'memory_content': extracted_memory,
                    'timestamp': firestore.SERVER_TIMESTAMP # Use server timestamp
                })
                # Log the result, specifically the new document ID
                print(f"Firestore add operation completed for user {user_id}. Update time: {update_time}. New document ID: {doc_ref.id}")
            else:
                print(f"No significant new memory extracted for user {user_id}.")

        except Exception as e:
            # Log error but don't fail the entire chat response
            print(f"[Chat API] Error during memory extraction/saving for user {user_id}: {e}")

    # --- Return Response --- 
    # Use the sentiment_category determined by TextBlob
    return ChatResponse(reply=ai_reply, sentiment=sentiment_category)

