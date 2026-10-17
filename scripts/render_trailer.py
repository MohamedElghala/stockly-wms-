"""
Stockly WMS: Headless Blender 4.2.3 LTS Automated Video Rendering Pipeline
Produces a 1080p MP4 Commercial Marketing Promo Video Asset.

Execution:
    D:\\Studio_Tools\\Blender\\blender.exe --background --python scripts/render_trailer.py
"""

import sys
import os

def build_scene():
    try:
        import bpy
    except ImportError:
        print("[Notice] bpy module is only available within Blender runtime.")
        return

    # 1. Clean existing scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene

    # 2. Render Settings: 1080p, 30 FPS, H.264 MP4
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.fps = 30
    scene.frame_start = 1
    scene.frame_end = 150  # 5 Seconds at 30 fps

    scene.render.image_settings.file_format = 'FFMPEG'
    scene.render.ffmpeg.format = 'MPEG4'
    scene.render.ffmpeg.codec = 'H264'
    scene.render.ffmpeg.constant_rate_factor = 'HIGH'
    scene.render.ffmpeg.ffmpeg_preset = 'GOOD'

    output_dir = os.path.abspath("D:/Stockly/assets")
    os.makedirs(output_dir, exist_ok=True)
    scene.render.filepath = os.path.join(output_dir, "stockly_commercial_trailer.mp4")

    # 3. Camera Setup with Smooth Bezier Motion
    camera_data = bpy.data.cameras.new(name="MainCamera")
    camera_data.lens = 50
    camera_obj = bpy.data.objects.new("MainCamera", camera_data)
    scene.collection.objects.link(camera_obj)
    scene.camera = camera_obj

    camera_obj.location = (12, -14, 9)
    camera_obj.rotation_euler = (1.05, 0, 0.785)
    camera_obj.keyframe_insert(data_path="location", frame=1)

    camera_obj.location = (8, -10, 6)
    camera_obj.keyframe_insert(data_path="location", frame=150)

    # 4. Dual Lighting: Amber (#F59E0B) and Cyan (#00C2FF)
    light_amber_data = bpy.data.lights.new(name="AmberLaserLight", type='AREA')
    light_amber_data.energy = 800
    light_amber_data.color = (0.96, 0.62, 0.04)  # RGB Amber
    light_amber_obj = bpy.data.objects.new("AmberLaserLight", light_amber_data)
    light_amber_obj.location = (-6, 5, 8)
    scene.collection.objects.link(light_amber_obj)

    light_cyan_data = bpy.data.lights.new(name="CyanLaserLight", type='AREA')
    light_cyan_data.energy = 1000
    light_cyan_data.color = (0.0, 0.76, 1.0)  # RGB Cyan
    light_cyan_obj = bpy.data.objects.new("CyanLaserLight", light_cyan_data)
    light_cyan_obj.location = (7, -6, 10)
    scene.collection.objects.link(light_cyan_obj)

    # 5. Core 3D Warehouse Modular Cube
    bpy.ops.mesh.primitive_cube_add(size=3, location=(0, 0, 1.5))
    cube = bpy.context.active_object
    cube.name = "StocklyWarehouseCore"

    mat = bpy.data.materials.new(name="ChromeGlassMat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.05, 0.08, 0.12, 1.0)
        bsdf.inputs['Metallic'].default_value = 0.95
        bsdf.inputs['Roughness'].default_value = 0.12
    cube.data.materials.append(mat)

    # Keyframe Cube Rotation
    cube.rotation_euler = (0, 0, 0)
    cube.keyframe_insert(data_path="rotation_euler", frame=1)
    cube.rotation_euler = (0, 0, 3.14159)
    cube.keyframe_insert(data_path="rotation_euler", frame=150)

    print(f"[Stockly Pipeline] Scene successfully configured. Rendering output to: {scene.render.filepath}")

if __name__ == '__main__':
    build_scene()
