import sys, json, os
sys.stdout.reconfigure(encoding="utf-8")

app_data = r"C:\Users\Mohamed Helmy\.gemini\antigravity\brain\4644325f-c2d1-44e5-8356-23b4b57cbdd3\.system_generated\logs"
t_path = os.path.join(app_data, "transcript.jsonl")

with open(t_path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        idx = data.get("step_index")
        if idx and 16200 <= idx <= 16450:
            if data.get("type") == "USER_INPUT":
                created = data.get("created_at")
                print(f"=== STEP {idx} ({created}) ===")
                print(data.get("content", ""))
