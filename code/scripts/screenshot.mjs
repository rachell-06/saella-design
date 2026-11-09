// Chụp trang ở đúng bề rộng (CDP emulation; cửa sổ Chrome headless trên Windows không hẹp dưới ~500px).
// Dùng: node scripts/screenshot.mjs <url> <width> <out.png> [dark]  → exit 1 nếu có cuộn ngang.
// Tham số dark: giả lập máy để chế độ tối; bỏ trống = sáng (app mặc định theo máy, 2026-10-27).
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const [,, url, width, out, scheme] = process.argv;
// Port and profile per run: a Chrome from the previous run may still be closing and hold both.
const port = 9333 + (process.pid % 500);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
  ['--headless=new','--disable-gpu',`--remote-debugging-port=${port}`,`--user-data-dir=${process.env.TEMP}\cdp-shot-${process.pid}`,'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i=0;i<60;i++){ try{ tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; }catch{ await sleep(300);} }
const ws = new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id=0; const pending={};
ws.onmessage = e => { const m=JSON.parse(e.data); if(m.id&&pending[m.id]){pending[m.id](m.result); delete pending[m.id];} };
const send=(method,params={})=>new Promise(r=>{const i=++id; pending[i]=r; ws.send(JSON.stringify({id:i,method,params}));});
const w=+width;
await send('Emulation.setDeviceMetricsOverride',{width:w,height:900,deviceScaleFactor:1,mobile:w<600});
// Luôn ép chế độ: máy chụp để Windows tối thì ảnh "sáng" vẫn ra sáng.
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:scheme === 'dark' ? 'dark' : 'light'}]});
// App defaults to light and ignores the OS (2026-10-28): set next-themes' stored choice too.
await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument',{source:`try{localStorage.setItem('theme','${scheme === 'dark' ? 'dark' : 'light'}')}catch{}`});
await send('Page.navigate',{url}); await sleep(2500);
const m = await send('Runtime.evaluate',{expression:'JSON.stringify({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,h:document.documentElement.scrollHeight,inner:Math.max(0,...[...document.querySelectorAll("*")].filter(e=>/(auto|scroll)/.test(getComputedStyle(e).overflowY)&&e.clientHeight>300).map(e=>e.scrollHeight-e.clientHeight))})',returnByValue:true});
const dim=JSON.parse(m.result.value); console.log(width, dim, dim.sw>dim.cw?'OVERFLOW':'no horizontal scroll');
// App screens scroll inside the shell, not the document: grow the viewport by the inner overflow so the
// capture shows the whole page (2026-10-28).
const fullH = Math.max(dim.h, 900 + dim.inner);
await send('Emulation.setDeviceMetricsOverride',{width:w,height:fullH,deviceScaleFactor:1,mobile:w<600}); await sleep(600);
const shot = await send('Page.captureScreenshot',{format:'png'});
writeFileSync(out, Buffer.from(shot.data,'base64')); ws.close(); spawn("taskkill", ["/PID", String(chrome.pid), "/T", "/F"]); process.exit(dim.sw > dim.cw ? 1 : 0);
