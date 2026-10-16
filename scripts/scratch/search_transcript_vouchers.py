# -*- coding: utf-8 -*-
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

transcript_path = r'C:\Users\Mohamed Helmy\.gemini\antigravity\brain\4644325f-c2d1-44e5-8356-23b4b57cbdd3\.system_generated\logs\transcript_full.jsonl'

keywords = ['733', '734', '735', '736', '737', '738', '739', '740', '741', '742', '743', '744', '745']

print("Searching transcript for user messages mentioning vouchers 733-745...")

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line_idx, line in enumerate(f):
        try:
            item = json.loads(line)
        except:
            continue
        
        # Check if user message
        msg_type = item.get('type')
        source = item.get('source')
        content = item.get('content', '')
        
        # If user explicit or user input
        if source == 'USER_EXPLICIT' or msg_type == 'USER_INPUT':
            for kw in keywords:
                if kw in content:
                    print(f"\n--- Line {line_idx} | User Input: ---")
                    print(content[:500])
                    break
