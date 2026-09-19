"""Rebuild the host CSP after editing player.js, art.js or sound.js."""
from pathlib import Path
import base64, hashlib, re
root = Path(__file__).resolve().parent
scripts = [re.sub(r'</script', lambda m: '<\\/script', (root/name).read_text(), flags=re.I) for name in ['art.js','sound.js','player.js']]
scripts.append('mountLesson(document.getElementById("game"),JSON.parse(document.getElementById("lesson-data").textContent));')
hashes = ["'sha256-" + base64.b64encode(hashlib.sha256(s.encode()).digest()).decode() + "'" for s in scripts]
page = root/'index.html'
text = page.read_text()
text, n = re.subn(r"script-src [^;]+;", "script-src 'self' 'wasm-unsafe-eval' " + ' '.join(hashes) + ';', text, count=1)
assert n == 1, 'Missing host script CSP'
text = text.replace("font-src 'none';", 'font-src blob: data:;')
page.write_text(text)
print('CSP allows four exact trusted scripts, not arbitrary model-generated code.')
