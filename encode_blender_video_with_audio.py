import os
import subprocess
import numpy as np
import scipy.io.wavfile as wavfile

FRAMES_DIR = r"C:\Users\Mohamed Helmy\.gemini\antigravity\brain\f28bca43-ea48-4387-b9a9-708f3c7a049b\scratch\blender_frames"
OUT_DIR = r"D:\Stockly\apps\web\public\videos"
os.makedirs(OUT_DIR, exist_ok=True)

DURATION = 5.0
FPS = 30
SR = 44100
t = np.linspace(0, DURATION, int(SR * DURATION), False)
audio = np.zeros_like(t)

# 1. Sub-bass atmospheric drone
audio += 0.06 * np.sin(2 * np.pi * 50 * t) * np.exp(-0.3 * t)

# 2. Whoosh for Mobius spin (0.1s to 1.4s)
w_mask = (t >= 0.1) & (t <= 1.4)
w_t = t[w_mask] - 0.1
noise = np.random.normal(0, 0.08, len(w_t))
filter_envelope = np.sin(np.pi * (w_t / 1.3))
audio[w_mask] += noise * filter_envelope * 0.4

# 3. Emblem Lock Impact (1.3s)
sub_mask1 = (t >= 1.25) & (t <= 2.2)
st1 = t[sub_mask1] - 1.25
audio[sub_mask1] += 0.45 * np.sin(2 * np.pi * (80 * np.exp(-3.0 * st1) + 35) * st1) * np.exp(-2.0 * st1)

# 4. Mechanical Titanium Impacts for STOCKLY and WMS (2.1s and 2.5s)
for impact_t in [2.1, 2.5]:
    imp_mask = (t >= impact_t) & (t <= impact_t + 0.5)
    it = t[imp_mask] - impact_t
    click = np.sin(2 * np.pi * 1200 * it) * np.exp(-20 * it) * 0.25
    thud = np.sin(2 * np.pi * 65 * it) * np.exp(-6 * it) * 0.35
    audio[imp_mask] += click + thud

# 5. Laser Sweep Glint (2.7s to 4.0s)
laser_mask = (t >= 2.7) & (t <= 4.0)
lt = t[laser_mask] - 2.7
laser_freq = 400 + 800 * np.sin(np.pi * lt / 1.3)
audio[laser_mask] += 0.12 * np.sin(2 * np.pi * laser_freq * lt) * np.sin(np.pi * lt / 1.3)

# 6. Final Shimmer Chime Chord (3.8s to 5.0s)
chime_mask = (t >= 3.7) & (t <= 5.0)
ct = t[chime_mask] - 3.7
for f in [523.25, 659.25, 783.99, 1046.50, 1318.51]: # C Major 9
    audio[chime_mask] += 0.06 * np.sin(2 * np.pi * f * ct) * np.exp(-1.5 * ct)

wav_path = os.path.join(FRAMES_DIR, "blender_intro_audio.wav")
wavfile.write(wav_path, SR, (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16))
print(f"Synthesized audio to: {wav_path}")

final_mp4 = os.path.join(OUT_DIR, "stockly_blender_cinematic_intro.mp4")
ffmpeg_cmd = [
    "ffmpeg", "-y",
    "-framerate", str(FPS),
    "-i", os.path.join(FRAMES_DIR, "frame_%04d.png"),
    "-i", wav_path,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "17",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    final_mp4
]
print(f"Encoding final MP4 to: {final_mp4}")
subprocess.run(ffmpeg_cmd, check=True)
print(f"SUCCESS: Created final Blender Hollywood intro at: {final_mp4}")
