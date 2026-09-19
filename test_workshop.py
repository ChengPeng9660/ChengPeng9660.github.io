from pathlib import Path
import json, threading, http.server, functools, os, re, shutil
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parent
APP=ROOT/'lesson-workshop'
OUT=ROOT/'workshop-qa';OUT.mkdir(exist_ok=True)
handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT))
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}/lesson-workshop/'
INLINE=os.getenv('WORKSHOP_INLINE')=='1'
def load(page,name='index.html'):
 if not INLINE:
  page.goto(URL+name);return
 if name!='index.html':
  page.set_content((APP/name).read_text());return
 html=(APP/name).read_text()
 html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>','',html)
 html=re.sub(r'<script[^>]*src=[^>]*></script>','',html)
 html=html.replace('<head>','<head><base href="https://workshop.example/lesson-workshop/">')
 html=html.replace('<link rel="stylesheet" href="studio.css">','<style>'+(APP/'studio.css').read_text()+'</style>')
 page.route('https://workshop.example/lesson-workshop/**', lambda route: route.fulfill(status=200,content_type='text/plain',body=(APP/route.request.url.rsplit('/',1)[-1]).read_bytes()) if (APP/route.request.url.rsplit('/',1)[-1]).is_file() else route.fulfill(status=404))
 page.set_content(html)
 for f in ['art.js','contract.js','studio.js']:page.add_script_tag(content=(APP/f).read_text())
para1='春天，风把一粒小种子带到河边。小种子躺在松软的泥土里，喝了雨水，晒了太阳。'
para2='几天后，小种子长出了嫩芽。蜗牛问：“你怎么长大了？”小种子说：“泥土给我安稳的家，雨水和阳光帮助我长大。”'
para3='夏天，小种子变成了一棵小树。小鸟飞来，在树枝上唱歌。小树说：“以前，大家帮助我。现在，我也能给小鸟一个歇脚的地方。”'
def stage(kind,prompt,quote,sid,**extra):return dict(kind=kind,prompt=prompt,quote=quote,sourceId=sid,goal='理解原文，找出理由。',art='leaf',hints=['读一读有关种子的那句话。','注意雨水和阳光。'],feedback='找到啦，把发现带到下一页。',teacher='观察学生是否结合原文说明理由。',**extra)
mock=dict(title='小种子的旅行',subtitle='一起找找长大的秘密。',grade='小学二年级',theme='meadow',mascot='leaf',teacherNote='请核对原文，口头表达不自动评分。',stages=[stage('evidence','哪句话写了种子得到的帮助？',para1,'s2',options=['春天，风把一粒小种子带到河边。','小种子躺在松软的泥土里，喝了雨水，晒了太阳。'],answer=1),stage('choice','谁帮助小种子长大？',para2,'s3',options=['雨水和阳光','只有小鸟'],answer=0),stage('order','把长大的故事排一排。',para1+'\n\n'+para2,'s2',items=['来到河边','长出嫩芽','成为小树']),stage('speak','说说小树能帮谁。',para3,'s4',keywords=['小鸟','歇脚','帮助'])])
# Each quotation must be a contiguous excerpt within its own source.
mock['stages'][2]['quote']=para3;mock['stages'][2]['sourceId']='s4'
records=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1366,'height':900},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGEERROR',str(e),flush=True)));page.on('console',lambda m:print('BROWSER',m.type,m.text,flush=True) if m.type in ['error','warning'] else None)
 load(page);page.wait_for_selector('#cover-art svg');page.screenshot(path=str(OUT/'home-desktop.png'),full_page=True)
 assert page.locator('h1').inner_text().startswith('把这一课')
 for w,h in [(1366,768),(390,844),(320,740),(768,1024)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(70)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'overflow {w}'
  if w==390:page.screenshot(path=str(OUT/'home-mobile.png'),full_page=True)
 records.append('Landing page: no horizontal overflow at 1366/390/320/768 widths.')
 page.set_viewport_size({'width':1366,'height':900})
 page.locator('#sample').click();page.locator('#source-ok').check();page.locator('#api-key').fill('test-key-not-real-12345');page.locator('#api-consent').check()
 captured=[]
 def fake(route):
  captured.append(json.loads(route.request.post_data));route.fulfill(status=200,content_type='application/json',body=json.dumps({'choices':[{'finish_reason':'stop','message':{'content':json.dumps(mock,ensure_ascii=False)}}],'usage':{'prompt_tokens':123,'completion_tokens':456}}))
 page.route('https://openrouter.ai/api/v1/chat/completions',fake)
 page.locator('#generate').click();page.wait_for_selector('#preview-ready:visible',timeout=20000)
 assert '草稿已生成' in page.locator('#generation-status').inner_text()
 assert len(captured)==1
 assert 'test-key-not-real' not in json.dumps(captured)
 if not INLINE:assert page.evaluate('localStorage.length')==0 and page.evaluate('sessionStorage.length')==0
 frame=page.frame_locator('#preview')
 frame.get_by_role('button',name='出发吧',exact=True).click();page.wait_for_timeout(500);print('AFTER_START',frame.locator('body').inner_text(),flush=True);page.screenshot(path=str(OUT/'after-start.png'))
 frame.get_by_role('button',name=re.compile('春天，风')).click()
 assert frame.locator('.hint').is_visible()
 frame.get_by_role('button',name=re.compile('小种子躺在')).click()
 frame.get_by_role('button',name='接着走',exact=True).click()
 frame.get_by_role('button',name='雨水和阳光',exact=True).click()
 frame.get_by_role('button',name='接着走',exact=True).click()
 for label in ['来到河边','长出嫩芽','成为小树']:frame.get_by_role('button',name=re.compile(label)).click()
 frame.get_by_role('button',name='排好啦',exact=True).click()
 frame.get_by_role('button',name='接着走',exact=True).click()
 frame.get_by_role('button',name='我说好了',exact=True).click()
 frame.get_by_role('button',name='完成冒险',exact=True).click()
 assert frame.get_by_text('这次冒险，完成啦。').is_visible()
 assert page.locator('#download-html').is_disabled()
 page.locator('#approved').check()
 with page.expect_download() as d:page.locator('#download-html').click()
 download=d.value;dest=OUT/'export.html';download.save_as(str(dest));html=dest.read_text()
 assert 'test-key-not-real' not in html and 'Authorization' not in html and 'api.openai.com' not in html
 assert "connect-src 'none'" in html
 record=browser.new_page(viewport={'width':1366,'height':768});record.set_content(html) if INLINE else record.goto('file://'+str(dest));record.get_by_role('button',name='出发吧',exact=True).click();assert record.get_by_text('哪句话写了种子得到的帮助？').is_visible();record.screenshot(path=str(OUT/'game-reading-desktop.png'))
 record.set_viewport_size({'width':390,'height':844});record.screenshot(path=str(OUT/'game-reading-mobile.png'),full_page=True);assert record.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 records.append('Mock API → validation → full 4-stage path → approval → download; '+('export rendered inline (file navigation blocked by local environment).' if INLINE else 'export reopened through file://.'))
 page.locator('#clear-key').click();assert not page.locator('#api-key').input_value();assert not page.locator('#api-consent').is_checked()
 # Local rejection of ungrounded quotations and raw executable data.
 validation=page.evaluate('''(mock)=>{try{mock.stages[0].quote='这不是原文';LessonContract.validate(mock,LessonContract.sources(document.querySelector('#source').value));return false}catch{return true}}''',mock)
 assert validation
 page.locator('#review-details').evaluate('(e)=>e.open=true')
 page.locator('[data-edit="prompt"]').first.fill('换一个问题');assert page.locator('#download-html').is_disabled()
 page.locator('#apply-edits').click();expect(page.locator('#generation-status')).to_contain_text('修改已应用')
 page.locator('#provider').select_option('custom');page.locator('#endpoint').fill('https://gateway.example/v1');page.locator('#api-key').fill('a-new-key-1234');page.locator('#api-consent').check();page.locator('#endpoint').fill('https://different.example/v1');assert page.locator('#api-key').input_value()=='' and not page.locator('#api-consent').is_checked()
 records.append('Keys stay out of request bodies, storage and exports; changing endpoint clears key/consent; edits clear approval; fabricated source quote rejected.')
 # Unsupported upload produces actionable error.
 bad=OUT/'not-supported.docx';bad.write_text('test')
 page.locator('#file').set_input_files(str(bad));expect(page.locator('#file-status')).to_contain_text('暂不支持')
 # The original, self-contained demo can actually start.
 demo=browser.new_page(viewport={'width':1366,'height':768});load(demo,'demo.html');demo.get_by_role('button',name='出发吧',exact=True).click();demo.locator('[data-testid="lens"]').click();assert demo.get_by_text('哪句话写了叶子上的麻烦？').is_visible();demo.screenshot(path=str(OUT/'original-demo.png'));records.append('Existing cotton demo loads and reaches first reading task.')
 # PDF integration runs in CI after vendoring PDF.js; local absence is not a pass.
 pdf_status='not run: vendor downloaded in CI'
 if (APP/'vendor/pdf.min.mjs').exists():
  from reportlab.pdfgen import canvas
  f=OUT/'upload-test.pdf';c=canvas.Canvas(str(f));c.drawString(50,750,'The little seed drinks rain and grows in the sunshine.');c.showPage();c.drawString(50,750,'Soon the seed becomes a small tree.');c.save()
  page.locator('#file').set_input_files(str(f));page.wait_for_selector('#pdf-tools:visible',timeout=45000);page.locator('#extract').click();expect(page.locator('#source')).to_have_value(re.compile('little seed'),timeout=45000);assert 'small tree' in page.locator('#source').input_value();pdf_status='passed: two-page PDF locally parsed with vendored PDF.js'
  records.append(pdf_status)
 assert not errors,errors
 result={'checks':records,'browser_errors':errors,'pdf':pdf_status,'mode':'inline local harness (CSP and navigation checked in CI)' if INLINE else 'real HTTP and file URLs','live_paid_api':'Not tested: no user API key supplied. Mock is not a paid-service integration test.'}
 (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print(json.dumps(result,ensure_ascii=False,indent=2))
 browser.close()
server.shutdown()
