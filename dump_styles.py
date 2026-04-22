import urllib.request
import re

with open("index.html", "r") as f:
    html = f.read()

# Let's see if something is unclosed
def find_mismatch(html):
    tags = re.findall(r'<div[^>]*>|</div>', html)
    open_count = 0
    for t in tags:
        if t.startswith('</'):
            open_count -= 1
        else:
            open_count += 1
    return open_count

print("Unclosed div count:", find_mismatch(html))
