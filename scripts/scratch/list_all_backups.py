# -*- coding: utf-8 -*-
import os, glob, sys
sys.stdout.reconfigure(encoding='utf-8')

dirs = [
    r'D:\The_Calm_WMS_V2.1\Excel_Database',
    r'D:\The_Calm_WMS_V2.1\_Archive_Legacy_Files',
    r'C:\Users\Mohamed Helmy\Downloads'
]

for d in dirs:
    print(f"=== Files in {d} ===")
    if os.path.exists(d):
        files = glob.glob(os.path.join(d, '**', '*.xlsx'), recursive=True)
        for f in sorted(files):
            # Print if size > 1MB or has Calm in name
            sz = os.path.getsize(f)
            if 'The_Calm' in f or 'WMS' in f:
                print(f"  {f} ({sz:,} bytes)")
