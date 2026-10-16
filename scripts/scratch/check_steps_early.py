import sys, json, os
sys.stdout.reconfigure(encoding="utf-8")

app_data = r"C:\Users\Mohamed Helmy\.gemini\antigravity\brain\4644325f-c2d1-44e5-8356-23b4b57cbdd3\.system_generated\logs"
t_path = os.path.join(app_data, "transcript.jsonl")

with open(t_path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        idx = data.get("step_index")
        if data.get("type") == "USER_INPUT":
            content = data.get("content", "")
            if 15800 <= idx <= 16340:
                created = data.get("created_at")
                print(f"=== STEP {idx} ({created}) ===")
                print(content[:250].replace("\n", " "))
