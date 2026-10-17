import bpy
import math
import os
import time

# 1. Clean scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# 2. Render Settings (EEVEE Next in Blender 4.2)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.render.fps = 30
scene.frame_start = 1
scene.frame_end = 150

# Set sample count for fast, noise-free render
if hasattr(scene.eevee, "taa_render_samples"):
    scene.eevee.taa_render_samples = 24

# Output directory for frames
FRAMES_DIR = r"C:\Users\Mohamed Helmy\.gemini\antigravity\brain\f28bca43-ea48-4387-b9a9-708f3c7a049b\scratch\blender_frames"
os.makedirs(FRAMES_DIR, exist_ok=True)
scene.render.filepath = os.path.join(FRAMES_DIR, "frame_")

# World Background - Dark obsidian luxury studio
world = bpy.data.worlds.new("StocklyWorld")
scene.world = world
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs['Color'].default_value = (0.012, 0.016, 0.028, 1.0)
    bg_node.inputs['Strength'].default_value = 0.4

# 3. Materials
# A. Metallic Titanium Silver for STOCKLY
mat_titanium = bpy.data.materials.new(name="TitaniumMetal")
mat_titanium.use_nodes = True
bsdf = mat_titanium.node_tree.nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs['Base Color'].default_value = (0.88, 0.92, 0.98, 1.0) # Platinum Silver
    bsdf.inputs['Metallic'].default_value = 0.95
    bsdf.inputs['Roughness'].default_value = 0.08

# B. Cobalt Blue Accent Material for WMS
mat_wms = bpy.data.materials.new(name="WMSMetal")
mat_wms.use_nodes = True
bsdf_w = mat_wms.node_tree.nodes.get("Principled BSDF")
if bsdf_w:
    bsdf_w.inputs['Base Color'].default_value = (0.05, 0.50, 1.0, 1.0) # Royal Sapphire
    bsdf_w.inputs['Metallic'].default_value = 0.90
    bsdf_w.inputs['Roughness'].default_value = 0.10

# 4. Create 3D Extruded Text for "STOCKLY"
font_path = r"C:\Windows\Fonts\arialbd.ttf"
loaded_font = bpy.data.fonts.load(font_path) if os.path.exists(font_path) else None

bpy.ops.object.text_add(location=(-1.15, 0, -0.65))
txt_stockly = bpy.context.active_object
txt_stockly.name = "Stockly_Text"
txt_stockly.data.body = "STOCKLY"
if loaded_font:
    txt_stockly.data.font = loaded_font
txt_stockly.data.size = 0.95
txt_stockly.data.extrude = 0.08
txt_stockly.data.bevel_depth = 0.018
txt_stockly.data.bevel_resolution = 4
txt_stockly.data.space_character = 1.05
txt_stockly.data.align_x = 'CENTER'
txt_stockly.data.align_y = 'CENTER'
txt_stockly.rotation_euler = (math.radians(90), 0, 0)
txt_stockly.data.materials.append(mat_titanium)

# 5. Create 3D Extruded Text for "WMS"
bpy.ops.object.text_add(location=(1.75, 0, -0.65))
txt_wms = bpy.context.active_object
txt_wms.name = "WMS_Text"
txt_wms.data.body = "WMS"
if loaded_font:
    txt_wms.data.font = loaded_font
txt_wms.data.size = 0.95
txt_wms.data.extrude = 0.08
txt_wms.data.bevel_depth = 0.018
txt_wms.data.bevel_resolution = 4
txt_wms.data.space_character = 1.08
txt_wms.data.align_x = 'CENTER'
txt_wms.data.align_y = 'CENTER'
txt_wms.rotation_euler = (math.radians(90), 0, 0)
txt_wms.data.materials.append(mat_wms)

# 6. Add 3D Mobius S Emblem Plane with High-Res Texture
emblem_path = r"D:\Stockly\apps\web\public\brand\mobius_s_3d.png"
if os.path.exists(emblem_path):
    bpy.ops.mesh.primitive_plane_add(size=2.1, location=(0, 0.1, 1.25))
    emblem_obj = bpy.context.active_object
    emblem_obj.name = "Mobius_Emblem"
    emblem_obj.rotation_euler = (math.radians(90), 0, 0)
    
    mat_emblem = bpy.data.materials.new(name="MobiusEmblemMat")
    mat_emblem.use_nodes = True
    mat_emblem.blend_method = 'BLEND' if hasattr(mat_emblem, 'blend_method') else 'OPAQUE'
    nodes = mat_emblem.node_tree.nodes
    links = mat_emblem.node_tree.links
    
    bsdf_e = nodes.get("Principled BSDF")
    tex_img = nodes.new('ShaderNodeTexImage')
    tex_img.image = bpy.data.images.load(emblem_path)
    links.new(tex_img.outputs['Color'], bsdf_e.inputs['Base Color'])
    links.new(tex_img.outputs['Alpha'], bsdf_e.inputs['Alpha'])
    if 'Emission Color' in bsdf_e.inputs:
        links.new(tex_img.outputs['Color'], bsdf_e.inputs['Emission Color'])
        bsdf_e.inputs['Emission Strength'].default_value = 1.5
    bsdf_e.inputs['Metallic'].default_value = 0.6
    bsdf_e.inputs['Roughness'].default_value = 0.20
    emblem_obj.data.materials.append(mat_emblem)

# 7. Subtitle text: "INTELLIGENT WAREHOUSE OPERATING SYSTEM"
bpy.ops.object.text_add(location=(0, 0, -1.35))
txt_sub = bpy.context.active_object
txt_sub.name = "Subtitle_Text"
txt_sub.data.body = "INTELLIGENT WAREHOUSE OPERATING SYSTEM"
if loaded_font:
    txt_sub.data.font = loaded_font
txt_sub.data.size = 0.18
txt_sub.data.extrude = 0.012
txt_sub.data.bevel_depth = 0.003
txt_sub.data.space_character = 1.30
txt_sub.data.align_x = 'CENTER'
txt_sub.data.align_y = 'CENTER'
txt_sub.rotation_euler = (math.radians(90), 0, 0)
mat_sub = bpy.data.materials.new(name="SubMat")
mat_sub.use_nodes = True
bsdf_sub = mat_sub.node_tree.nodes.get("Principled BSDF")
if bsdf_sub:
    bsdf_sub.inputs['Base Color'].default_value = (0.75, 0.85, 0.95, 1.0)
    bsdf_sub.inputs['Metallic'].default_value = 0.7
    bsdf_sub.inputs['Roughness'].default_value = 0.2
txt_sub.data.materials.append(mat_sub)

# 8. Reflective Dark Ground Plane (Studio Floor)
bpy.ops.mesh.primitive_plane_add(size=40.0, location=(0, 0, -1.8))
floor = bpy.context.active_object
floor.name = "StudioFloor"
mat_floor = bpy.data.materials.new(name="FloorMat")
mat_floor.use_nodes = True
bsdf_f = mat_floor.node_tree.nodes.get("Principled BSDF")
if bsdf_f:
    bsdf_f.inputs['Base Color'].default_value = (0.01, 0.015, 0.025, 1.0)
    bsdf_f.inputs['Metallic'].default_value = 0.95
    bsdf_f.inputs['Roughness'].default_value = 0.22
floor.data.materials.append(mat_floor)

# 9. Studio Lighting Setup
# Key Light
bpy.ops.object.light_add(type='AREA', location=(-6, -9, 6))
light_key = bpy.context.active_object
light_key.data.energy = 2800.0
light_key.data.size = 6.0
light_key.data.color = (0.88, 0.95, 1.0)
light_key.rotation_euler = (math.radians(55), math.radians(-25), math.radians(-30))

# Rim Light
bpy.ops.object.light_add(type='AREA', location=(6, -7, 5))
light_rim = bpy.context.active_object
light_rim.data.energy = 3200.0
light_rim.data.size = 6.0
light_rim.data.color = (0.05, 0.45, 1.0)
light_rim.rotation_euler = (math.radians(55), math.radians(25), math.radians(30))

# Cyan Edge Kicker
bpy.ops.object.light_add(type='SPOT', location=(0, 3, 5))
light_kick = bpy.context.active_object
light_kick.data.energy = 4000.0
light_kick.data.spot_size = math.radians(70)
light_kick.data.color = (0.0, 0.9, 1.0)
light_kick.rotation_euler = (math.radians(-45), 0, 0)

# Fill Light
bpy.ops.object.light_add(type='POINT', location=(0, -5, -0.8))
light_fill = bpy.context.active_object
light_fill.data.energy = 500.0
light_fill.data.color = (0.0, 0.85, 0.6)

# Sweeping Laser Spotlight for Bevel Glints
bpy.ops.object.light_add(type='POINT', location=(-8.0, -2.0, -0.65))
laser_light = bpy.context.active_object
laser_light.name = "Laser_Sweep_Light"
laser_light.data.energy = 0.0 # Starts off
laser_light.data.color = (0.0, 0.95, 1.0)

# 10. Camera Setup
bpy.ops.object.camera_add(location=(0.1, -15.5, 0.2))
cam = bpy.context.active_object
cam.rotation_euler = (math.radians(88.5), 0, 0)
cam.data.lens = 65.0
scene.camera = cam

# ============================================================
# ANIMATION KEYFRAMING
# ============================================================
# A. Mobius Emblem (Frames 1 -> 45)
# Starts small, spins into position with elastic ease
emblem_obj.scale = (0.01, 0.01, 0.01)
emblem_obj.rotation_euler = (math.radians(90), 0, math.radians(-180))
emblem_obj.keyframe_insert(data_path="scale", frame=1)
emblem_obj.keyframe_insert(data_path="rotation_euler", frame=1)

emblem_obj.scale = (1.08, 1.08, 1.08) # slight overshoot
emblem_obj.rotation_euler = (math.radians(90), 0, math.radians(10))
emblem_obj.keyframe_insert(data_path="scale", frame=38)
emblem_obj.keyframe_insert(data_path="rotation_euler", frame=38)

emblem_obj.scale = (1.0, 1.0, 1.0)
emblem_obj.rotation_euler = (math.radians(90), 0, 0)
emblem_obj.keyframe_insert(data_path="scale", frame=48)
emblem_obj.keyframe_insert(data_path="rotation_euler", frame=48)

# B. STOCKLY Text (Frames 35 -> 70)
# Submerged in floor (Z = -3.0), rises to Z = -0.65
txt_stockly.location = (-1.15, 0, -3.0)
txt_stockly.keyframe_insert(data_path="location", frame=35)
txt_stockly.location = (-1.15, 0, -0.55) # overshoot
txt_stockly.keyframe_insert(data_path="location", frame=65)
txt_stockly.location = (-1.15, 0, -0.65) # settle
txt_stockly.keyframe_insert(data_path="location", frame=75)

# C. WMS Text (Frames 45 -> 80)
txt_wms.location = (1.75, 0, -3.0)
txt_wms.keyframe_insert(data_path="location", frame=45)
txt_wms.location = (1.75, 0, -0.55)
txt_wms.keyframe_insert(data_path="location", frame=75)
txt_wms.location = (1.75, 0, -0.65)
txt_wms.keyframe_insert(data_path="location", frame=85)

# D. Laser Sweep across Bevels (Frames 80 -> 120)
laser_light.data.energy = 0.0
laser_light.location = (-6.0, -1.2, -0.65)
laser_light.keyframe_insert(data_path="location", frame=79)
laser_light.data.keyframe_insert(data_path="energy", frame=79)

laser_light.data.energy = 1800.0
laser_light.location = (-5.0, -1.2, -0.65)
laser_light.keyframe_insert(data_path="location", frame=82)
laser_light.data.keyframe_insert(data_path="energy", frame=82)

laser_light.location = (5.0, -1.2, -0.65)
laser_light.data.energy = 1800.0
laser_light.keyframe_insert(data_path="location", frame=118)
laser_light.data.keyframe_insert(data_path="energy", frame=118)

laser_light.location = (6.0, -1.2, -0.65)
laser_light.data.energy = 0.0
laser_light.keyframe_insert(data_path="location", frame=122)
laser_light.data.keyframe_insert(data_path="energy", frame=122)

# E. Subtitle Text (Frames 100 -> 135)
txt_sub.location = (0, 0, -2.5)
txt_sub.keyframe_insert(data_path="location", frame=95)
txt_sub.location = (0, 0, -1.35)
txt_sub.keyframe_insert(data_path="location", frame=125)

# F. Camera subtle push-in (Frames 1 -> 150)
cam.location = (0.1, -16.5, 0.4)
cam.keyframe_insert(data_path="location", frame=1)
cam.location = (0.1, -15.5, 0.2)
cam.keyframe_insert(data_path="location", frame=150)

print("Keyframes successfully inserted across all 150 frames!")

# 11. Render Animation
print("Starting Blender Headless Render of 150 frames...")
t_render_start = time.time()
bpy.ops.render.render(animation=True)
t_render_total = time.time() - t_render_start
print(f"SUCCESS: Rendered all 150 frames in {t_render_total:.1f}s to {FRAMES_DIR}")
