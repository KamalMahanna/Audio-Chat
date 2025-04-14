from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Dict


class ChatSummaryNameOutput(BaseModel):
    summarized_chat_name: str = Field(
        ..., description="Summarized chat name within 5 words."
    )


class ListChatSessionsOutput(BaseModel):
    chat_sessions: List[Dict[str, str]] = Field(
        ...,
        description="List of dictionaries containing the session_id and chat_name.",
        examples=[
            {"session_id": "123", "chat_name": "Chat 1"},
            {"session_id": "456", "chat_name": "Chat 2"},
        ],
    )


class ChatHistoryOutput(BaseModel):
    filtered_chat_history: List[Dict[Literal["ai", "human"], str]] = Field(
        ...,
        description="List of dictionaries containing the user/ai message.",
        examples=[{"ai": "Hello"}, {"human": "Hi"}],
    )

    @field_validator("filtered_chat_history")
    def only_one_key(cls, v):
        for i in v:
            if len(i) != 1:
                raise ValueError(
                    "Must not pass multiple items in each dictionary"
                )
        return v


# class Chat

if __name__ == "__main__":
    checking_chat_history = ChatHistoryOutput(
        filtered_chat_history=[{"ai": "Hello", "human": "hi"}, {"human": "Hi"}]
    )
    print(checking_chat_history)
