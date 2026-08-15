import sounddevice as sd
import soundfile as sf

duration = 10
sample_rate = 16000

print("Recording for 10 seconds...")
print("Start speaking!")

audio = sd.rec(
    int(duration * sample_rate),
    samplerate=sample_rate,
    channels=1,
    dtype="float32"
)

sd.wait()

sf.write("test.wav", audio, sample_rate)

print("Recording complete!")
print("Saved as test.wav")