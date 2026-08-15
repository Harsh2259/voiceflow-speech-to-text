from fastapi import FastAPI, File, UploadFile, Form
from faster_whisper import WhisperModel
import tempfile
import os
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Voiceflow Local Speech-to-Text Service")

# CPU-friendly starting configuration.
# base gives a good balance between speed and accuracy.
MODEL_SIZE = "base"

logging.info("Loading faster-whisper model: %s", MODEL_SIZE)

model = WhisperModel(
    MODEL_SIZE,
    device="cpu",
    compute_type="int8"
)

logging.info("Whisper model loaded successfully")


@app.get("/health")
def health():
    return {
        "status": "UP",
        "service": "voiceflow-stt",
        "model": MODEL_SIZE,
        "device": "cpu"
    }


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str | None = Form(default=None)
):
    suffix = ".webm"

    if file.filename:
        extension = os.path.splitext(file.filename)[1]
        if extension:
            suffix = extension

    temp_path = None

    try:
        audio_bytes = await file.read()

        if not audio_bytes:
            return {
                "text": "",
                "language": language
            }

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        logging.info(
            "Transcribing %d bytes, requested language=%s",
            len(audio_bytes),
            language
        )

        # We intentionally allow Whisper to detect the language when
        # language is not supplied. This is useful for multilingual speech.
        segments, info = model.transcribe(
            temp_path,
            language=language,
            beam_size=5,
            vad_filter=True,
            condition_on_previous_text=True
        )

        text_parts = []

        for segment in segments:
            text = segment.text.strip()

            if text:
                text_parts.append(text)

        text = " ".join(text_parts).strip()

        detected_language = info.language

        logging.info(
            "Transcription completed. language=%s text=%s",
            detected_language,
            text
        )

        return {
            "text": text,
            "language": detected_language,
            "language_probability": info.language_probability
        }

    except Exception as exc:
        logging.exception("Transcription failed")

        return {
            "text": "",
            "language": language,
            "error": str(exc)
        }

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass