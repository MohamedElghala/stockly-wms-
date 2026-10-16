import openpyxl
from collections import defaultdict

with open(r"c:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\wms-monorepo\scripts\scratch\forensic_exact_report.txt", "r", encoding="utf-8") as f:
    lines = f.read().splitlines()

out = []
for idx, line in enumerate(lines):
    if line.startswith("STEP ") or line.startswith("[الاضافة]") or line.startswith("[الصرف]"):
        out.append(f"Line {idx+1:4d}: {line}")

# Let's inspect what lines are in each STEP in forensic_exact_report.txt
# Specifically, let's filter out pure whitespace differences in STEP 1, and group STEP 5 by (old_code, old_name) -> (new_code, new_name)
current_step = ""
step_lines = defaultdict(list)
for line in lines:
    if line.startswith("STEP "):
        current_step = line
    elif current_step and (line.startswith("  [") or line.startswith("[")):
        step_lines[current_step].append(line)

for st, s_lines in step_lines.items():
    out.append("\n" + "="*90)
    out.append(st)
    out.append("="*90)
    if "STEP 1:" in st:
        # Filter out pure multiple-space differences in item name
        real_diffs = []
        del_count = 0
        del_samples = []
        for l in s_lines:
            if l.startswith("["):
                out.append(l)
            elif "[DIS DEL]" in l:
                del_count += 1
                if del_count <= 15 or del_count > 1990:
                    del_samples.append(l)
            else:
                # parse 'name1' (qty=q1) --> [code2] 'name2' (qty=q2)
                try:
                    p1, p2 = l.split("  -->  ")
                    n1 = p1.split("'")[1]
                    q1 = p1.split("(qty=")[1].split(")")[0]
                    n2 = p2.split("'")[1]
                    q2 = p2.split("(qty=")[1].split(")")[0]
                    if " ".join(n1.split()) != " ".join(n2.split()) or q1 != q2:
                        real_diffs.append(l)
                except Exception:
                    real_diffs.append(l)
        out.append(f"  -> Real non-whitespace MODs in STEP 1: {len(real_diffs)}")
        for rl in real_diffs:
            out.append(rl)
        out.append(f"  -> Total DELs in STEP 1: {del_count} (showing samples):")
        for dl in del_samples:
            out.append(dl)

    elif "STEP 5:" in st:
        # Group by (old_code, old_name) -> (new_code, new_name) and check if any qty changed
        code_map_add = defaultdict(set)
        code_map_dis = defaultdict(set)
        qty_changes = []
        for l in s_lines:
            if l.startswith("["):
                out.append(l)
                continue
            try:
                p1, p2 = l.split("  -->  ")
                c1 = p1.split("[")[-1].split("]")[0]
                n1 = p1.split("'")[1]
                q1 = p1.split("(qty=")[1].split(")")[0]
                c2 = p2.split("[")[1].split("]")[0]
                n2 = p2.split("'")[1]
                q2 = p2.split("(qty=")[1].split(")")[0]
                if "[ADD MOD]" in l:
                    code_map_add[(c1, n1)].add((c2, n2))
                else:
                    code_map_dis[(c1, n1)].add((c2, n2))
                if q1 != q2:
                    qty_changes.append(l)
            except Exception:
                out.append("  PARSE ERR: " + l)

        out.append(f"  -> Total Qty changes in STEP 5: {len(qty_changes)}")
        for ql in qty_changes:
            out.append(ql)

        # Check if any old_code mapped to MORE than 1 new_code!
        all_old = set(code_map_add.keys()) | set(code_map_dis.keys())
        multi_mapped = []
        all_mappings = []
        for oc, on in sorted(all_old):
            targets = code_map_add.get((oc, on), set()) | code_map_dis.get((oc, on), set())
            if len(targets) > 1:
                multi_mapped.append((oc, on, targets))
            for tc, tn in sorted(targets):
                # check if name changed beyond whitespace
                if " ".join(on.split()) != " ".join(tn.split()):
                    all_mappings.append(f"    [{oc}] '{on}'  ===>  [{tc}] '{tn}'")
        out.append(f"  -> Old codes mapped to MULTIPLE new codes (inconsistency check): {len(multi_mapped)}")
        for oc, on, t in multi_mapped:
            out.append(f"    MULTI: [{oc}] '{on}' -> {t}")
        out.append(f"  -> Distinct item name renamings/merges in STEP 5 ({len(all_mappings)}):")
        for m in all_mappings:
            out.append(m)
    else:
        for l in s_lines:
            out.append(l)

with open(r"c:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\wms-monorepo\scripts\scratch\forensic_summary.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print("Summary written! Lines:", len(out))
