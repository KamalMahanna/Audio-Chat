FROM python:3.11-slim
WORKDIR /app

COPY . .

RUN apt update && apt install -y ffmpeg espeak-ng
RUN pip install uv
RUN uv pip install --system -r requirements.txt

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]