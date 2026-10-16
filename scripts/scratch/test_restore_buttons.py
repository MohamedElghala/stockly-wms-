import sys, os, zipfile, re
sys.stdout.reconfigure(encoding='utf-8')

src_master = r'C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\Excel_Database\The_Calm_WMS_V2.xlsx'
src_orig = r'C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\Excel_Database\Historical_Backups_Archive\The_Calm_WMS_V2_BACKUP_BEFORE_TAXONOMY_REORDER.xlsx'
test_out = r'C:\Users\Mohamed Helmy\Downloads\The_Calm_WMS_V2.1\Excel_Database\test_buttons_restored.xlsx'

# Extract original drawing files
orig_drawings = {}
with zipfile.ZipFile(src_orig, 'r') as z_orig:
    for name in [
        'xl/drawings/drawing1.xml',
        'xl/drawings/drawing2.xml',
        'xl/drawings/drawing3.xml',
        'xl/drawings/_rels/drawing1.xml.rels',
        'xl/drawings/_rels/drawing2.xml.rels',
        'xl/drawings/_rels/drawing3.xml.rels'
    ]:
        orig_drawings[name] = z_orig.read(name)

with zipfile.ZipFile(src_master, 'r') as z_in:
    with zipfile.ZipFile(test_out, 'w', compression=zipfile.ZIP_DEFLATED) as z_out:
        for item in z_in.infolist():
            # Skip drawing4 and sheet4 drawing rels
            if item.filename in [
                'xl/drawings/drawing4.xml',
                'xl/drawings/_rels/drawing4.xml.rels',
                'xl/worksheets/_rels/sheet4.xml.rels'
            ]:
                continue
            
            # Replace drawing 1, 2, 3 and rels
            if item.filename in orig_drawings:
                z_out.writestr(item.filename, orig_drawings[item.filename])
            elif item.filename == 'xl/worksheets/sheet4.xml':
                content = z_in.read(item.filename).decode('utf-8')
                content = re.sub(r'<drawing[^>]*/>', '', content)
                z_out.writestr(item.filename, content.encode('utf-8'))
            elif item.filename == '[Content_Types].xml':
                content = z_in.read(item.filename).decode('utf-8')
                content = content.replace('<Override PartName="/xl/drawings/drawing4.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>', '')
                z_out.writestr(item.filename, content.encode('utf-8'))
            else:
                z_out.writestr(item, z_in.read(item.filename))

print('Created test_buttons_restored.xlsx successfully!')
