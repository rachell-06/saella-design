// Reusable headless-Chrome probe: waits for conditions instead of fixed sleeps.
// usage (from a script in the session temp dir): import { browser } from "file:///D:/Workspace/Saella/Saella Platform/code/scripts/probe.mjs"; const b = await browser({ scheme: "dark" }); await b.open(url); ...; await b.close();
import { spawn, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function browser({ scheme = "light", width = 1440, height = 900 } = {}) {
  const port = 9333 + (process.pid % 500);
  const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
    "--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`,
    `--user-data-dir=${join(tmpdir(), `cdp-${process.pid}`)}`, "about:blank",
  ]);
  let tabs;
  for (let i = 0; i < 100 && !tabs; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await sleep(100); }
  }
  const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = {};
  const logs = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
      logs.push(m.params.args.map((a) => a.value ?? a.description).join(" ").slice(0, 300));
    if (m.method === "Runtime.exceptionThrown") logs.push("EXC " + JSON.stringify(m.params.exceptionDetails).slice(0, 300));
    if (m.id && pending[m.id]) { pending[m.id](m.result ?? { error: m.error }); delete pending[m.id]; }
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `try{localStorage.setItem('theme','${scheme}')}catch{}` });

  /** Evaluate a JS expression in the page; returns its value (or { error }). */
  const ev = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { error: r.exceptionDetails.exception?.description?.slice(0, 200) };
    return r.result?.value;
  };
  /** Poll until the expression is truthy (default 10s). Returns its value, or null on timeout. The value must be
   *  serialisable: wrap DOM lookups in !!(...) — an element comes back empty and never counts as found. */
  const waitFor = async (expr, ms = 10000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const v = await ev(expr);
      if (v && !v.error) return v;
      await sleep(100);
    }
    console.log("TIMEOUT", expr.slice(0, 120));
    return null;
  };
  /** Settled: no route progress, layout quiet for 300ms. */
  const settle = async () => {
    // Hydrated: React has attached to <main> (clicks before that do nothing).
    await waitFor(`document.readyState === 'complete' && !!document.querySelector('main') && Object.keys(document.querySelector('main')).some(k => k.startsWith('__react'))`, 30000);
    await sleep(300);
  };
  // Element finders: a CSS selector, or { text, in } to match a control by its visible text (prefix).
  const find = (t) =>
    typeof t === "string"
      ? `document.querySelector(${JSON.stringify(t)})`
      : `[...document.querySelectorAll(${JSON.stringify(t.in ?? "button, a, [role=menuitem], [role=tab]")})].find(e => e.innerText.trim().startsWith(${JSON.stringify(t.text)}))`;
  const click = async (t) => {
    const p = await waitFor(`(() => { const e = ${find(t)}; if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`, 8000);
    if (!p) return false;
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
      await send("Input.dispatchMouseEvent", { type, x: p[0], y: p[1], button: "left", clickCount: 1 });
    await sleep(250);
    return true;
  };
  const hover = async (t) => {
    const p = await ev(`(() => { const e = ${find(t)}; if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
    if (p) await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p[0], y: p[1] });
    await sleep(200);
  };
  const open = async (url) => { await send("Page.navigate", { url }); await settle(); };
  /** Screenshot; `clip` = a selector (its box) or [x, y, w, h]. */
  const shot = async (path, clip) => {
    let c;
    if (typeof clip === "string") {
      const b = await ev(`(() => { const r = document.querySelector(${JSON.stringify(clip)})?.getBoundingClientRect(); return r && [r.x, r.y, r.width, r.height]; })()`);
      if (b) c = { x: b[0], y: b[1], width: b[2], height: b[3], scale: 1 };
    } else if (clip) c = { x: clip[0], y: clip[1], width: clip[2], height: clip[3], scale: 1 };
    const s = await send("Page.captureScreenshot", { format: "png", ...(c ? { clip: c } : {}) });
    writeFileSync(path, Buffer.from(s.data, "base64"));
  };
  const close = () => { ws.close(); spawnSync("taskkill", ["/PID", String(chrome.pid), "/T", "/F"]); };
  return { send, ev, waitFor, settle, click, hover, open, shot, close, logs, find, sleep };
}
