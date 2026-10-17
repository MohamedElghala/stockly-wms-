#!/usr/bin/env python3
"""
render_disney_intro.py
Renders the TRUE Disney/Marvel style Cinematic Intro using the EXACT Image #3 Mobius S emblem:
- Starts tiny in deep space
- Zooms forward growing larger and larger with cinematic ease
- Active glowing neon energy pulsing and shimmering along the tracks
- Mobius S launches/ejects 3D letters (S-T-O-C-K-L-Y W-M-S) one by one along parabolic arcs
- Letters land side-by-side with Disney squash-and-stretch bounce physics
- Starburst lens flare sweep and final brand lock
"""

import os
import sys
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import subprocess
import shutil

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

WIDTH, HEIGHT = 1920, 1080
FPS = 30
DURATION_SEC = 8
TOTAL_FRAMES = FPS * DURATION_SEC

MOBIUS_PNG_PATH = r"D:\Stockly\apps\web\public\brand\mobius_s_3d.png"
TEMP_FRAMES_DIR = r"D:\Stockly\temp_disney_frames"
OUTPUT_MP4 = r"D:\Stockly\apps\web\public\videos\stockly_disney_cinematic_intro.mp4"
ARTIFACT_MP4 = r"C:\Users\Mohamed Helmy\.gemini\antigravity\brain\f28bca43-ea48-4387-b9a9-708f3c7a049b\stockly_disney_cinematic_intro.mp4"

os.makedirs(TEMP_FRAMES_DIR, exist_ok=True)
os.makedirs(os.path.dirname(OUTPUT_MP4), exist_ok=True)

# Load the EXACT 3D Mobius S image #3
raw_mobius = Image.open(MOBIUS_PNG_PATH).convert("RGBA")
mobius_w, mobius_h = raw_mobius.size

# Letters to eject
LETTERS = ["S", "T", "O", "C", "K", "L", "Y", "W", "M", "S"]
TOTAL_LETTERS = len(LETTERS)
LETTER_SPACING = 90
START_X = (WIDTH - (TOTAL_LETTERS * LETTER_SPACING)) // 2 + 30
TARGET_Y = HEIGHT - 180

TARGETS = []
for i in range(TOTAL_LETTERS):
    gap = 35 if i >= 7 else 0
    TARGETS.append((START_X + i * LETTER_SPACING + gap, TARGET_Y))

# Staggered launch times (seconds)
# Approach finishes at ~3.5s, then rapid machine-gun Disney pop!
LAUNCH_TIMES = [3.2, 3.5, 3.8, 4.1, 4.4, 4.7, 5.0, 5.4, 5.7, 6.0]
FLIGHT_TIME = 0.55  # fast, dynamic arcing flight

print("🎬 Starting Disney/Marvel Style Intro Render using EXACT Image #3...")

def ease_in_out_cubic(x):
    return 4 * x * x * x if x < 0.5 else 1 - math.pow(-2 * x + 2, 3) / 2

def ease_out_back(x):
    c1 = 1.70158
    c3 = c1 + 1
    return 1 + c3 * math.pow(x - 1, 3) + c1 * math.pow(x - 1, 2)

for f in range(TOTAL_FRAMES):
    t = f / FPS
    
    # 1. Dark Atmospheric Cinematic Background
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (5, 9, 18, 255))
    draw = ImageDraw.Draw(canvas)
    
    # Floating ambient dust particles
    for p_i in range(40):
        px = (math.sin(p_i * 99 + t * 0.3) * 0.5 + 0.5) * WIDTH
        py = (math.cos(p_i * 77 + t * 0.2) * 0.5 + 0.5) * HEIGHT
        p_alpha = int(40 + 30 * math.sin(t * 3 + p_i))
        p_size = 2 if (p_i % 3 == 0) else 1
        draw.ellipse([px, py, px + p_size, py + p_size], fill=(0, 229, 255, p_alpha))
    
    # 2. Mobius S Growth / Approach Physics (0.0s to 3.8s)
    if t < 3.8:
        progress_zoom = t / 3.8
        eased_zoom = ease_in_out_cubic(progress_zoom)
        # From tiny (0.06) to large (0.95)
        current_scale = 0.06 + eased_zoom * 0.89
        mob_center_x = WIDTH // 2 + math.sin(t * 3.0) * (1.0 - progress_zoom) * 80
        mob_center_y = HEIGHT // 2 - 20 + math.cos(t * 2.5) * (1.0 - progress_zoom) * 50
    elif t < 6.5:
        # Floating hero pose during letter ejection
        float_t = t - 3.8
        current_scale = 0.95 + math.sin(float_t * 2) * 0.02
        mob_center_x = WIDTH // 2
        # Gently rise up to make room for letters underneath
        rise_progress = min(1.0, float_t / 1.5)
        mob_center_y = (HEIGHT // 2 - 20) - rise_progress * 110
    else:
        # Final Settle
        settle_t = min(1.0, (t - 6.5) / 1.0)
        current_scale = 0.95 - settle_t * 0.05
        mob_center_x = WIDTH // 2
        mob_center_y = (HEIGHT // 2 - 130)

    # Calculate resized dimensions of the EXACT Mobius S image
    cur_w = max(10, int(mobius_w * current_scale))
    cur_h = max(10, int(mobius_h * current_scale))

    
    # Shimmering / pulsing neon brightness overlay
    shimmer = math.sin(t * 14.0) * 0.15 + 1.0
    scaled_mobius = raw_mobius.resize((cur_w, cur_h), Image.Resampling.LANCZOS)
    
    if shimmer > 1.05:
        enhancer = ImageEnhance.Brightness(scaled_mobius)
        scaled_mobius = enhancer.enhance(shimmer)
    
    # Glow Aura behind the Mobius S
    aura_size = int(cur_w * 1.35)
    aura_img = Image.new("RGBA", (aura_size, aura_size), (0, 0, 0, 0))
    aura_draw = ImageDraw.Draw(aura_img)
    aura_color = (0, 229, 255, int(min(120, 25 + current_scale * 100)))
    aura_draw.ellipse([0, 0, aura_size, aura_size], fill=aura_color)
    aura_img = aura_img.filter(ImageFilter.GaussianBlur(radius=int(cur_w * 0.18) + 5))
    
    # Composite Aura & Mobius
    top_left_x = int(mob_center_x - cur_w // 2)
    top_left_y = int(mob_center_y - cur_h // 2)
    canvas.paste(aura_img, (int(mob_center_x - aura_size // 2), int(mob_center_y - aura_size // 2)), aura_img)
    canvas.paste(scaled_mobius, (top_left_x, top_left_y), scaled_mobius)
    
    # 3. Dynamic Letter Ejection Burst (Disney / Marvel Style!)
    launch_origin_x = mob_center_x + (cur_w * 0.12)
    launch_origin_y = mob_center_y + (cur_h * 0.18)
    
    for idx, char in enumerate(LETTERS):
        l_time = LAUNCH_TIMES[idx]
        tx, ty = TARGETS[idx]
        
        if t < l_time:
            continue  # Inside conveyor, not ejected yet
            
        flight_progress = (t - l_time) / FLIGHT_TIME
        
        if flight_progress < 1.0:
            # IN FLIGHT! Arcing Disney trajectory
            # Parabolic trajectory
            p = flight_progress
            arc_height = 280 + (idx % 3) * 40
            cur_x = launch_origin_x + (tx - launch_origin_x) * p
            cur_y = launch_origin_y + (ty - launch_origin_y) * p - math.sin(p * math.pi) * arc_height
            
            # Spin & Scale
            spin_deg = p * 720.0
            letter_scale = 0.5 + p * 0.5
            
            # Draw Flying Sparkle Trail
            for sp_k in range(4):
                trail_p = max(0, p - (sp_k * 0.08))
                tr_x = launch_origin_x + (tx - launch_origin_x) * trail_p
                tr_y = launch_origin_y + (ty - launch_origin_y) * trail_p - math.sin(trail_p * math.pi) * arc_height
                sp_alpha = int((1.0 - (sp_k / 4.0)) * 180)
                sp_color = (0, 229, 153, sp_alpha) if (idx % 2 == 0) else (0, 229, 255, sp_alpha)
                draw.ellipse([tr_x - 3, tr_y - 3, tr_x + 3, tr_y + 3], fill=sp_color)
                
            # Draw Flying Letter Plaque
            box_sz = int(36 * letter_scale)
            draw.rectangle([cur_x - box_sz, cur_y - box_sz, cur_x + box_sz, cur_y + box_sz], fill=(15, 23, 42, 240), outline=(0, 229, 255, 255), width=2)
            draw.text((cur_x, cur_y), char, fill=(255, 255, 255, 255), anchor="mm")
            
        else:
            # LANDED & DOCKED! Squash and stretch bounce physics
            land_age = t - (l_time + FLIGHT_TIME)
            bounce_y = 0
            squash_x = 1.0
            squash_y = 1.0
            
            if land_age < 0.4:
                # Organic Disney spring bounce
                bounce_phase = land_age / 0.4
                damp = math.exp(-bounce_phase * 4.0)
                bounce_y = math.sin(bounce_phase * math.pi * 3) * 16 * damp
                squash_y = 1.0 - math.sin(bounce_phase * math.pi) * 0.25 * damp
                squash_x = 1.0 + math.sin(bounce_phase * math.pi) * 0.25 * damp
                
                # Impact shockwave ring
                ring_r = land_age * 120
                ring_alpha = int((1.0 - (land_age / 0.4)) * 200)
                draw.ellipse([tx - ring_r, ty + 20 - ring_r * 0.4, tx + ring_r, ty + 20 + ring_r * 0.4], outline=(0, 229, 153, ring_alpha), width=2)
                
            bw = int(32 * squash_x)
            bh = int(36 * squash_y)
            ly = ty - bounce_y
            
            # Docked Card with High-Gloss Border
            draw.rectangle([tx - bw - 2, ly - bh - 2, tx + bw + 2, ly + bh + 2], fill=(0, 229, 153, 40))
            draw.rectangle([tx - bw, ly - bh, tx + bw, ly + bh], fill=(15, 23, 42, 255), outline=(0, 229, 153, 240), width=2)
            draw.text((tx, ly), char, fill=(255, 255, 255, 255), anchor="mm")
            
    # 4. Final Grand Starburst Lens Flare (t >= 6.8s)
    if t >= 6.8:
        flare_t = (t - 6.8) / 1.2
        if flare_t <= 1.0:
            flare_x = START_X - 50 + flare_t * (TOTAL_LETTERS * LETTER_SPACING + 140)
            flare_y = TARGET_Y
            flare_rad = int(math.sin(flare_t * math.pi) * 45)
            if flare_rad > 0:
                # Horizontal Starburst Beam
                draw.line([(flare_x - flare_rad * 3, flare_y), (flare_x + flare_rad * 3, flare_y)], fill=(255, 255, 255, 220), width=3)
                draw.line([(flare_x, flare_y - flare_rad * 1.5), (flare_x, flare_y + flare_rad * 1.5)], fill=(0, 229, 255, 180), width=2)
                draw.ellipse([flare_x - flare_rad, flare_y - flare_rad, flare_x + flare_rad, flare_y + flare_rad], fill=(255, 255, 255, 160))

    # 5. Subtitle Reveal (t >= 6.5s)
    if t >= 6.5:
        sub_p = min(1.0, (t - 6.5) / 1.0)
        sub_alpha = int(255 * sub_p)
        draw.text((WIDTH // 2, TARGET_Y + 75), "INTELLIGENT WAREHOUSE OPERATING SYSTEM", fill=(148, 163, 184, sub_alpha), anchor="mm")
        draw.text((WIDTH // 2, TARGET_Y + 110), "● AUTONOMOUS FULFILLMENT ONLINE", fill=(0, 229, 153, int(sub_alpha * 0.9)), anchor="mm")

    frame_path = os.path.join(TEMP_FRAMES_DIR, f"frame_{f:04d}.png")
    canvas.save(frame_path, "PNG")
    
    if f % 40 == 0:
        print(f"  ✨ Rendered Disney Frame {f}/{TOTAL_FRAMES} ({(f/TOTAL_FRAMES)*100:.1f}%)")

print("🎥 Compiling Disney Style Motion MP4 with FFmpeg...")
ffmpeg_cmd = [
    "ffmpeg", "-y",
    "-r", str(FPS),
    "-i", os.path.join(TEMP_FRAMES_DIR, "frame_%04d.png"),
    "-f", "lavfi", "-i", f"sine=frequency=70:duration={DURATION_SEC}",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    OUTPUT_MP4
]

res = subprocess.run(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
if res.returncode == 0:
    print(f"✅ Disney Intro Video Created: {OUTPUT_MP4}")
    try:
        shutil.copy2(OUTPUT_MP4, ARTIFACT_MP4)
        print(f"📁 Copied to artifact directory: {ARTIFACT_MP4}")
    except Exception as e:
        print(f"Copy error: {e}")
else:
    print(f"❌ FFmpeg error: {res.stderr[-400:]}")

try:
    shutil.rmtree(TEMP_FRAMES_DIR)
    print("🧹 Cleaned temporary frames.")
except Exception:
    pass

print("🎉 DISNEY INTRO READY!")
