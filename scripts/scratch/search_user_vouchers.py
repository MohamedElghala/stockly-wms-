import os, json, sys

sys.stdout.reconfigure(encoding='utf-8')

brain_dir = r"C:\Users\Mohamed Helmy\.gemini\antigravity\brain"
matches = []

keywords = [
    "إذن إضافة", "اذن اضافة", "إذن صرف", "اذن صرف",
    "أذون إضافة", "اذون اضافة", "أذون صرف", "اذون صرف",
    "سجل الإذن", "سجل الاذن", "سجل إذن", "سجل اذن",
    "همليك", "بمليك", "اكتب ورايا", "سجل ورايا", "تفريغ الأذون"
]

for root, dirs, files in os.walk(brain_dir):
    for f in files:
        if f == "transcript.jsonl":
            p = os.path.join(root, f)
            conv_id = os.path.basename(os.path.dirname(os.path.dirname(p)))
            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as fp:
                    for line in fp:
                        if '"USER_INPUT"' in line:
                            try:
                                d = json.loads(line)
                                if d.get("type") == "USER_INPUT":
                                    c = d.get("content", "")
                                    if any(k in c for k in keywords):
                                        matches.append((conv_id, d.get("created_at", ""), c))
                            except:
                                pass
            except:
                pass

print(f"Total matches found: {len(matches)}")
matches.sort(key=lambda x: x[1])
for cid, dt, c in matches:
    print(f"=== [{dt}] Conv: {cid} ===")
    print(c.strip()[:600])
    print("-" * 50)
