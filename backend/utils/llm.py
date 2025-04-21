from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_ollama.llms import OllamaLLM
from langchain_mongodb.chat_message_histories import MongoDBChatMessageHistory

from typing import List, Literal
from ollama import Client
import os

ollama_url = os.environ.get("OLLAMA_URL")
ollama_client = Client(host=ollama_url)

def check_model(model: str) -> str:
    """
    This function takes a model name and check if its downloaded or not.
    If not downloaded it will download the model.
    """
    model_names = [i["model"] for i in ollama_client.list().model_dump()["models"]]
    if model not in model_names:
        try:
            ollama_client.pull(model)
        except Exception as e:
            raise Exception(
                f"""Failed to download model. Please ensure you have ollama 
                installed and entered correct model name: {str(e)}"""
            )


def chat(question: str, SessionId: str, system_prompt: str, model: str = "gemma3:1b") -> str:
    """
    This function takes a question and a session ID, and returns the response
    from the Generative AI model.

    It creates a prompt template, a chain with a Generative AI model,
    and a history with a MongoDB database. It then invokes the chain
    with the question and the session ID, and returns the response.
    """

    check_model(model=model)

    # Create the Generative AI model
    llm = OllamaLLM(model=model,keep_alive="10m", base_url = ollama_url)

    # Create the prompt template with system, history, and human messages
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", "{system_prompt}"),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{question}"),
        ]
    )

    # Create the chain with the prompt and the LLM
    chain = prompt | llm

    # Create the history with a MongoDB database
    chain_with_history = RunnableWithMessageHistory(
        chain,
        lambda session_id: MongoDBChatMessageHistory(
            session_id=session_id,
            connection_string="mongodb://db:27017",
            database_name="LLM_chats_db",
            collection_name="chat_histories",
        ),
        input_messages_key="question",
        history_messages_key="history",
    )

    # Create the config with the session ID
    config = {"configurable": {"session_id": SessionId}}

    # Invoke the chain with the question and the config
    response = chain_with_history.invoke({"question": question, "system_prompt": system_prompt}, config=config)

    return response


def get_chat_history(
    SessionId: str,
) -> List[Literal[HumanMessage, AIMessage]]:
    """
    This function takes a session ID and returns the chat history associated with it.

    It uses the MongoDBChatMessageHistory class to retrieve the chat history
    from the MongoDB database.
    """
    chat_message_history = MongoDBChatMessageHistory(
        connection_string="mongodb://db:27017/",
        database_name="LLM_chats_db",
        collection_name="chat_histories",
        session_id=SessionId,
    )

    human_messages = [
        each_message.content
        for each_message in chat_message_history.messages
        if isinstance(each_message, HumanMessage)
    ]
    return human_messages


def generate_chat_name(SessionId: str, model: str = "gemma3:1b") -> str:
    """
    This function takes a session ID and returns a string that summarizes 
    the chat history associated with it.

    It uses the ChatGoogleGenerativeAI class to generate a summary of 
    the chat history, and then returns the summary.
    """

    check_model(model=model)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                (
                    "Summarize the following chat which is asked by a user"
                    "within five words, which will be used for naming "
                    "the chat title. Ignore introductory chats like "
                    "hi, hello, who are you, etc. "
                    "Most importantly only answer the chat name, "
                    "don't add any additional information or any"
                    "explanation or preamble."
                ),
            ),
            (
                "human",
                """ Below i the questions asked by the user.
                ------------
                {complete_message}
                ------------
                Now summarize these chats within 5 words.
                """,
            ),
        ]
    )

    llm = OllamaLLM(model=model,keep_alive=0, base_url = ollama_url)

    # Create the chain with the prompt and the LLM
    chain = prompt | llm

    # Invoke the chain with the chat history
    response = chain.invoke({"complete_message": "\n".join(get_chat_history(SessionId))})

    return response


if __name__ == "__main__":

    # testing
    while (question := input("You: ")) != "exit":
        print("Assistant:", chat(question, SessionId="test_session"))

    # print(create_chat_name(session_id="test_session_3"))
