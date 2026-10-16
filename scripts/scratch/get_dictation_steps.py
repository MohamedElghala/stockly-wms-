import sys, json, openpyxl, re

sys.stdout.reconfigure(encoding="utf-8")

# Let's inspect all dictation steps in the transcript
t_path = r'C:\Users\Mohamed Helmy\.gemini\antigravity\brain\4644325f-c2d1-44e5-8356-23b4b57cbdd3\.system_generated\logs\transcript.jsonl'

dictation_steps = []
with open(t_path, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get('type') == 'USER_INPUT':
            content = data.get('content', '')
            idx = data.get('step_index')
            created = data.get('created_at')
            # Check if this message contains voucher dictation
            # Indicators: mentions dates like 15/9, 16/9, 26/9, 27/9, 28/9, 29/9 or words like إذن, صرفنا, عدد
            if any(k in content for k in ['صرفنا', 'وارد فيو', 'وارد كايرو', 'جودة الكترك', 'جودا إلكتريك', 'وارد لاين', 'وارد ذا كالم', 'صيانة لايف', 'صيانة لاين']):
                dictation_steps.append((idx, created, content))

print(f"Found {len(dictation_steps)} dictation user messages:")
for s in dictation_steps:
    print(f"Step {s[0]} ({s[1]}): {s[2][:120].replace(chr(10), ' ')}...")
