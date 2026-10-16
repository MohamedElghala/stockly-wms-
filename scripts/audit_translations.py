import os
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

# 1. Collect all t('...') calls
t_calls = set()
pattern = re.compile(r"t\(\s*['\"]([^'\"]+)['\"]\s*\)")

for root, dirs, files in os.walk('apps/web/src'):
    if any(k in root for k in ['node_modules', '.next', '.git']):
        continue
    for f in files:
        if f.endswith(('.tsx', '.ts')):
            fp = os.path.join(root, f)
            with open(fp, 'r', encoding='utf-8', errors='ignore') as fl:
                for line in fl:
                    for m in pattern.findall(line):
                        t_calls.add((m, fp))

print(f'Total unique t() calls: {len(set(k[0] for k in t_calls))}')

# 2. Extract defined keys in ar.ts and en.ts
with open('apps/web/src/locales/ar.ts', 'r', encoding='utf-8') as f:
    ar_text = f.read()

with open('apps/web/src/locales/en.ts', 'r', encoding='utf-8') as f:
    en_text = f.read()

def parse_ts_dict(text):
    keys = set()
    current_path = []
    lines = text.splitlines()
    for line in lines:
        line = line.strip()
        if line.startswith('//') or line.startswith('export '):
            continue
        m_section = re.match(r'^([a-zA-Z0-9_]+)\s*:\s*\{', line)
        if m_section:
            current_path.append(m_section.group(1))
            continue
        if line.startswith('}'):
            if current_path:
                current_path.pop()
            continue
        m_key = re.match(r'^([a-zA-Z0-9_]+)\s*:\s*[\'\"`]', line)
        if m_key and current_path:
            full_key = '.'.join(current_path + [m_key.group(1)])
            keys.add(full_key)
    return keys

ar_keys = parse_ts_dict(ar_text)
en_keys = parse_ts_dict(en_text)

print(f'Parsed ar_keys: {len(ar_keys)}')
print(f'Parsed en_keys: {len(en_keys)}')

missing_in_ar = []
missing_in_en = []

for k, fp in sorted(t_calls):
    if k not in ar_keys:
        missing_in_ar.append((k, fp))
    if k not in en_keys:
        missing_in_en.append((k, fp))

print(f'\n--- Keys missing in ar.ts (Total: {len(missing_in_ar)}) ---')
for k, fp in missing_in_ar:
    print(f'Missing in ar: {k} (used in {os.path.basename(fp)})')

print(f'\n--- Keys missing in en.ts (Total: {len(missing_in_en)}) ---')
for k, fp in missing_in_en:
    print(f'Missing in en: {k} (used in {os.path.basename(fp)})')

print(f'\n--- Keys in ar.ts missing in en.ts: {len(ar_keys - en_keys)} ---')
for k in sorted(list(ar_keys - en_keys)):
    print(f'In ar but not in en: {k}')

print(f'\n--- Keys in en.ts missing in ar.ts: {len(en_keys - ar_keys)} ---')
for k in sorted(list(en_keys - ar_keys)):
    print(f'In en but not in ar: {k}')
