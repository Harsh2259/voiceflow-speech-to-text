from fastapi import FastAPI, UploadFile, File, HTTPException
from faster_whisper import WhisperModel
import tempfile
import os

app = FastAPI(title="Voiceflow Whisper Service")

# Use a smaller model by default for cloud deployment.
# You can change this with the WHISPER_MODEL environment variable.
MODEL_NAME = os.getenv("WHISPER_MODEL", "small")

print(f"Loading Whisper model: {MODEL_NAME}")

model = WhisperModel(
    MODEL_NAME,
    device="cpu",
    compute_type="int8"
)

print("Whisper model loaded successfully.")


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "whisper",
        "model": MODEL_NAME
    }


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str | None = None
):
    temp_path = None

    try:
        suffix = os.path.splitext(file.filename or "")[1] or ".wav"

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp_file:
            temp_path = temp_file.name

            contents = await file.read()
            temp_file.write(contents)

        print(
            f"Transcribing {file.filename}, "
            f"language={language}"
        )

        segments, info = model.transcribe(
            temp_path,
            language=language,
            beam_size=5
        )

        text = "".join(
            segment.text for segment in segments
        ).strip()

        print(f"Detected language: {info.language}")
        print(f"Transcript: {text}")

        return {
            "text": text,
            "language": info.language
        }

    except Exception as e:
        print(f"Transcription error: {e}")

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)