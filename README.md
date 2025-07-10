# breathe-pulse
 
> Subtly watches your webcam (with permission!), detects rising stress or eye-strain, then suggests a personalized 60-second mindful pause—optimizing break style based on your feedback.

---

## 🌟 Overview

BreathePulse isn't just another break timer; it's your **intelligent wellness companion** designed for the modern knowledge worker. In today's demanding digital world, fatigue, eye strain, and stress can creep up unnoticed. BreathePulse acts as a gentle, ambient guardian for your well-being.

Using cutting-edge computer vision (CV) directly in your browser, it monitors subtle cues for signs of fatigue or stress. When it senses you might need a moment, it proactively suggests a tailored microbreak – perhaps a calming breathing exercise 😮‍💨, a quick posture reset 🤸, or even a fun mini-puzzle 🧩 to refresh your focus. The more you interact, the smarter it gets, learning which breaks work best for *you*.

**Our Goal:** To seamlessly integrate mindful moments into your workday, preventing burnout and enhancing focus, all with a **privacy-first, mindful, and minimalist approach !.**

---

## ✨ Key Features

*   **🧠 Emotion-Aware Monitoring:** Uses your webcam (securely, locally, with your explicit permission!) and CV models to detect early signs of eye strain and stress.
*   **🧘 Personalized Microbreaks:** Suggests relevant 60-second breaks:
    *   **Breathing Exercises:** Guided sessions to calm the nervous system.
    *   **Posture Adjustments:** Simple stretches to alleviate physical tension.
    *   **Mini-Puzzles:** Quick mental games to reset focus.
*   **💡 Intelligent Coaching:** A friendly AI coach delivers prompts and encouragement, powered by an LLM (like GPT-4o-mini).
*   **📈 Adaptive Learning:** Learns your preferences over time via feedback and interaction history to suggest the most effective breaks for you (simple Reinforcement Learning principles).
*   **💬 Companion Chat:** Engage in supportive conversations with your AI coach, which now remembers key points from your interactions for a more personalized experience.
*   **🔒 Privacy-Focused:** CV analysis happens locally where possible. Data handling prioritizes user privacy and control. (Note: Specific implementation details may evolve).
*   **🎨 Mindful Design:** A clean, calming interface using soft organic shapes, minimalist typography (likely Inter via Shadcn/Tailwind default), and subtle animations that align with the "mindful minimalism" principle. Adapts to your system's light/dark theme.

---

## 💻 Technology Stack

*   **Frontend:**
    *   ⚛️ **React:** Building the interactive user interface.
    *   🔷 **TypeScript:** For type safety and robust code.
    *   🎨 **Shadcn/ui:** Beautifully designed, accessible UI components.
    *   🍃 **Tailwind CSS:** Utility-first CSS for layout and styling.
    *   <0xF0><0x9F><0xA7><0xAE> **Zustand:** State management (e.g., for user profile, memory).
    *   🧭 **React Router:** Handling navigation between pages (Home, Profile, etc.).
    *   🧠 **Generated `brain` Client:** Type-safe communication with the backend API.
*   **Backend:**
    *   🐍 **Python:** Core backend language.
    *   🚀 **FastAPI:** High-performance web framework for creating APIs.
    *   🤖 **OpenAI API (gpt-4o-mini):** Powering the AI coaching messages and chat.
    *   👁️ **Computer Vision Libraries:** (Specific libraries may vary - e.g., OpenCV, Mediapipe accessed via JS or Python backend) For analyzing webcam feed.
    *   💾 **Databutton Storage (`db.storage`):** Storing necessary data like user preferences or feedback logs (if not in Firestore).
*   **Database & Auth:**
    *   🔥 **Firebase Authentication:** Secure user login and session management.
    *   📄 **Firestore:** NoSQL database likely used for storing user profiles, preferences, feedback, and companion chat memory.
*   **Platform:**
    *   ☁️ **Databutton:** Hosting, development environment, deployment, secrets management.

---

## 🏗️ Architecture & Key Components

*   **`ui/src/pages/`:** Contains the main application views:
    *   `App.tsx` (Home): Likely the main dashboard, including the webcam view and status indicators.
    *   `Profile.tsx`: User settings, preferences, potentially displaying companion memory (MYA-55).
    *   `Login.tsx` / `Logout.tsx`: Standard Firebase authentication pages.
    *   Potentially pages/components for specific break types (e.g., `BreathingBreak.tsx`).
*   **`ui/src/components/`:** Reusable UI elements:
    *   `WebcamMonitor.tsx`: Component responsible for accessing and displaying the webcam feed.
    *   `BreakSuggestionModal.tsx`: Modal dialog suggesting a break.
    *   `CoachChatInterface.tsx`: UI for interacting with the AI coach.
    *   `AppProvider.tsx`: Wraps the application, providing global context/state (like theme).
    *   Shared components built with Shadcn/ui.
*   **`ui/src/utils/`:** Frontend helpers:
    *   `memoryStore.ts`: Zustand store for managing and displaying companion chat memory (MYA-55, MYA-57).
    *   Other utility functions, type definitions (`types.ts`).
*   **`src/app/apis/`:** Backend FastAPI routers:
    *   `cv_analysis/`: Endpoints like `analyze_frame` to process webcam data.
    *   `coaching/`: Endpoints like `generate_coaching_message` and `chat_with_coach` (with memory via MYA-56).
    *   `feedback/`: Endpoints like `submit_feedback` to record user responses to breaks.
*   **`src/app/auth.py` / `ui/src/app/auth/`:** Backend and frontend logic for handling Firebase authentication.

---

## 🚀 Getting Started & Usage

1.  **Login:** Access the app and log in using your credentials (Firebase Auth).
2.  **Grant Permissions:** Allow webcam access when prompted. BreathePulse needs this to monitor for stress/fatigue cues.
3.  **Work:** Go about your usual work. BreathePulse runs subtly in the background.
4.  **Receive Suggestions:** When the app detects potential strain, a gentle notification or modal will appear suggesting a relevant microbreak.
5.  **Take the Break:** Follow the guided break (breathing, posture, puzzle).
6.  **Provide Feedback:** Let the app know if the break was helpful. This improves future suggestions.
7.  **Chat (Optional):** Interact with the AI coach for support or conversation via the chat interface.
8.  **Profile:** Visit your profile to adjust settings or review insights (like companion memory).

---

## 🤝 Contributing
Aashir Javed
Aditya Ranjan
Sumedha Gupta
