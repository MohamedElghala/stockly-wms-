import sys, json

sys.stdout.reconfigure(encoding="utf-8")

t_path = r'C:\Users\Mohamed Helmy\.gemini\antigravity\brain\4644325f-c2d1-44e5-8356-23b4b57cbdd3\.system_generated\logs\transcript.jsonl'

all_dictations = []
with open(t_path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get('type') == 'USER_INPUT':
            idx = data.get('step_index')
            if 16270 <= idx <= 17000:
                content = data.get('content', '')
                created = data.get('created_at')
                # If message contains numbers and dates or item mentions
                if any(c in content for c in ['/9/26', '/9/2026', '15/9', '16/9', '18/9', '19/9', '20/9', '22/9', '24/9', '26/9', '27/9', '28/9', '29/9']):
                    all_dictations.append((idx, created, content))

print(f"Total dictation steps found: {len(all_dictations)}")
for d in all_dictations:
    print(f"\n================ STEP {d[0]} ({d[1]}) ================")
    print(d[2].strip())
