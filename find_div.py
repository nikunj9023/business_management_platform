import re

with open("index.html", "r") as f:
    html = f.read()

count = 0
for m in re.finditer(r'<div[^>]*>|</div>', html):
    if m.group().startswith('</'):
        count -= 1
    else:
        count += 1
    if count < 0:
        print("Mismatch at line:", html[:m.start()].count('\n') + 1)
        print("Context:", html[m.start()-50:m.end()+50])
        count = 0 # reset to find more

