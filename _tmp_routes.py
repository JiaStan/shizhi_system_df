import re
with open(r'd:/工作/code/spiderV5_optimized/backend/modules/resource/router.py', encoding='utf-8') as f:
    txt = f.read()
routes = re.findall(r'@router\.(get|post|put|delete)\("([^"]+)"', txt)
for m, p in routes:
    print(f'{m.upper():6s} {p}')
