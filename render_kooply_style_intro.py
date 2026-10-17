"""
Stockly WMS - Broadcast Grade Geometric Kinetic Logo Intro
Inspired by the KOOPLY After Effects Logo Animation breakdown:
- Kinetic Architectural Construction Grid with dynamic guide lines & dimension marks
- Geometric Modular Deconstruction of the 3D Mobius S conveyor into colored capsules
- Precision Penner Bezier Easing & Overshoot (After Effects Graph Editor curves)
- Micro-roller conveyor physics and neon data pulses
- 3D Mobius S Master Emblem Hero Docking
- Full HD 1080p, 30 FPS, with Synthesized Cinema-Grade Audio
"""

import os
import math
import time
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import scipy.io.wavfile as wavfile
import subprocess

WIDTH = 1920
HEIGHT = 1080
FPS = 30
DURATION = 8.0
TOTAL_FRAMES = int(DURATION * FPS)

OUT_DIR = r"D:\Stockly\apps\web\public\videos"
os.makedirs(OUT_DIR, exist_ok=True)
FRAMES_DIR = r"C:\Users\Mohamed Helmy\.gemini\antigravity\brain\f28bca43-ea48-4387-b9a9-708f3c7a049b\scratch\kooply_frames"
os.makedirs(FRAMES_DIR, exist_ok=True)

# 1. Load Photorealistic 3D Mobius S
EMBLEM_PATH = r"D:\Stockly\apps\web\public\brand\mobius_s_3d.png"
emblem_img = Image.open(EMBLEM_PATH).convert("RGBA")

# Colors
COLOR_SAPPHIRE = (37, 99, 235)      # #2563EB
COLOR_CYAN     = (0, 229, 255)      # #00E5FF
COLOR_EMERALD  = (0, 229, 153)      # #00E599
COLOR_AMBER    = (245, 158, 11)     # #F59E0B
COLOR_WHITE    = (255, 255, 255)

# Font
try:
    font_mono = ImageFont.truetype("consolab.ttf", 14)
    font_sub  = ImageFont.truetype("arialbd.ttf", 20)
    font_dim  = ImageFont.truetype("consola.ttf", 11)
except:
    font_mono = font_sub = font_dim = ImageFont.load_default()

# Penner Easing Functions
def ease_out_back(t, c=1.70158):
    if t <= 0.0: return 0.0
    if t >= 1.0: return 1.0
    t = t - 1.0
    return t * t * ((c + 1.0) * t + c) + 1.0

def ease_in_out_cubic(t):
    if t <= 0.0: return 0.0
    if t >= 1.0: return 1.0
    if t < 0.5:
        return 4.0 * t * t * t
    else:
        p = 2.0 * t - 2.0
        return 0.5 * p * p * p + 1.0

def ease_out_elastic(t):
    if t <= 0.0: return 0.0
    if t >= 1.0: return 1.0
    p = 0.3
    s = p / 4.0
    return math.pow(2, -10 * t) * math.sin((t - s) * (2 * math.pi) / p) + 1.0

# Define Letter Geometry (Capsules)
# Y bounds: Y_TOP = 570, Y_MID = 635, Y_BOT = 700 (Height = 130px)
Y_TOP = 570
Y_MID = 635
Y_BOT = 700

capsules = []
# S: X in [380, 460]
capsules.append({"char": "S", "target": (400, Y_TOP, 460, Y_TOP), "color": COLOR_CYAN, "delay": 0.00})
capsules.append({"char": "S", "target": (400, Y_TOP, 400, Y_MID), "color": COLOR_SAPPHIRE, "delay": 0.05})
capsules.append({"char": "S", "target": (400, Y_MID, 460, Y_MID), "color": COLOR_CYAN, "delay": 0.10})
capsules.append({"char": "S", "target": (460, Y_MID, 460, Y_BOT), "color": COLOR_EMERALD, "delay": 0.15})
capsules.append({"char": "S", "target": (460, Y_BOT, 400, Y_BOT), "color": COLOR_CYAN, "delay": 0.20})

# T: X in [490, 570]
capsules.append({"char": "T", "target": (490, Y_TOP, 570, Y_TOP), "color": COLOR_EMERALD, "delay": 0.15})
capsules.append({"char": "T", "target": (530, Y_TOP, 530, Y_BOT), "color": COLOR_SAPPHIRE, "delay": 0.22})

# O: X in [600, 680]
capsules.append({"char": "O", "target": (615, Y_TOP, 665, Y_TOP), "color": COLOR_AMBER, "delay": 0.25})
capsules.append({"char": "O", "target": (665, Y_TOP, 665, Y_BOT), "color": COLOR_CYAN, "delay": 0.30})
capsules.append({"char": "O", "target": (665, Y_BOT, 615, Y_BOT), "color": COLOR_AMBER, "delay": 0.35})
capsules.append({"char": "O", "target": (615, Y_BOT, 615, Y_TOP), "color": COLOR_CYAN, "delay": 0.40})

# C: X in [710, 790]
capsules.append({"char": "C", "target": (785, Y_TOP, 725, Y_TOP), "color": COLOR_CYAN, "delay": 0.35})
capsules.append({"char": "C", "target": (725, Y_TOP, 725, Y_BOT), "color": COLOR_SAPPHIRE, "delay": 0.42})
capsules.append({"char": "C", "target": (725, Y_BOT, 785, Y_BOT), "color": COLOR_CYAN, "delay": 0.48})

# K: X in [820, 900]
capsules.append({"char": "K", "target": (835, Y_TOP, 835, Y_BOT), "color": COLOR_EMERALD, "delay": 0.45})
capsules.append({"char": "K", "target": (835, Y_MID, 895, Y_TOP), "color": COLOR_AMBER, "delay": 0.52})
capsules.append({"char": "K", "target": (835, Y_MID, 895, Y_BOT), "color": COLOR_CYAN, "delay": 0.58})

# L: X in [930, 1010]
capsules.append({"char": "L", "target": (945, Y_TOP, 945, Y_BOT), "color": COLOR_SAPPHIRE, "delay": 0.55})
capsules.append({"char": "L", "target": (945, Y_BOT, 1005, Y_BOT), "color": COLOR_EMERALD, "delay": 0.62})

# Y: X in [1040, 1120]
capsules.append({"char": "Y", "target": (1050, Y_TOP, 1080, Y_MID), "color": COLOR_AMBER, "delay": 0.65})
capsules.append({"char": "Y", "target": (1110, Y_TOP, 1080, Y_MID), "color": COLOR_CYAN, "delay": 0.70})
capsules.append({"char": "Y", "target": (1080, Y_MID, 1080, Y_BOT), "color": COLOR_SAPPHIRE, "delay": 0.75})

# W: X in [1170, 1270]
capsules.append({"char": "W", "target": (1180, Y_TOP, 1200, Y_BOT), "color": COLOR_CYAN, "delay": 0.80})
capsules.append({"char": "W", "target": (1200, Y_BOT, 1225, Y_MID), "color": COLOR_EMERALD, "delay": 0.85})
capsules.append({"char": "W", "target": (1225, Y_MID, 1250, Y_BOT), "color": COLOR_CYAN, "delay": 0.90})
capsules.append({"char": "W", "target": (1250, Y_BOT, 1270, Y_TOP), "color": COLOR_SAPPHIRE, "delay": 0.95})

# M: X in [1295, 1395]
capsules.append({"char": "M", "target": (1305, Y_BOT, 1305, Y_TOP), "color": COLOR_AMBER, "delay": 0.90})
capsules.append({"char": "M", "target": (1305, Y_TOP, 1345, Y_MID), "color": COLOR_CYAN, "delay": 0.95})
capsules.append({"char": "M", "target": (1345, Y_MID, 1385, Y_TOP), "color": COLOR_EMERALD, "delay": 1.00})
capsules.append({"char": "M", "target": (1385, Y_TOP, 1385, Y_BOT), "color": COLOR_CYAN, "delay": 1.05})

# S2: X in [1420, 1500]
capsules.append({"char": "S", "target": (1440, Y_TOP, 1500, Y_TOP), "color": COLOR_CYAN, "delay": 1.05})
capsules.append({"char": "S", "target": (1440, Y_TOP, 1440, Y_MID), "color": COLOR_SAPPHIRE, "delay": 1.10})
capsules.append({"char": "S", "target": (1440, Y_MID, 1500, Y_MID), "color": COLOR_EMERALD, "delay": 1.15})
capsules.append({"char": "S", "target": (1500, Y_MID, 1500, Y_BOT), "color": COLOR_AMBER, "delay": 1.20})
capsules.append({"char": "S", "target": (1500, Y_BOT, 1440, Y_BOT), "color": COLOR_CYAN, "delay": 1.25})

# Cluster origins (starting in a compact Mobius cluster around center 960, 480)
num_caps = len(capsules)
for idx, c in enumerate(capsules):
    angle = (idx / num_caps) * 2.0 * math.pi
    r1 = 50 + 35 * math.sin(2 * angle)
    cx = 960 + r1 * math.cos(angle)
    cy = 470 + r1 * math.sin(angle) * 0.75
    dx = math.cos(angle + math.pi/2) * 25
    dy = math.sin(angle + math.pi/2) * 25
    c["origin"] = (cx - dx, cy - dy, cx + dx, cy + dy)

def draw_capsule(draw, x1, y1, x2, y2, radius, color, rollers=True, t_cycle=0.0):
    dx = x2 - x1
    dy = y2 - y1
    dist = math.hypot(dx, dy)
    if dist < 1:
        draw.ellipse([x1-radius, y1-radius, x1+radius, y1+radius], fill=color)
        return
    nx = -dy / dist * radius
    ny = dx / dist * radius
    p1 = (x1 + nx, y1 + ny)
    p2 = (x2 + nx, y2 + ny)
    p3 = (x2 - nx, y2 - ny)
    p4 = (x1 - nx, y1 - ny)
    # Outer glow body
    draw.polygon([p1, p2, p3, p4], fill=color)
    draw.ellipse([x1-radius, y1-radius, x1+radius, y1+radius], fill=color)
    draw.ellipse([x2-radius, y2-radius, x2+radius, y2+radius], fill=color)

    # Inner bright spine
    r_core = max(2, radius - 5)
    nx_c = -dy / dist * r_core
    ny_c = dx / dist * r_core
    c_p1 = (x1 + nx_c, y1 + ny_c)
    c_p2 = (x2 + nx_c, y2 + ny_c)
    c_p3 = (x2 - nx_c, y2 - ny_c)
    c_p4 = (x1 - nx_c, y1 - ny_c)
    draw.polygon([c_p1, c_p2, c_p3, c_p4], fill=(255, 255, 255, 220))
    draw.ellipse([x1-r_core, y1-r_core, x1+r_core, y1+r_core], fill=(255, 255, 255, 240))
    draw.ellipse([x2-r_core, y2-r_core, x2+r_core, y2+r_core], fill=(255, 255, 255, 240))

    # Warehouse Conveyor Rollers (Micro-ticks across the spine)
    if rollers and dist > 15:
        num_rollers = int(dist / 14)
        for i in range(num_rollers):
            frac = (i / max(1, num_rollers) + t_cycle * 2.0) % 1.0
            rx = x1 + dx * frac
            ry = y1 + dy * frac
            tx = -dy / dist * (radius - 2)
            ty = dx / dist * (radius - 2)
            draw.line([(rx - tx, ry - ty), (rx + tx, ry + ty)], fill=(15, 23, 42, 190), width=2)

print(f"Total capsules configured: {len(capsules)}")
print("Rendering frames with true Penner easing...")

t_start = time.time()
for frame_idx in range(TOTAL_FRAMES):
    sec = frame_idx / FPS

    # Canvas
    im = Image.new("RGBA", (WIDTH, HEIGHT), (7, 13, 24, 255))
    draw = ImageDraw.Draw(im)

    # 1. Kinetic Blueprint Grid
    grid_alpha = 1.0
    if sec > 5.2:
        grid_alpha = max(0.0, 1.0 - (sec - 5.2) / 1.0)

    if grid_alpha > 0.01:
        a_line = int(35 * grid_alpha)
        a_axis = int(120 * grid_alpha)
        # Background fine grid
        for x in range(0, WIDTH, 50):
            draw.line([(x, 0), (x, HEIGHT)], fill=(30, 41, 59, a_line), width=1)
        for y in range(0, HEIGHT, 50):
            draw.line([(0, y), (WIDTH, y)], fill=(30, 41, 59, a_line), width=1)

        # Baseline & Cap Height Rays
        draw.line([(100, Y_TOP), (1820, Y_TOP)], fill=(56, 189, 248, a_axis), width=1)
        draw.line([(100, Y_MID), (1820, Y_MID)], fill=(56, 189, 248, int(a_axis * 0.5)), width=1)
        draw.line([(100, Y_BOT), (1820, Y_BOT)], fill=(56, 189, 248, a_axis), width=1)

        # Dimension text & ticks
        draw.text((120, Y_TOP - 16), "CAP-HEIGHT: 130px", fill=(56, 189, 248, a_axis), font=font_dim)
        draw.text((120, Y_BOT + 6), "BASELINE: 0.00", fill=(56, 189, 248, a_axis), font=font_dim)
        draw.text((960, 100), "KINETIC GUIDE AXIS [CENTER: 960]", fill=(0, 229, 255, a_axis), font=font_dim)

        # Geometric Measurement markers
        for x_tick in [380, 600, 820, 1040, 1260, 1480]:
            draw.line([(x_tick, Y_TOP - 10), (x_tick, Y_BOT + 10)], fill=(56, 189, 248, int(a_axis * 0.4)), width=1)
            draw.text((x_tick + 4, Y_TOP - 14), f"R=9  W=80", fill=(0, 229, 153, a_axis), font=font_dim)

        # 45-degree diagonal guide lines
        draw.line([(835, Y_MID), (835 + 80, Y_MID - 80)], fill=(245, 158, 11, int(a_axis * 0.6)), width=1)
        draw.line([(835, Y_MID), (835 + 80, Y_MID + 80)], fill=(245, 158, 11, int(a_axis * 0.6)), width=1)
        draw.text((885, Y_MID - 45), "45.0°", fill=(245, 158, 11, a_axis), font=font_dim)

    # 2. Capsules Deconstruction & Morphing
    radius = 9.0
    for c in capsules:
        delay = c["delay"]
        start_t = 1.2 + delay * 1.5
        duration_t = 1.6
        raw_progress = (sec - start_t) / duration_t
        t_prog = ease_out_back(raw_progress)

        ox1, oy1, ox2, oy2 = c["origin"]
        tx1, ty1, tx2, ty2 = c["target"]

        # Current interpolated positions
        cur_x1 = ox1 + (tx1 - ox1) * t_prog
        cur_y1 = oy1 + (ty1 - oy1) * t_prog
        cur_x2 = ox2 + (tx2 - ox2) * t_prog
        cur_y2 = oy2 + (ty2 - oy2) * t_prog

        # Motion trail
        if 0.05 < raw_progress < 0.95 and grid_alpha > 0.1:
            draw.line([(ox1, oy1), (cur_x1, cur_y1)], fill=(c["color"][0], c["color"][1], c["color"][2], 50), width=1)

        draw_capsule(draw, cur_x1, cur_y1, cur_x2, cur_y2, radius, c["color"], rollers=True, t_cycle=sec)

    # 3. 3D Mobius S Master Emblem:
    # Phase A (0.0s - 1.2s): Centered at (960, 480) with gentle pulsing
    # Phase B (1.2s - 4.5s): Glides from (960, 480) to hero dock (960, 310)
    # Phase C (4.5s - 8.0s): Hero lockup above assembled letters
    if sec <= 1.2:
        # Centered intro pulse
        pulse = 1.0 + 0.04 * math.sin(sec * 6.0)
        ew = int(emblem_img.width * 0.52 * pulse)
        eh = int(emblem_img.height * 0.52 * pulse)
        resized_emblem = emblem_img.resize((ew, eh), Image.Resampling.BILINEAR)
        pos_x = 960 - ew // 2
        pos_y = 480 - eh // 2

        glow_size = int(ew * 1.3)
        draw.ellipse([960 - glow_size//2, 480 - glow_size//2, 960 + glow_size//2, 480 + glow_size//2], fill=(0, 229, 255, 45))
        im.alpha_composite(resized_emblem, (pos_x, pos_y))

    elif 1.2 < sec < 4.5:
        # Gliding from 480 to 310
        glide_t = ease_in_out_cubic((sec - 1.2) / 3.3)
        cur_ey = 480 + (310 - 480) * glide_t
        ew = int(emblem_img.width * 0.55)
        eh = int(emblem_img.height * 0.55)
        resized_emblem = emblem_img.resize((ew, eh), Image.Resampling.BILINEAR)
        pos_x = 960 - ew // 2
        pos_y = int(cur_ey) - eh // 2

        glow_size = int(ew * 1.2)
        draw.ellipse([960 - glow_size//2, int(cur_ey) - glow_size//2, 960 + glow_size//2, int(cur_ey) + glow_size//2], fill=(0, 229, 255, 35))
        im.alpha_composite(resized_emblem, (pos_x, pos_y))

    else:
        # Final Hero Lockup at (960, 310)
        lock_t = ease_out_elastic((sec - 4.5) / 1.5)
        scale_val = 0.52 + 0.05 * (lock_t if lock_t < 1.0 else 1.0)
        ew = int(emblem_img.width * scale_val)
        eh = int(emblem_img.height * scale_val)
        resized_emblem = emblem_img.resize((ew, eh), Image.Resampling.BILINEAR)
        pos_x = 960 - ew // 2
        pos_y = 310 - eh // 2

        glow_size = int(ew * 1.35)
        draw.ellipse([960 - glow_size//2, 310 - glow_size//2, 960 + glow_size//2, 310 + glow_size//2], fill=(0, 229, 255, 55))
        im.alpha_composite(resized_emblem, (pos_x, pos_y))

    # 4. Anamorphic Starburst Flare Sweep (5.8s to 7.4s)
    if 5.8 <= sec <= 7.4:
        flare_prog = (sec - 5.8) / 1.4
        flare_x = 250 + (1670 - 250) * flare_prog
        flare_y = Y_MID

        b_len = 350
        draw.line([(flare_x - b_len, flare_y), (flare_x + b_len, flare_y)], fill=(255, 255, 255, 230), width=3)
        draw.line([(flare_x - b_len*1.5, flare_y), (flare_x + b_len*1.5, flare_y)], fill=(0, 229, 255, 140), width=8)
        draw.line([(flare_x, flare_y - 40), (flare_x, flare_y + 40)], fill=(255, 255, 255, 200), width=2)
        draw.ellipse([flare_x - 12, flare_y - 12, flare_x + 12, flare_y + 12], fill=(255, 255, 255, 255))

    # 5. Subtitle Typography (Fades in after 6.0s)
    if sec >= 6.0:
        sub_alpha = min(255, int(255 * (sec - 6.0) / 1.0))
        sub_text = "INTELLIGENT WAREHOUSE OPERATING SYSTEM"
        bbox = draw.textbbox((0, 0), sub_text, font=font_sub)
        w_sub = bbox[2] - bbox[0]
        draw.text((960 - w_sub//2, Y_BOT + 42), sub_text, fill=(203, 213, 225, sub_alpha), font=font_sub)

    # Save frame
    frame_path = os.path.join(FRAMES_DIR, f"frame_{frame_idx:04d}.png")
    im.save(frame_path)

    if frame_idx % 30 == 0:
        print(f"Rendered frame {frame_idx}/{TOTAL_FRAMES} ({sec:.1f}s)")

t_render = time.time() - t_start
print(f"All {TOTAL_FRAMES} frames rendered in {t_render:.1f}s!")

# Synthesize Broadcast Audio
print("Synthesizing cinematic audio...")
sr = 44100
t_audio = np.linspace(0, DURATION, int(sr * DURATION), False)
audio = np.zeros_like(t_audio)

audio += 0.08 * np.sin(2 * np.pi * 55 * t_audio) * np.exp(-0.2 * t_audio)

# Whoosh during deconstruction (1.2s to 3.8s)
w_mask = (t_audio >= 1.2) & (t_audio <= 3.8)
w_t = t_audio[w_mask] - 1.2
noise = np.random.normal(0, 0.05, len(w_t))
filter_envelope = np.sin(np.pi * (w_t / 2.6))
audio[w_mask] += noise * filter_envelope * 0.35

# High-tech HUD Clicks as letters lock (1.8s to 4.5s)
for c in capsules:
    click_t = 1.2 + c["delay"] * 1.5 + 1.2
    c_idx = int(click_t * sr)
    if c_idx < len(audio) - 800:
        click_wave = np.sin(2 * np.pi * 1800 * np.linspace(0, 0.02, 800)) * np.exp(-np.linspace(0, 15, 800))
        audio[c_idx:c_idx+800] += click_wave * 0.12

# Hero Emblem Sub-Bass Drop at 5.0s
sub_mask = (t_audio >= 4.8) & (t_audio <= 7.2)
sub_t = t_audio[sub_mask] - 4.8
sub_freq = 70 * np.exp(-1.8 * sub_t) + 32
audio[sub_mask] += 0.5 * np.sin(2 * np.pi * sub_freq * sub_t) * np.exp(-0.8 * sub_t)

# Starburst Shimmer Chime at 5.8s
chime_mask = (t_audio >= 5.8) & (t_audio <= 7.8)
ch_t = t_audio[chime_mask] - 5.8
for f in [523.25, 659.25, 783.99, 1046.50]:
    audio[chime_mask] += 0.08 * np.sin(2 * np.pi * f * ch_t) * np.exp(-1.2 * ch_t)

wav_path = os.path.join(FRAMES_DIR, "intro_sound.wav")
wavfile.write(wav_path, sr, (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16))
print("Audio synthesized successfully!")

# Encode MP4 with FFmpeg
final_mp4 = os.path.join(OUT_DIR, "stockly_kooply_cinematic_intro.mp4")
ffmpeg_cmd = [
    "ffmpeg", "-y",
    "-framerate", str(FPS),
    "-i", os.path.join(FRAMES_DIR, "frame_%04d.png"),
    "-i", wav_path,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    final_mp4
]
print(f"Encoding final MP4 to: {final_mp4}")
subprocess.run(ffmpeg_cmd, check=True)
print(f"SUCCESS! Render completed: {final_mp4}")
