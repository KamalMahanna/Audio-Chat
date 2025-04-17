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

import markdown
from bs4 import BeautifulSoup

def md_to_text(md):
    """
    convert markdown to text
    """
    html = markdown.markdown(md)
    soup = BeautifulSoup(html, features='html.parser')
    return soup.get_text()

from utils.DataValidators import (
    ListChatSessionsOutput,
    ChatHistoryOutput,
    ChatSummaryNameOutput,
    EachChatHistory,
)
from utils.stt import transcribe_audio
import json
import warnings

warnings.filterwarnings("ignore")

# connect to the database
client = MongoClient("mongodb://localhost:27017/")
chat_history_db = client["LLM_chats_db"]
chat_histories_collection = chat_history_db["chat_histories"]
chat_meta_collection = chat_history_db["chat_meta"]

app = FastAPI()
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# for chat_name


@app.get("/get_SessionId_n_names", response_model=ListChatSessionsOutput)
def get_SessionId_n_names():
    """
    Get a list of all chat session IDs and their chat_names in the database.
    """
    chat_sessions = list(
        chat_meta_collection.find(
            {}, {"_id": 0, "SessionId": 1, "chat_name": 1}
        )
    )
    return ListChatSessionsOutput(chat_sessions=chat_sessions[::-1])


@app.post(
    "/get_chat_name/{SessionId}/{model}", response_model=ChatSummaryNameOutput
)
def get_chat_name(SessionId: str, model: str):
    """
    Get the chat name for a specific session.

    Args:
        SessionId (str): The ID of the chat session to get the meta for.

    Returns:
        ChatNameSummaryOutput: The chat meta for the specified session.
    """

    generated_chat_name = generate_chat_name(SessionId=SessionId, model=model)

    if chat_meta_collection.find_one({"SessionId": SessionId}):
        raise Exception("Session ID already exists in database.")

    # updating chat meta
    chat_meta_collection.insert_one(
        {"SessionId": SessionId, "chat_name": generated_chat_name}
    )

    return ChatSummaryNameOutput(summarized_chat_name=generated_chat_name)


@app.delete("/delete_session/{SessionId}")
def delete_chat_session(SessionId: str):
    """
    Delete a chat session from the database.

    Args:
        SessionId (str): The ID of the chat session to delete.
    """
    chat_histories_collection.delete_many({"SessionId": SessionId})
    chat_meta_collection.delete_one({"SessionId": SessionId})


@app.patch("/update_chat_name/{SessionId}/{new_chat_name}")
def update_chat_name(SessionId: str, new_chat_name: str):
    """
    Update the chat name for a specific session in the chat_meta database.

    Args:
        SessionId (str): The ID of the chat session to update.
        new_chat_name (str): The new name of the chat session.
    """
    # if SessionId exists in meta, update chat name in chat history
    if chat_meta_collection.find_one({"SessionId": SessionId}):
        chat_histories_collection.update_one(
            {"SessionId": SessionId}, {"$set": {"chat_name": new_chat_name}}
        )

    # if not, then add chat name to chat meta
    else:
        chat_meta_collection.insert_one(
            {"SessionId": SessionId, "chat_name": new_chat_name}
        )


@app.get("/chat_history/{SessionId}")
def chat_history(SessionId: str):
    """
    Get the chat history for a specific session.

    Args:
        SessionId (str): The ID of the chat session to get the history for.

    Returns:
        ChatHistoryOutput: 
            The chat history for the specified session, with each element
            being a dictionary containing the user/ai message.
    """
    # Get the chat history for the specified session
    chat_history_list = chat_histories_collection.find(
        {"SessionId": SessionId}
    )

    # Filter the chat history into a list of dictionaries
    filtered_chat_history = []

    # Iterate over the chat history and create a dictionary for each message
    for each_message in chat_history_list:
        id_ = each_message["_id"]
        the_mesage = each_message["History"]
        the_mesage = json.loads(the_mesage)
        filtered_chat_history.append(
            EachChatHistory(
                id_=str(id_),
                type=the_mesage["type"],
                content=the_mesage["data"]["content"],
            )
        )

    list_of_chat_history = ChatHistoryOutput(
        filtered_chat_history=filtered_chat_history
    )

    return [
        item.model_dump(by_alias=True)
        for item in list_of_chat_history.filtered_chat_history
    ]


@app.post("/text/{SessionId}/{model}/{question}")
def text_interaction(SessionId: str, model: str, question: str) -> str:
    """
    Get the response from the Generative AI model for a specific session 
    and question.

    Args:
        SessionId (str): The ID of the chat session to get the response for.
        question (str): The question to get the response for.

    Returns:
        str: The response from the Generative AI model.
    """
    response_text = chat(question, SessionId, model)
    print(model, question, SessionId, response_text)
    return response_text


@app.post("/audio/{SessionId}/{model}/{voice}")
async def voice_interaction(
    SessionId: str, model: str, voice: str, audio: UploadFile = File(...) # Changed 'file' to 'audio'
):
    """
    Get the audio from the Generative AI model for a specific session and question.

    Args:
        SessionId (str): The ID of the chat session to get the response for.
        voice (str): The voice to use for the text-to-speech model.
        audio (UploadFile): The uploaded audio file. # Changed 'file' to 'audio' in docstring

    Returns:
        StreamingResponse: The generated audio in wav format.
    """
    # Corrected content type check: Raise error if NOT audio
    if not audio.content_type.startswith("audio/"):
        return JSONResponse({"error": "Invalid file type. Expected audio/*"}, status_code=400)

    # transcribe the audio using the correct parameter name
    transcribed_text = transcribe_audio(await audio.read())

    # get response from the Generative AI model
    response = chat(transcribed_text, SessionId, model)
    print('response: ', response)
    #converting to regular text
    response = md_to_text(response)
    # get audio from the response
    audio = get_audio(text=response, voice=voice)
    print("audio is ready", "_" * 50)
    # return the audio
    return StreamingResponse(audio, media_type="audio/wav")


if __name__ == "__main__":

    SessionId = "test_session_1"

    while (question := input("You: ").strip()) != "exit":
        print(
            "Assistant:",
            text_interaction(
                question=question, SessionId=SessionId, model="gemma3:1b"
            ),
        )

    print(get_chat_name(SessionId=SessionId, model="gemma3:1b"))


