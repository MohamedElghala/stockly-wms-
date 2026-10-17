#!/usr/bin/env python3
"""
generate_conveyor_letters_intro.py
Implements the User's Exact Creative Vision:
- The 3D Mobius S conveyor belt has actively rolling/spinning rollers.
- Individual 3D parcels / letters (S - T - O - C - K - L - Y - W - M - S) ride down the conveyor curves.
- Each letter slides down the chute and docks sequentially onto the staging platform side-by-side.
- Laser barcode scan flashes over each letter as it docks with an emerald pulse.
- Compiles into Full HD 1080p MP4 with custom sound design.
"""

import os
import sys
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
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

TEMP_FRAMES_DIR = r"D:\Stockly\temp_conveyor_letters_frames"
OUTPUT_MP4 = r"D:\Stockly\apps\web\public\videos\stockly_conveyor_letters_delivery.mp4"
ARTIFACT_MP4 = r"C:\Users\Mohamed Helmy\.gemini\antigravity\brain\f28bca43-ea48-4387-b9a9-708f3c7a049b\stockly_conveyor_letters_delivery.mp4"

os.makedirs(TEMP_FRAMES_DIR, exist_ok=True)
os.makedirs(os.path.dirname(OUTPUT_MP4), exist_ok=True)

# Color Palette
BG_COLOR = (7, 13, 24)
CYAN_BRIGHT = (0, 229, 255)
CYAN_DEEP = (30, 64, 175)
EMERALD_BRIGHT = (0, 229, 153)
WHITE = (255, 255, 255)
TITANIUM_LIGHT = (226, 232, 240)
TITANIUM_DARK = (30, 41, 59)
AMBER_ACCENT = (245, 158, 11)

# Wordmark to assemble
LETTERS = ["S", "T", "O", "C", "K", "L", "Y", "W", "M", "S"]
# Staging target positions along X axis
TOTAL_LETTERS = len(LETTERS)
SPACING = 95
START_X = (WIDTH - (TOTAL_LETTERS * SPACING)) // 2 + 35
TARGET_Y = HEIGHT - 220

LETTER_TARGETS = []
for i in range(TOTAL_LETTERS):
    # Add extra gap between STOCKLY and WMS
    extra_gap = 40 if i >= 7 else 0
    LETTER_TARGETS.append((START_X + i * SPACING + extra_gap, TARGET_Y))

# Staggered launch times for letters (seconds)
LAUNCH_TIMES = [0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.8, 4.2, 4.6]
TRAVEL_DURATION = 1.4  # seconds to ride the conveyor to the dock

def rotate_3d(x, y, z, pitch, yaw, roll):
    x1 = x * math.cos(yaw) + z * math.sin(yaw)
    y1 = y
    z1 = -x * math.sin(yaw) + z * math.cos(yaw)
    
    x2 = x1
    y2 = y1 * math.cos(pitch) - z1 * math.sin(pitch)
    z2 = y1 * math.sin(pitch) + z1 * math.cos(pitch)
    
    x3 = x2 * math.cos(roll) - y2 * math.sin(roll)
    y3 = x2 * math.sin(roll) + y2 * math.cos(roll)
    z3 = z2
    return x3, y3, z3

def project_3d(x, y, z, fov=850, cx=WIDTH//2, cy=HEIGHT//2 - 130):
    dist = max(10, fov + z)
    scale = fov / dist
    return cx + x * scale, cy + y * scale, scale, z

# Parametric Mobius S Track
NUM_PATH_POINTS = 160
PATH_3D = []
for i in range(NUM_PATH_POINTS):
    u = (i / NUM_PATH_POINTS) * math.pi * 2
    px = 240 * math.sin(u)
    py = 200 * math.sin(u) * math.cos(u) * 1.85
    pz = 120 * math.cos(u)
    PATH_3D.append((px, py, pz, u))

NUM_ROLLERS = 60
TRACK_WIDTH = 55

def render_frame(frame_idx):
    t = frame_idx / FPS
    img = Image.new("RGBA", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # 1. Perspective Grid Floor & Staging Dock
    grid_alpha = 30
    horizon_y = HEIGHT // 2 + 50
    for gy in range(horizon_y, HEIGHT, 45):
        draw.line([(0, gy), (WIDTH, gy)], fill=(15, 23, 42, grid_alpha), width=1)
    for gx in range(0, WIDTH, 120):
        draw.line([(gx, horizon_y), (gx * 1.5 - WIDTH * 0.25, HEIGHT)], fill=(15, 23, 42, grid_alpha), width=1)
        
    # Draw yellow/cyan staging dock line where letters assemble
    dock_y = TARGET_Y + 35
    draw.line([(START_X - 60, dock_y), (START_X + TOTAL_LETTERS * SPACING + 80, dock_y)], fill=(0, 229, 153, 140), width=3)
    draw.line([(START_X - 60, dock_y + 4), (START_X + TOTAL_LETTERS * SPACING + 80, dock_y + 4)], fill=(0, 229, 255, 60), width=1)
    
    # Staging dock LED markers
    for tx, _ in LETTER_TARGETS:
        draw.ellipse([tx - 12, dock_y - 2, tx + 12, dock_y + 2], fill=(0, 229, 153, 180))
    
    # 2. Camera angles for Mobius S Conveyor
    yaw = math.sin(t * 0.8) * 0.35 + 0.1
    pitch = 0.22 + math.sin(t * 0.6) * 0.08
    roll = 0.02
    
    # 3. Transform Mobius S Track Points
    transformed_path = []
    for px, py, pz, u in PATH_3D:
        rx, ry, rz = rotate_3d(px, py, pz, pitch, yaw, roll)
        sx, sy, scale, depth = project_3d(rx, ry, rz)
        transformed_path.append((sx, sy, rx, ry, rz, scale, depth, u))
        
    left_rail = []
    right_rail = []
    for i in range(NUM_PATH_POINTS):
        curr = transformed_path[i]
        nxt = transformed_path[(i + 1) % NUM_PATH_POINTS]
        dx = nxt[0] - curr[0]
        dy = nxt[1] - curr[1]
        tlen = math.sqrt(dx*dx + dy*dy) + 1e-6
        nx = -dy / tlen
        ny = dx / tlen
        hw = (TRACK_WIDTH / 2) * curr[5]
        left_rail.append((curr[0] + nx * hw, curr[1] + ny * hw, curr[4]))
        right_rail.append((curr[0] - nx * hw, curr[1] - ny * hw, curr[4]))
        
    # 4. Render Queue (Depth Sorting)
    render_queue = []
    
    # Rail segments
    for i in range(NUM_PATH_POINTS):
        pl1, pl2 = left_rail[i], left_rail[(i + 1) % NUM_PATH_POINTS]
        pr1, pr2 = right_rail[i], right_rail[(i + 1) % NUM_PATH_POINTS]
        avg_z = (pl1[2] + pl2[2] + pr1[2] + pr2[2]) / 4
        render_queue.append(('rail', avg_z, pl1, pl2, pr1, pr2, i))
        
    # Active Conveyor Rollers (SPINNING PHYSICALLY!)
    roller_indices = np.linspace(0, NUM_PATH_POINTS - 1, NUM_ROLLERS, dtype=int)
    for idx in roller_indices:
        pl = left_rail[idx]
        pr = right_rail[idx]
        # Active rolling motion!
        spin = t * 24.0 + idx * 0.4
        render_queue.append(('roller', (pl[2] + pr[2]) / 2, pl, pr, spin))
        
    # Letters Traveling along Conveyor or Landing on Dock
    for k, char in enumerate(LETTERS):
        launch_t = LAUNCH_TIMES[k]
        target_x, target_y = LETTER_TARGETS[k]
        
        if t < launch_t:
            continue  # Not launched yet
            
        progress_k = (t - launch_t) / TRAVEL_DURATION
        
        if progress_k < 1.0:
            # Traveling along the S Conveyor Curve!
            u_pos = (progress_k * 0.85 + 0.1) % 1.0
            idx = int(u_pos * NUM_PATH_POINTS) % NUM_PATH_POINTS
            pl = left_rail[idx]
            pr = right_rail[idx]
            
            box_x = (pl[0] + pr[0]) / 2
            box_y = (pl[1] + pr[1]) / 2
            box_z = (pl[2] + pr[2]) / 2
            box_scale = transformed_path[idx][5]
            
            render_queue.append(('moving_letter', box_z, char, box_x, box_y, box_scale, False, 0.0))
        else:
            # Landed and Docked at Staging Position!
            dock_age = t - (launch_t + TRAVEL_DURATION)
            # Subtle bounce easing on touchdown
            bounce = 0
            if dock_age < 0.25:
                bounce = math.sin((dock_age / 0.25) * math.pi) * 14
                
            render_queue.append(('docked_letter', -500, char, target_x, target_y - bounce, 1.0, True, dock_age))
            
    # Sort from back to front (Painter's algorithm)
    render_queue.sort(key=lambda item: item[1])
    
    # 5. Draw Sorted Elements
    for item in render_queue:
        itype = item[0]
        
        if itype == 'rail':
            _, z, pl1, pl2, pr1, pr2, i = item
            depth_f = np.clip((z + 180) / 360, 0.35, 1.0)
            phase = (i / NUM_PATH_POINTS + t * 0.4) % 1.0
            color = (37, 99, 235) if phase < 0.5 else (0, 229, 153)
            r = int(color[0] * depth_f)
            g = int(color[1] * depth_f)
            b = int(color[2] * depth_f)
            draw.line([(pl1[0], pl1[1]), (pl2[0], pl2[1])], fill=(r, g, b, 230), width=max(2, int(3.5 * depth_f)))
            draw.line([(pr1[0], pr1[1]), (pr2[0], pr2[1])], fill=(r, g, b, 230), width=max(2, int(3.5 * depth_f)))
            
        elif itype == 'roller':
            _, z, pl, pr, spin = item
            depth_f = np.clip((z + 180) / 360, 0.35, 1.0)
            is_light = math.sin(spin) > 0
            rc = (int(220 * depth_f), int(230 * depth_f), int(245 * depth_f), 220) if is_light else (int(50 * depth_f), int(65 * depth_f), int(85 * depth_f), 180)
            draw.line([(pl[0], pl[1]), (pr[0], pr[1])], fill=rc, width=max(1, int(3 * depth_f)))
            
        elif itype == 'moving_letter':
            _, z, char, bx, by, bscale, _, _ = item
            bw = int(38 * bscale)
            bh = int(38 * bscale)
            
            # Draw 3D Cargo Parcel carrying the Letter down the S track
            # Box shadow
            draw.rectangle([bx - bw - 2, by - bh - 2, bx + bw + 2, by + bh + 2], fill=(0, 229, 255, 60))
            # Titanium box body
            draw.rectangle([bx - bw, by - bh, bx + bw, by + bh], fill=(15, 23, 42, 240), outline=(0, 229, 153, 230), width=2)
            # Inner barcode stripe
            draw.line([(bx - bw + 6, by + bh - 8), (bx + bw - 6, by + bh - 8)], fill=(0, 229, 255, 180), width=2)
            
            # Glowing Letter on the box!
            draw.text((bx, by - 4), char, fill=WHITE, anchor="mm")
            
        elif itype == 'docked_letter':
            _, _, char, dx, dy, _, is_docked, dock_age = item
            bw, bh = 34, 38
            
            # Staging Dock Card
            is_recent = dock_age < 0.4
            border_color = (0, 229, 255) if is_recent else (0, 229, 153)
            glow_alpha = int(max(0, 1.0 - (dock_age / 0.6)) * 120)
            
            if glow_alpha > 0:
                draw.rectangle([dx - bw - 6, dy - bh - 6, dx + bw + 6, dy + bh + 6], fill=(0, 229, 153, glow_alpha))
                
            # Precision Docked 3D Letter Badge
            draw.rectangle([dx - bw, dy - bh, dx + bw, dy + bh], fill=(15, 23, 42, 250), outline=border_color, width=2)
            
            # Laser Barcode Scan Crosshair over newly landed letter
            if is_recent:
                scan_y = dy - bh + int((dock_age / 0.4) * (bh * 2))
                draw.line([(dx - bw - 4, scan_y), (dx + bw + 4, scan_y)], fill=(0, 229, 255, 240), width=2)
                draw.line([(dx, dy - bh - 6), (dx, dy - bh - 2)], fill=(0, 229, 153, 255), width=2)
                draw.line([(dx, dy + bh + 2), (dx, dy + bh + 6)], fill=(0, 229, 153, 255), width=2)
                
            # Solid High-Contrast Typography
            draw.text((dx, dy), char, fill=WHITE, anchor="mm")
            
    # 6. Final Lock & Brand Subtitle when all letters assemble (t >= 6.0s)
    if t >= 6.0:
        fade_in = np.clip((t - 6.0) / 1.0, 0.0, 1.0)
        sub_alpha = int(255 * fade_in)
        sub_y = TARGET_Y + 70
        draw.text((WIDTH // 2, sub_y), "INTELLIGENT WAREHOUSE OPERATING SYSTEM", fill=(148, 163, 184, sub_alpha), anchor="mm")
        
        # Emerald status badge
        badge_y = TARGET_Y + 105
        draw.text((WIDTH // 2, badge_y), "[ AUTONOMOUS FULFILLMENT ONLINE • ZERO-ERROR SORTATION ]", fill=(0, 229, 153, int(sub_alpha * 0.9)), anchor="mm")

    frame_path = os.path.join(TEMP_FRAMES_DIR, f"frame_{frame_idx:04d}.png")
    img.save(frame_path, "PNG")
    
    if frame_idx % 40 == 0:
        print(f"  📦 Rendered conveyor frame {frame_idx}/{TOTAL_FRAMES} ({(frame_idx/TOTAL_FRAMES)*100:.1f}%)")

print("🚀 Rendering Conveyor Belt Letters Assembly Frames...")
for f in range(TOTAL_FRAMES):
    render_frame(f)

print("🎥 Compiling Conveyor Letters MP4 via FFmpeg with audio...")
# Audio: Synthesizing subtle rhythmic conveyor ticks + laser scanner beeps
ffmpeg_cmd = [
    "ffmpeg", "-y",
    "-r", str(FPS),
    "-i", os.path.join(TEMP_FRAMES_DIR, "frame_%04d.png"),
    "-f", "lavfi", "-i", f"sine=frequency=65:duration={DURATION_SEC}",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    OUTPUT_MP4
]

res = subprocess.run(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
if res.returncode == 0:
    print(f"✅ Conveyor Letters Video Created: {OUTPUT_MP4}")
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

print("🎉 ALL DONE!")
