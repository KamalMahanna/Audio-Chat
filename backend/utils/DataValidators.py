from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Dict
from bson import ObjectId


class ChatSummaryNameOutput(BaseModel):
    summarized_chat_name: str = Field(
        ..., description="Summarized chat name within 5 words."
    )


class ListChatSessionsOutput(BaseModel):
    chat_sessions: List[Dict[str, str]] = Field(
        ...,
        description="List of dictionaries containing the SessionId and chat_name.",
        examples=[
            {"SessionId": "123", "chat_name": "Chat 1"},
            {"SessionId": "456", "chat_name": "Chat 2"},
        ],
    )

    @field_validator("chat_sessions")
    def valid_chat_sessions(cls, v):
        for chat_session in v:
            if (
                "SessionId" not in chat_session
                or "chat_name" not in chat_session
            ):
                raise ValueError(
                    "Each chat session must have a SessionId and chat_name"
                )
        return v


class EachChatHistory(BaseModel):

    id_: str = Field(..., alias="_id")
    type: Literal["ai", "human"]
    content: str

    @field_validator("id_")
    def valid_id(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return v

    @field_validator("type")
    def valid_type(cls, v):
        if v not in ["ai", "human"]:
            raise ValueError("Must be 'ai' or 'human'")
        return v

    class Config:
        populate_by_name = True


class ChatHistoryOutput(BaseModel):
    filtered_chat_history: List[EachChatHistory] = Field(
        ...,
        description="List of dictionaries containing the id, type, and content of each message.",
        examples=[
            {"_id": "123", "type": "ai", "content": "Hello"},
            {"_id": "456", "type": "human", "content": "Hi"},
        ],
    )


# class Chat

if __name__ == "__main__":
    checking_chat_history = ChatHistoryOutput(
        filtered_chat_history=[{"_id": "123", "type": "ai", "content": "Hello"}, {"_id": "456", "type": "human", "content": "Hi"}]
    )
    print(checking_chat_history)
