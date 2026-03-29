from dotenv import load_dotenv
import os
import requests
from flask import Flask, jsonify, render_template
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)

# Set this in your environment before running the backend.
ELEVENLABS_API_KEY = os.getenv("eleven_labs_api_key")
# Placeholder only: provide your real ElevenLabs agent id via env.
AGENT_ID = os.getenv("ELEVENLABS_AGENT_ID", "YOUR_ELEVENLABS_AGENT_ID")
# Placeholder only: provide the public base URL you expose this backend on.
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "YOUR_PUBLIC_BACKEND_URL")


CONVERSATION_COPY = {
    "english": {
        "lang": "en",
        "title": "Mena Care — Conversation",
        "assistant_name": "Mena",
        "ready_to_chat": "Ready to chat",
        "end_chat": "End Chat",
        "welcome_label": "🌸 Mena",
        "welcome_message": "Hi there! I'm Mena, and I'm here to support your menopause journey. Tap the mic to begin.",
        "quick_prompts_title": "Quick prompts",
        "tip_1": "• Ask me about hot flashes, sleep, mood, and energy",
        "tip_2": "• I can help you prepare menopause questions for your doctor",
        "tip_3": "• Need self-care or stress relief tips? Just ask",
        "tap_to_start": "Tap to start talking",
        "connecting": "Connecting...",
        "listening": "Listening...",
        "tap_to_end": "Tap to end",
        "connection_error": "Connection error",
        "chat_ended": "Chat ended",
        "tap_to_reconnect": "Tap to reconnect",
        "could_not_connect": "Could not connect",
        "assistant_talking": "Mena is talking...",
        "tap_to_start_again": "Tap to start again",
        "user_label": "You",
    },
    "nepali": {
        "lang": "ne",
        "title": "Mena Care — संवाद",
        "assistant_name": "Mena",
        "ready_to_chat": "कुराकानीका लागि तयार",
        "end_chat": "च्याट अन्त्य",
        "welcome_label": "🌸 Mena",
        "welcome_message": "नमस्ते! म Mena हुँ, र म तपाईंको रजोनिवृत्ति यात्रामा साथ दिन यहाँ छु। सुरु गर्न माइक थिच्नुहोस्।",
        "quick_prompts_title": "छिटो प्रश्नहरू",
        "tip_1": "• हट फ्ल्यास, निद्रा, मुड र ऊर्जाबारे सोध्नुहोस्",
        "tip_2": "• डाक्टरका लागि रजोनिवृत्ति सम्बन्धी प्रश्न तयार गर्न म सहयोग गर्छु",
        "tip_3": "• सेल्फ-केयर वा तनाव कम गर्ने उपाय चाहिन्छ? सोध्नुहोस्",
        "tap_to_start": "बोल्न सुरु गर्न थिच्नुहोस्",
        "connecting": "जोडिँदै छ...",
        "listening": "सुन्दै छ...",
        "tap_to_end": "अन्त्य गर्न थिच्नुहोस्",
        "connection_error": "जडान त्रुटि",
        "chat_ended": "च्याट समाप्त भयो",
        "tap_to_reconnect": "पुन: जडान गर्न थिच्नुहोस्",
        "could_not_connect": "जडान हुन सकेन",
        "assistant_talking": "Mena बोल्दै छ...",
        "tap_to_start_again": "फेरि सुरु गर्न थिच्नुहोस्",
        "user_label": "तपाईं",
    },
}


@app.route("/api/signed-url", methods=["GET"])
def get_signed_url():
    """
    Your React app calls this endpoint to get a one-time signed WebSocket URL.
    The frontend then connects directly to ElevenLabs over that WebSocket.
    """
    if not ELEVENLABS_API_KEY or not AGENT_ID or AGENT_ID == "YOUR_ELEVENLABS_AGENT_ID":
        return jsonify({"error": "Missing API key or agent ID configuration"}), 500

    try:
        resp = requests.get(
            f"https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id={AGENT_ID}",
            headers={"xi-api-key": ELEVENLABS_API_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        return jsonify({"signed_url": data.get("signed_url")})
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 502


@app.route("/")
def index():
    """Language selector landing page."""
    return render_template("index.html")


@app.route("/english")
def english_landing():
    """English menopause landing page."""
    return render_template("english.html")


@app.route("/nepali")
def nepali_landing():
    """Nepali menopause landing page."""
    return render_template("nepali.html")


@app.route("/conversation")
def conversation():
    """
    Full-screen conversation page. Open this as a popup or iframe from React:
      window.open('YOUR_PUBLIC_BACKEND_URL/conversation', 'ai-chat', 'width=440,height=640')
    """
    return render_template("conversation.html", t=CONVERSATION_COPY["english"])


@app.route("/conversation/english")
def conversation_english():
    """English conversation screen."""
    return render_template("conversation.html", t=CONVERSATION_COPY["english"])


@app.route("/conversation/nepali")
def conversation_nepali():
    """Nepali conversation screen."""
    return render_template("conversation.html", t=CONVERSATION_COPY["nepali"])


if __name__ == "__main__":
    print(f"API Key: {'present' if ELEVENLABS_API_KEY else '✗'}")
    print(f"Agent ID: {'present' if AGENT_ID and AGENT_ID != 'YOUR_ELEVENLABS_AGENT_ID' else '✗'}")
    print()
    print("  Demo page:        YOUR_PUBLIC_BACKEND_URL")
    print("  Conversation:     YOUR_PUBLIC_BACKEND_URL/conversation")
    print("  Signed URL API:   YOUR_PUBLIC_BACKEND_URL/api/signed-url")
    if PUBLIC_BASE_URL != "YOUR_PUBLIC_BACKEND_URL":
        print()
        print(f"  Configured URL:   {PUBLIC_BASE_URL}")
    print()
    app.run(debug=True, port=8000, host="0.0.0.0")
