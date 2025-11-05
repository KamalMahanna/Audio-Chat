# Local Voice & Text Chatbot

A fully local, privacy-respecting chat platform enabling both text and audio conversations with advanced AI models. All data and inference run 100% on your machine—no cloud required. The system supports persistent chat history, voice input/output, and seamless one-shot deployment via Docker Compose.

---

## Features

- **Chat with Local AI Models:** Text and voice chat powered by Ollama and LangChain.
- **Audio Conversations:** Speak to your AI assistant and receive spoken responses using Whisper (speech-to-text) and Kokoro TTS (text-to-speech).
- **Persistent Storage:** All chat sessions and histories are stored locally in MongoDB.
- **LLM Framework:** Utilizes LangChain for building LLM applications.
- **Modern API:** FastAPI backend for robust, fast, and easy-to-extend APIs.
- **One-Command Setup:** Docker Compose orchestrates backend, frontend, database, and model services for a frictionless install.
- **No Cloud Dependency:** All components run locally for maximum privacy and control.

---

## Tech Stack

- **Backend:** FastAPI, LangChain, MongoDB, Ollama, Whisper, Kokoro TTS
- **Frontend:** (See `frontend/` folder for details)
- **Containerization:** Docker & Docker Compose

---

## Project Structure

Below is the folder structure (excluding frontend file details):

```shell
.
├── backend/                  # Backend API and AI logic
│   ├── Dockerfile            # Backend container build instructions
│   ├── main.py               # FastAPI entry point; defines REST endpoints for chat, audio, and session management
│   ├── requirements.txt      # Python dependencies for backend services
│   └── utils/                # Utility modules for modular functionality
│       ├── DataValidators.py # Data models and validation schemas
│       ├── llm.py            # LangChain and Ollama integration (LLM logic)
│       ├── stt.py            # Speech-to-text (Whisper) utilities
│       ├── tts.py            # Text-to-speech (Kokoro TTS) utilities
│       └── __init__.py       # Package marker
├── docker-compose.yml        # Orchestrates all services (frontend, backend, db, ollama) for unified deployment
├── frontend/                 # Contains frontend files (UI, assets, configs, etc.)
└── test.ipynb                # (Optional) Jupyter notebook for experiments or testing
```

---

## Installation & Usage

### Prerequisites

- Docker & Docker Compose installed on your system

### Environment Variables

To configure your Google API Key:

1.  **Rename the example environment file:**

    ```bash
    mv backend/.env.bak backend/.env
    ```

2.  **Open `backend/.env` and add your Google API Key:**

    ```
    GOOGLE_API_KEY=<your_google_api_key>
    ```

    You can obtain your `GOOGLE_API_KEY` from [Google AI Studio](https://aistudio.google.com/app/apikey).

### One-Shot Deployment

- **Text Chat:** Send and receive messages through the web UI. All interactions are processed locally with Ollama models.
- **Voice Chat:** Use your microphone to converse with the assistant. Speech is transcribed with Whisper and responses are spoken using Kokoro TTS.
- **Session Storage:** Every chat session and its history are saved in MongoDB for persistent recall.

---

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements and bug fixes.

---

## License

This project is licensed under the MIT License.

