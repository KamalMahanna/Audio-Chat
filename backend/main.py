"""
Main entry point for the FastAPI application.

This module contains the main entry point for the FastAPI application, which
provides a RESTful API for interacting with the Generative AI model.
"""

from utils.llm import chat, generate_chat_name
from utils.tts import get_audio
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

from utils.DataValidators import ListChatSessionsOutput, ChatHistoryOutput, ChatSummaryNameOutput
from utils.stt import transcribe_audio

import warnings
warnings.filterwarnings("ignore")

# connect to the database
client = MongoClient("mongodb://localhost:27017/")
chat_history_db = client["LLM_chats_db"]
chat_histories_collection = chat_history_db["chat_histories"]
chat_meta_collection = chat_history_db["chat_meta"]

app = FastAPI()
origins = [
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# for chat_name

@app.get("/get_session_id_n_names", response_model=ListChatSessionsOutput)
def get_session_id_n_names():
    """
    Get a list of all chat session IDs and their chat_names in the database.
    """
    chat_sessions = list(chat_meta_collection.find({},{"_id": 0, 
                                                       "session_id": 1, 
                                                       "chat_name": 1}))
    return ListChatSessionsOutput(chat_sessions=chat_sessions)


@app.post("/get_chat_name/{session_id}/{model}", response_model=ChatSummaryNameOutput)
def get_chat_name(session_id: str, model: str) :
    """
    Get the chat name for a specific session.

    Args:
        session_id (str): The ID of the chat session to get the meta for.

    Returns:
        ChatNameSummaryOutput: The chat meta for the specified session.
    """
    
    generated_chat_name = generate_chat_name(session_id=session_id, model = model)
    
    if chat_meta_collection.find_one({"session_id": session_id}):
        raise Exception("Session ID already exists in database.")
    
    # updating chat meta 
    chat_meta_collection.insert_one({"session_id": session_id, "chat_name": generated_chat_name})
    
    return ChatSummaryNameOutput(summarized_chat_name=generated_chat_name)
    
@app.delete("/delete_session/{session_id}")
def delete_chat_session(session_id: str):
    """
    Delete a chat session from the database.

    Args:
        session_id (str): The ID of the chat session to delete.
    """
    chat_histories_collection.delete_many({"SessionId": session_id})
    chat_meta_collection.delete_one({"_id": session_id})

@app.patch("/update_chat_name/{session_id}/{new_chat_name}")
def update_chat_name(session_id: str, new_chat_name: str):
    """
    Update the chat name for a specific session in the chat_meta database.

    Args:
        session_id (str): The ID of the chat session to update.
        new_chat_name (str): The new name of the chat session.
    """
    # if session_id exists in meta, update chat name in chat history
    if chat_meta_collection.find_one({"session_id": session_id}):
        chat_histories_collection.update_one(
            {"session_id": session_id}, {"$set": {"chat_name": new_chat_name}}
        )
    
    # if not, then add chat name to chat meta
    else:
        chat_meta_collection.insert_one(
            {"session_id": session_id, "chat_name": new_chat_name}
        )
    


@app.get("/chat_history/{session_id}", response_model=ChatHistoryOutput)
def chat_history(session_id: str) :
    """
    Get the chat history for a specific session.

    Args:
        session_id (str): The ID of the chat session to get the history for.

    Returns:
        ChatHistoryOutput: The chat history for the specified session, with each element
            being a dictionary containing the user/ai message.
    """
    # Get the chat history for the specified session
    chat_history = chat_histories_collection.find({"SessionId": session_id})

    # Filter the chat history into a list of dictionaries
    filtered_chat_history = []

    # Iterate over the chat history and create a dictionary for each message
    for i, each_message in enumerate(chat_history):
        # Even indices are user messages, odd indices are AI messages
        if i % 2 == 0:
            the_message = {'user' : each_message.model_dump()['content']}
            filtered_chat_history.append(the_message)
        else:
            the_message = {'ai' : each_message.model_dump()['content']}
            filtered_chat_history.append(the_message)
    
    return ChatHistoryOutput(filtered_chat_history = filtered_chat_history)

@app.post("/text/{session_id}/{model}/{question}")
def text_interaction(session_id: str, model: str, question: str) -> str:
    """
    Get the response from the Generative AI model for a specific session and question.

    Args:
        session_id (str): The ID of the chat session to get the response for.
        question (str): The question to get the response for.

    Returns:
        str: The response from the Generative AI model.
    """
    return chat(question, session_id, model)

@app.post("/audio/{session_id}/{model}/{voice}")
async def voice_interaction(session_id: str, model: str, voice: str, file: UploadFile = File(...)):
    """
    Get the audio from the Generative AI model for a specific session and question.

    Args:
        session_id (str): The ID of the chat session to get the response for.
        voice (str): The voice to use for the text-to-speech model.
        file (UploadFile): The uploaded audio file.

    Returns:
        StreamingResponse: The generated audio in wav format.
    """
    if file.content_type.startswith("audio/"):
        return JSONResponse({"error": "Invalid file type"}, status_code=400)
    
    # transcribe the audio
    transcribed_text = transcribe_audio(file)

    # get response from the Generative AI model
    response = chat(transcribed_text, session_id, model)

    # get audio from the response
    audio = get_audio(text=response, voice=voice)

    # return the audio
    return StreamingResponse(audio, media_type="audio/wav")


if __name__ == "__main__":
    from utils.AudioUtils import play_audio

    while (question := input("You: ").strip()) != "exit":

        response = chat(question)
        print("Assistant:", response)
        audio = get_audio(response)
        play_audio(audio)
