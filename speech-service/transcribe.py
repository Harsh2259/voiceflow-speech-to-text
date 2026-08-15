from faster_whisper import WhisperModel

print("Loading Whisper model...")

model = WhisperModel(
    "large-v3",
    device="cpu",
    compute_type="int8"
)

print("Transcribing test.wav...")

segments, info = model.transcribe(
    "test.wav",
    language="hi",
    beam_size=5
)

print(f"Detected language: {info.language}")

print("\nTranscript:")

for segment in segments:
    print(segment.text)

print("\nDone!")