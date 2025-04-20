import databutton as db
import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI
import os
import json
from datetime import datetime, timezone # Added datetime and timezone
from app.auth import AuthorizedUser # Import AuthorizedUser

# --- Firebase Initialization (Attempt to initialize only once) ---
try:
    if not firebase_admin._apps:
        service_account_json_str = db.secrets.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if not service_account_json_str:
            print("WARNING: FIREBASE_SERVICE_ACCOUNT_JSON secret not found. Firestore integration will fail.")
            firestore_db = None # Ensure firestore_db is defined even on failure
        else:
            service_account_info = json.loads(service_account_json_str)
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized successfully.")
            firestore_db = firestore.client()
    else:
        # Already initialized, just get the client
        firestore_db = firestore.client()
except Exception as e:
    print(f"ERROR: Firebase Admin SDK initialization failed: {e}")
    firestore_db = None
# --- End Firebase Initialization ---


# --- OpenAI Client ---
try:
    openai_api_key = db.secrets.get("OPENAI_API_KEY")
    if not openai_api_key:
        print("WARNING: OPENAI_API_KEY not set. Coaching message generation will fail.")
        client = None
    else:
        client = OpenAI(api_key=openai_api_key)
except Exception as e:
    print(f"ERROR: Failed to initialize OpenAI client: {e}")
    client = None
# --- End OpenAI Client ---

router = APIRouter()

import random # Add random import

# --- Microbreak Library ---
BREAK_ACTIVITIES = [
    # Breathing
    {"title": "Box Breathing", "category": "Breathing", "description": "Inhale for 4s, hold for 4s, exhale for 4s, hold for 4s. Repeat."},
    {"title": "4-7-8 Breathing", "category": "Breathing", "description": "Inhale for 4s, hold for 7s, exhale slowly for 8s."},
    {"title": "Diaphragmatic Breathing", "category": "Breathing", "description": "Focus on deep belly breaths, letting your stomach expand."},
    # Stretching
    {"title": "Neck Rolls", "category": "Stretching", "description": "Gently roll your head side to side, then front to back."},
    {"title": "Shoulder Shrugs", "category": "Stretching", "description": "Lift your shoulders towards your ears, hold, then release."},
    {"title": "Wrist & Finger Stretch", "category": "Stretching", "description": "Extend arms, flex wrists up/down, spread fingers wide."},
    {"title": "Torso Twist", "category": "Stretching", "description": "While seated, gently twist your upper body side to side."},
    # Eye Strain Relief
    {"title": "20-20-20 Rule", "category": "Eyes", "description": "Look at something 20 feet away for 20 seconds."},
    {"title": "Eye Palming", "category": "Eyes", "description": "Rub hands together, gently cup over closed eyes, breathe deeply."},
    {"title": "Focus Shift", "category": "Eyes", "description": "Alternate focus between a near object and a distant one."},
    # Quick Mental Break
    {"title": "Mindful Observation", "category": "Mind", "description": "Notice 3 things you can see and 2 things you can hear right now."},
    {"title": "Quick Gratitude", "category": "Mind", "description": "Think of one small thing you're grateful for."},
    # {"title": "Simple Puzzle (Future)", "category": "Mind", "description": "Engage with a very short mental puzzle."}, # Placeholder for future
]
# --- End Microbreak Library ---


class GenerateCoachingRequest(BaseModel):
    stress_level: float
    # break_title: str # Removed - API will now select the break

class GenerateCoachingResponse(BaseModel):
    message: str

# --- Helper to fetch habits ---
def get_user_habits(user_id: str) -> list[dict]:
    """Fetches habits for a given user_id from Firestore."""
    if not firestore_db:
        print("Firestore client not available.")
        return []
    try:
        habits_ref = firestore_db.collection('users').document(user_id).collection('habits')
        docs = habits_ref.stream()
        habits = []
        for doc in docs:
            habit_data = doc.to_dict()
            habit_data['id'] = doc.id # Include the document ID if needed later
            habits.append(habit_data)
        print(f"Fetched {len(habits)} habits for user {user_id}")
        return habits
    except Exception as e:
        print(f"Error fetching habits for user {user_id}: {e}")
        return []
# --- Helper to fetch/update recent breaks ---
MAX_RECENT_BREAKS = 3 # Store the last 3 suggested breaks to avoid repetition

def get_recent_breaks(user_id: str) -> list[str]:
    """Fetches the titles of the most recently suggested breaks for a user."""
    if not firestore_db:
        return []
    try:
        doc_ref = firestore_db.collection('users').document(user_id)
        doc = doc_ref.get()
        if doc.exists:
            user_data = doc.to_dict()
            recent_breaks = user_data.get('recentBreakSuggestions', [])
            # Ensure it returns only titles (or identifiers)
            return [b.get('title') for b in recent_breaks if isinstance(b, dict) and 'title' in b]
        return []
    except Exception as e:
        print(f"Error fetching recent breaks for user {user_id}: {e}")
        return []

def store_recent_break(user_id: str, selected_break: dict):
    """Stores the newly selected break, keeping only the last MAX_RECENT_BREAKS."""
    if not firestore_db:
        return
    try:
        doc_ref = firestore_db.collection('users').document(user_id)
        # Prepare the data to store - include timestamp for potential future use
        break_to_store = {
            'title': selected_break.get('title'),
            'category': selected_break.get('category'),
            'timestamp': firestore.SERVER_TIMESTAMP # Use server timestamp
        }
        # Use arrayUnion and transaction/batch for atomicity if needed, but simple update is ok for now
        # Get current list, add new, trim, then set
        doc = doc_ref.get()
        if doc.exists:
            user_data = doc.to_dict()
            recent_breaks = user_data.get('recentBreakSuggestions', [])
        else:
            recent_breaks = []

        # Add the new break to the beginning
        recent_breaks.insert(0, break_to_store)
        # Keep only the most recent ones
        trimmed_breaks = recent_breaks[:MAX_RECENT_BREAKS]
        
        doc_ref.set({'recentBreakSuggestions': trimmed_breaks}, merge=True)
        print(f"Stored recent break '{selected_break.get('title')}' for user {user_id}")

    except Exception as e:
        print(f"Error storing recent break for user {user_id}: {e}")

# --- End Helper ---


def is_timestamp_today(timestamp) -> bool:
    """Checks if a Firestore Timestamp object represents today's date (UTC)."""
    if not timestamp:
        return False
    # Ensure timestamp is timezone-aware (Firestore timestamps are typically UTC)
    # If it's naive, assume UTC as Firestore stores in UTC.
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    
    today_utc = datetime.now(timezone.utc).date()
    timestamp_date_utc = timestamp.astimezone(timezone.utc).date()
    return timestamp_date_utc == today_utc

@router.post("/generate-coaching-message")
def generate_coaching_message(request: GenerateCoachingRequest, user: AuthorizedUser) -> GenerateCoachingResponse: # Added user: AuthorizedUser
    """Generates a dynamic coaching message using OpenAI based on stress level, a *selected* break type, and user habits."""

    if not client:
         raise HTTPException(status_code=500, detail="OpenAI client not configured.")
    # Allow proceeding without firestore for now, but log warning
    if not firestore_db:
         print("Warning: Firestore not configured or unavailable, generating message without habit context.")

    user_id = user.sub # Get user ID from the authorized user
    print(f"Generating coaching for user: {user_id}")

    # Fetch habits if firestore is available
    habits = []
    if firestore_db:
        habits = get_user_habits(user_id)

    habit_summary = "No habit data available."
    if habits:
        habit_lines = []
        for habit in habits:
            # Use the helper function to check completion based on timestamp
            is_completed = is_timestamp_today(habit.get('lastCompletedDate'))
            status = "Completed" if is_completed else "Not Completed"
            habit_lines.append(f"- {habit.get('name', 'Unnamed Habit')}: {status}")
        if habit_lines:
            habit_summary = "Today's Habit Status:\n" + "\n".join(habit_lines)
        else:
            habit_summary = "No habits tracked yet."
    elif not firestore_db:
        habit_summary = "(Habit tracking data is currently unavailable)"

    print(f"Habit summary for prompt: {habit_summary}")

    # Basic interpretation of stress level for prompt context
    stress_context = "normal"
    if request.stress_level >= 40: # Corresponds to red zone
        stress_context = "quite high"
    elif request.stress_level >= 30: # Corresponds to yellow zone
        stress_context = "elevated"

    # --- Select a Break Activity ---
    recent_break_titles = get_recent_breaks(user_id)
    print(f"Recent breaks to avoid: {recent_break_titles}")
    
    # Filter out recent breaks
    available_breaks = [b for b in BREAK_ACTIVITIES if b['title'] not in recent_break_titles]
    
    # If all breaks have been suggested recently, fallback to the full list
    if not available_breaks:
        print("All breaks suggested recently, selecting from full list.")
        available_breaks = BREAK_ACTIVITIES

    selected_break = random.choice(available_breaks)
    selected_break_title = selected_break["title"]
    print(f"Selected break: {selected_break_title} (Category: {selected_break.get('category', 'N/A')})")
    
    # Store the selected break in history
    store_recent_break(user_id, selected_break)
    # --- End Break Selection ---

    # Get companion personality (assuming it might be stored or passed later, default for now)
    # TODO: Fetch personality from Firestore user profile if stored
    companion_personality = "cheerful" # Defaulting to cheerful
    personality_tones = {
        "cheerful": "friendly, positive, and gently encouraging",
        "serious": "calm, clear, and direct",
        "motivating": "energetic, supportive, and action-oriented"
    }
    tone = personality_tones.get(companion_personality, "neutral")

    # Construct the prompt for OpenAI
    system_prompt = f"""
You are BreathePulse, an AI microbreak coach with a {tone} personality. Your goal is to provide a brief, supportive message suggesting a specific break activity.
The user's current estimated stress level context is '{stress_context}'.
Consider the user's habit progress for today when crafting the message. Be mindful and avoid being pushy.
Generate ONLY the coaching message itself, maximum 2 short sentences. Do NOT include greetings like "Hi there" or sign-offs.
"""

    user_prompt = f"""
Suggest a '{selected_break_title}' break. It falls under the category '{selected_break.get('category', 'General')}'. Briefly describe or hint at how to do it if appropriate for the tone.

User's Habit Status:
{habit_summary}

Generate the coaching message:
"""

    try:
        print(f"Sending prompt to OpenAI (model gpt-4o-mini): System: {system_prompt}, User: {user_prompt}")
        completion = client.chat.completions.create(
            model="gpt-4o-mini", # Explicitly using gpt-4o-mini
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=100 # Keep it short
        )

        generated_message = completion.choices[0].message.content.strip()

        # Basic fallback if message is empty
        if not generated_message:
            generated_message = f"Maybe a quick '{selected_break_title}' break would feel good right now?"

        print(f"[Coaching API] Generated message: {generated_message}") # Log for debugging
        return GenerateCoachingResponse(message=generated_message)

    except Exception as e:
        print(f"[Coaching API] Error calling OpenAI: {e}")
        # Fallback message on error
        fallback_message = f"How about a short '{selected_break_title}' break to reset?"
        return GenerateCoachingResponse(message=fallback_message)

# Note: Make sure 'firebase-admin' is in requirements.txt and FIREBASE_SERVICE_ACCOUNT_JSON secret is set.