import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity, ArrowRight, Check, CircleHelp, Clapperboard, Cloud, Database, Download,
  FileImage, FolderOpen, ImagePlus, KeyRound, Layers, LogOut, RefreshCw, Save,
  Settings2, ShieldCheck, Sparkles, Upload, UserRound, WandSparkles, X
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { readPsd } from "ag-psd";
import {
  EditorDocument, createLayerSetMeasurer, generateIkiFromLayerSet,
  parseLayerRoles, packAtlas, partIdsOfRole, uvRectFor
} from "@ikijs/editor";
import { IkiPlayer, IkiMotion } from "@ikijs/engine";
import { loadIkiModel } from "@ikijs/format";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseAnon ? createClient(supabaseUrl, supabaseAnon) : null;
const messageOf = (error) => error instanceof Error ? error.message : String(error || "Unknown error");

async function callMaxRouter(action, apiKey, extra = {}) {
  const response = await fetch("/api/max-router", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ action, apiKey, ...extra })
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { error: raw }; }
  if (!response.ok) {
    const detail = data?.error?.message || data?.error || data?.detail || ("HTTP " + response.status);
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Gagal mengekspor layer PSD.")), "image/png");
  });
}

async function makeDemoLayer(name, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak tersedia untuk membuat demo.");
  draw(ctx);
  const blob = await canvasBlob(canvas);
  return new File([blob], name + ".png", { type: "image/png" });
}

async function createDemoLayers() {
  const skin = "#e7b69f";
  const hair = "#29364a";
  const ink = "#20212a";
  const layers = [
    ["body", (ctx) => {
      ctx.fillStyle = "#526a7b";
      ctx.beginPath();
      ctx.moveTo(90, 1000);
      ctx.lineTo(130, 870);
      ctx.quadraticCurveTo(240, 770, 360, 770);
      ctx.lineTo(640, 770);
      ctx.quadraticCurveTo(760, 770, 870, 870);
      ctx.lineTo(910, 1000);
      ctx.closePath();
      ctx.fill();
    }],
    ["face", (ctx) => {
      ctx.fillStyle = skin;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(500, 200);
      ctx.bezierCurveTo(620, 200, 700, 300, 700, 435);
      ctx.bezierCurveTo(700, 590, 625, 700, 500, 760);
      ctx.bezierCurveTo(375, 700, 300, 590, 300, 435);
      ctx.bezierCurveTo(300, 300, 380, 200, 500, 200);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }],
    ["eye_R", (ctx) => {
      ctx.fillStyle = "#fff8f1";
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.ellipse(395, 433, 65, 33, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }],
    ["eye_L", (ctx) => {
      ctx.fillStyle = "#fff8f1";
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.ellipse(606, 433, 65, 33, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }],
    ["iris_R", (ctx) => {
      ctx.fillStyle = "#5d9eb2"; ctx.beginPath(); ctx.ellipse(395, 433, 29, 34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#182a3d"; ctx.beginPath(); ctx.ellipse(395, 438, 15, 23, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(405, 420, 7, 0, Math.PI * 2); ctx.fill();
    }],
    ["iris_L", (ctx) => {
      ctx.fillStyle = "#5d9eb2"; ctx.beginPath(); ctx.ellipse(606, 433, 29, 34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#182a3d"; ctx.beginPath(); ctx.ellipse(606, 438, 15, 23, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(616, 420, 7, 0, Math.PI * 2); ctx.fill();
    }],
    ["lash_R", (ctx) => {
      ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(330, 414); ctx.quadraticCurveTo(395, 378, 460, 414); ctx.stroke();
    }],
    ["lash_L", (ctx) => {
      ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(541, 414); ctx.quadraticCurveTo(606, 378, 671, 414); ctx.stroke();
    }],
    ["brow_R", (ctx) => {
      ctx.strokeStyle = "#5b3a39"; ctx.lineWidth = 10; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(340, 365); ctx.quadraticCurveTo(405, 330, 477, 362); ctx.stroke();
    }],
    ["brow_L", (ctx) => {
      ctx.strokeStyle = "#5b3a39"; ctx.lineWidth = 10; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(524, 362); ctx.quadraticCurveTo(596, 330, 661, 365); ctx.stroke();
    }],
    ["mouth", (ctx) => {
      ctx.strokeStyle = "#8d4854"; ctx.lineWidth = 8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(465, 600); ctx.quadraticCurveTo(500, 617, 535, 600); ctx.stroke();
    }],
    ["mouth_open", (ctx) => {
      ctx.fillStyle = "#713744"; ctx.beginPath(); ctx.ellipse(500, 602, 34, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e8a2a4"; ctx.beginPath(); ctx.ellipse(500, 610, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
    }],
    ["nose", (ctx) => {
      ctx.fillStyle = "#d18f83"; ctx.beginPath(); ctx.ellipse(500, 535, 22, 40, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#a86d68"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(488, 562); ctx.quadraticCurveTo(500, 570, 512, 562); ctx.stroke();
    }],
    ["hair_back", (ctx) => {
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(500, 500, 310, 500, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(190, 720); ctx.quadraticCurveTo(110, 820, 90, 1000); ctx.lineTo(190, 1000); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(810, 720); ctx.quadraticCurveTo(890, 820, 910, 1000); ctx.lineTo(810, 1000); ctx.closePath(); ctx.fill();
    }],
    ["hair_front", (ctx) => {
      ctx.fillStyle = "#35455e";
      ctx.beginPath();
      ctx.moveTo(170, 10);
      ctx.bezierCurveTo(310, -8, 690, -8, 830, 10);
      ctx.lineTo(762, 350);
      ctx.lineTo(238, 350);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(238, 350); ctx.lineTo(347, 350); ctx.lineTo(347, 690);
      ctx.quadraticCurveTo(320, 860, 170, 970); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(654, 350); ctx.lineTo(762, 350); ctx.lineTo(830, 970);
      ctx.quadraticCurveTo(680, 860, 654, 690); ctx.closePath(); ctx.fill();
    }]
  ];
  const files = [];
  for (const [name, draw] of layers) files.push(await makeDemoLayer(name, draw));
  return files;
}

async function extractPsdLayers(file) {
  const psd = readPsd(await file.arrayBuffer(), { skipLayerImageData: false, skipCompositeImageData: true });
  if (!psd.width || !psd.height || !Array.isArray(psd.children)) throw new Error("PSD tidak memiliki layer yang dapat dibaca.");
  const pending = [];
  const walk = (items) => {
    for (const layer of items || []) {
      if (layer.hidden) continue;
      if (layer.children?.length) walk(layer.children);
      if (!layer.canvas) continue;
      const canvas = document.createElement("canvas");
      canvas.width = psd.width;
      canvas.height = psd.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D tidak tersedia.");
      ctx.drawImage(layer.canvas, layer.left || 0, layer.top || 0);
      pending.push(canvasBlob(canvas).then((blob) =>
        new File([blob], (layer.name || "layer").trim() + ".png", { type: "image/png" })
      ));
    }
  };
  walk(psd.children);
  const files = await Promise.all(pending);
  if (!files.length) throw new Error("Tidak ada pixel layer pada PSD.");
  return files;
}

function renderAtlas(decoded, layout) {
  const canvas = document.createElement("canvas");
  canvas.width = layout.pageWidth;
  canvas.height = layout.pageHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tidak dapat membuat atlas texture.");
  const byId = new Map(decoded.map((item) => [item.id, item]));
  const pad = layout.padding || 0;
  for (const placement of layout.placements) {
    const source = byId.get(placement.id);
    if (!source) throw new Error("Atlas source tidak ditemukan: " + placement.id);
    const bitmap = source.bitmap;
    const x = placement.x, y = placement.y, w = placement.width, h = placement.height;
    ctx.drawImage(bitmap, x, y, w, h);
    if (pad > 0) {
      ctx.drawImage(bitmap, w - 1, 0, 1, h, x + w, y, pad, h);
      ctx.drawImage(bitmap, 0, h - 1, w, 1, x, y + h, w, pad);
      ctx.drawImage(bitmap, w - 1, h - 1, 1, 1, x + w, y + h, pad, pad);
    }
  }
  const uri = canvas.toDataURL("image/png");
  if (!uri.startsWith("data:image/png")) throw new Error("Atlas terlalu besar atau tidak valid.");
  return uri;
}

async function buildIkiFromFiles(inputFiles) {
  if (!inputFiles.length) throw new Error("Pilih satu PSD ber-layer atau beberapa PNG layer.");
  const psdFiles = inputFiles.filter((file) => file.name.toLowerCase().endsWith(".psd"));
  if (psdFiles.length && (psdFiles.length !== 1 || inputFiles.length !== 1)) {
    throw new Error("Pilih satu file PSD saja, atau beberapa PNG. Jangan campur PSD dan PNG.");
  }
  const files = psdFiles.length ? await extractPsdLayers(psdFiles[0]) : inputFiles;
  if (files.length > 64) throw new Error("Maksimal 64 layer PNG.");
  for (const file of files) {
    if (file.type !== "image/png") throw new Error(file.name + " bukan PNG.");
    if (file.size > 20 * 1024 * 1024) throw new Error(file.name + " melebihi batas 20 MB.");
  }

  const rolePairs = parseLayerRoles(files.map((file) => file.name));
  const roleByName = new Map(rolePairs.map((entry) => [entry.fileName, entry.role]));
  const bitmaps = [];
  const sources = [];
  try {
    for (const file of files) {
      bitmaps.push({
        fileName: file.name,
        bitmap: await createImageBitmap(file, { premultiplyAlpha: "none", imageOrientation: "none" })
      });
    }
    const width = bitmaps[0].bitmap.width;
    const height = bitmaps[0].bitmap.height;
    if (width > 4096 || height > 4096) throw new Error("Ukuran canvas maksimal 4096 × 4096.");
    const totalPixels = bitmaps.reduce((sum, item) => sum + item.bitmap.width * item.bitmap.height, 0);
    if (totalPixels > 256 * 1024 * 1024) throw new Error("Total pixel layer melewati batas 256 megapixel.");
    if (bitmaps.some((item) => item.bitmap.width !== width || item.bitmap.height !== height)) {
      throw new Error("Semua PNG layer harus memiliki ukuran canvas yang sama.");
    }

    const measurer = createLayerSetMeasurer({ width, height });
    for (const item of bitmaps) {
      const role = roleByName.get(item.fileName);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas 2D tidak tersedia untuk membaca pixel.");
      ctx.drawImage(item.bitmap, 0, 0);
      const measured = measurer.add({
        role,
        fileName: item.fileName,
        rgba: ctx.getImageData(0, 0, width, height).data
      });
      if (!measured) throw new Error("Layer kosong setelah pemeriksaan alpha: " + item.fileName);
      const crop = await createImageBitmap(item.bitmap, measured.bbox.x, measured.bbox.y, measured.bbox.w, measured.bbox.h, { premultiplyAlpha: "none", imageOrientation: "none" });
      for (const partId of partIdsOfRole(role)) {
        const bitmap = await createImageBitmap(crop);
        sources.push({ id: partId, bitmap, width: bitmap.width, height: bitmap.height });
      }
      crop.close();
    }

    const measurement = measurer.finish();
    const model = generateIkiFromLayerSet(
      measurement.layers,
      { width, height },
      measurement.turnOptions
    );
    const layout = packAtlas(sources.map(({ id, width: w, height: h }) => ({ id, width: w, height: h })));
    const atlas = renderAtlas(sources, layout);
    const assignments = sources.map((source) => {
      const placement = layout.placements.find((entry) => entry.id === source.id);
      if (!placement) throw new Error("Atlas placement tidak ditemukan untuk " + source.id);
      return {
        partId: source.id,
        uv: uvRectFor(placement, { width: layout.pageWidth, height: layout.pageHeight })
      };
    });
    const documentModel = new EditorDocument(model);
    documentModel.applyAtlas({ textures: [{ source: atlas }], partTextureAssignments: assignments });
    const finalModel = documentModel.toIkiModel();
    loadIkiModel(JSON.stringify(finalModel));
    return finalModel;
  } finally {
    for (const item of bitmaps) item.bitmap.close();
    for (const item of sources) item.bitmap.close();
  }
}

export default function App() {
  const [tab, setTab] = useState("create");
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem("max_router_api_key") || "");
  const [prompt, setPrompt] = useState("");
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [modelFiles, setModelFiles] = useState([]);
  const [riggedModel, setRiggedModel] = useState(null);
  const [modelName, setModelName] = useState("Karakter Baru");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [library, setLibrary] = useState([]);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [parameterValues, setParameterValues] = useState({});
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const motionRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => { sessionStorage.setItem("max_router_api_key", apiKey); }, [apiKey]);

  const loadModels = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const result = await callMaxRouter("models", apiKey);
      const items = Array.isArray(result.data) ? result.data : [];
      setModels(items);
      if (items.length && !selectedModel) setSelectedModel(items[0].id);
      setNotice(items.length ? items.length + " model image ditemukan dari Max Router." : "Koneksi berhasil, tetapi model image belum tersedia.");
    } catch (err) { setError(messageOf(err)); }
    finally { setBusy(false); }
  }, [apiKey, selectedModel]);

  useEffect(() => { loadModels(); }, []);

  const generateImage = async () => {
    if (!prompt.trim()) return setError("Isi prompt karakter terlebih dahulu.");
    if (!selectedModel) return setError("Pilih model image dari Max Router.");
    setBusy(true); setError(""); setNotice("Mengirim prompt ke Max Router...");
    try {
      const result = await callMaxRouter("generate", apiKey, {
        request: { model: selectedModel, prompt: prompt.trim(), n: 1, size: "1024x1024" }
      });
      const first = result.data?.[0];
      const image = first?.url || (first?.b64_json ? "data:image/png;base64," + first.b64_json : "");
      if (!image) throw new Error(result.error?.message || "Provider tidak mengembalikan URL atau base64 gambar.");
      setGeneratedImage(image);
      setNotice("Gambar berhasil dibuat melalui Max Router.");
    } catch (err) { setError(messageOf(err)); setNotice(""); }
    finally { setBusy(false); }
  };

  const runRigging = async () => {
    if (!modelFiles.length) return setError("Pilih file PSD atau PNG layer terlebih dahulu.");
    setBusy(true); setError(""); setNotice("Membaca layer, mengukur alpha, membangun mesh, dan membuat rig Iki...");
    try {
      const model = await buildIkiFromFiles(modelFiles);
      setRiggedModel(model);
      setParameterValues(Object.fromEntries(model.parameters.map((parameter) => [parameter.id, parameter.default])));
      setNotice("Auto-rig selesai. Model Iki berhasil divalidasi.");
    } catch (err) { setError(messageOf(err)); setNotice(""); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if (!riggedModel || !canvasRef.current) return;
      let player;
      try {
        const canvas = canvasRef.current;
        const rect = canvas.parentElement?.getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.floor((rect?.width || 900) * pixelRatio));
        canvas.height = Math.max(1, Math.floor((rect?.height || 440) * pixelRatio));
        player = new IkiPlayer(canvas);
        const parsedModel = loadIkiModel(JSON.stringify(riggedModel));
        const loadResult = await player.load(parsedModel);
        if (loadResult?.failedTextures?.length) {
          throw new Error("Texture gagal dimuat: " + loadResult.failedTextures.join(", "));
        }
        if (cancelled) { player.destroy(); return; }
        player.start();
        const motion = new IkiMotion(parsedModel, (id) => player.getParameter(id), (id, value) => player.setParameter(id, value));
        playerRef.current = player;
        motionRef.current = motion;
        const tick = (now) => {
          if (cancelled) return;
          motion.update(now);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        player?.destroy();
        setError("Preview gagal dimuat: " + messageOf(err));
      }
    };
    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
      motionRef.current = null;
    };
  }, [riggedModel]);

  const sendMagicLink = async (event) => {
    event.preventDefault();
    if (!supabase) return setAuthMessage("Supabase belum dikonfigurasi pada deployment.");
    if (!email.trim()) return setAuthMessage("Masukkan email.");
    setLibraryBusy(true); setAuthMessage("");
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin }
    });
    setAuthMessage(authError ? authError.message : "Link masuk dikirim. Periksa inbox email.");
    setLibraryBusy(false);
  };

  const loadLibrary = async () => {
    if (!supabase || !session) return;
    setLibraryBusy(true);
    const { data, error: dbError } = await supabase.from("vtuber_models")
      .select("id,name,prompt,created_at,model").order("created_at", { ascending: false });
    if (dbError) setError(dbError.message);
    else setLibrary(data || []);
    setLibraryBusy(false);
  };

  useEffect(() => { if (session) loadLibrary(); }, [session]);

  const saveModel = async () => {
    if (!supabase || !session) return setError("Masuk dengan email untuk menyimpan model ke database.");
    if (!riggedModel) return setError("Belum ada model rigged untuk disimpan.");
    setLibraryBusy(true); setError("");
    const { error: dbError } = await supabase.from("vtuber_models").insert({
      user_id: session.user.id, name: modelName.trim() || "Model tanpa nama",
      prompt: prompt.trim(), model: riggedModel
    });
    if (dbError) setError(dbError.message);
    else { setNotice("Model tersimpan ke Supabase."); await loadLibrary(); }
    setLibraryBusy(false);
  };

  const exportModel = () => {
    if (!riggedModel) return;
    const blob = new Blob([JSON.stringify(riggedModel, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = (modelName.trim() || "character").toLowerCase().replace(/[^a-z0-9-_]+/g, "-") + ".iki";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openSavedModel = (item) => {
    setRiggedModel(item.model);
    setModelName(item.name);
    setTab("rig");
    setNotice("Model dimuat dari database.");
  };

  const setParameter = (id, value) => {
    const number = Number(value);
    setParameterValues((current) => ({ ...current, [id]: number }));
    playerRef.current?.setParameter(id, number);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Layers size={20} /></div><div><strong>KURO</strong><span>MODEL LAB</span></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          <button className={tab === "create" ? "nav-item active" : "nav-item"} onClick={() => setTab("create")}><WandSparkles size={17} />Generate</button>
          <button className={tab === "rig" ? "nav-item active" : "nav-item"} onClick={() => setTab("rig")}><Activity size={17} />2D Rigging</button>
          <button className={tab === "library" ? "nav-item active" : "nav-item"} onClick={() => setTab("library")}><FolderOpen size={17} />Library</button>
          <button className={tab === "settings" ? "nav-item active" : "nav-item"} onClick={() => setTab("settings")}><Settings2 size={17} />Settings</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="connection-card"><span className="connection-dot" /><div><b>MAX ROUTER</b><small>AI gateway</small></div><button title="Refresh models" onClick={loadModels}><RefreshCw size={14} /></button></div>
          <div className="sidebar-foot">IKI ENGINE · WEBGL2<br />OPEN MODEL FORMAT</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><div className="eyebrow">CREATOR WORKSPACE / 2D CHARACTER SYSTEM</div><h1>{tab === "create" ? "AI Character Generator" : tab === "rig" ? "Auto-Rigging Studio" : tab === "library" ? "Model Library" : "Studio Settings"}</h1></div>
          <div className="top-actions">
            <span className="status-chip"><span className="connection-dot" />{models.length ? "Router connected" : "Router setup"}</span>
            {session ? <button className="user-chip" onClick={() => supabase.auth.signOut()}><UserRound size={15} />{session.user.email?.split("@")[0]}<LogOut size={14} /></button> : <button className="user-chip" onClick={() => setTab("library")}><UserRound size={15} />Sign in</button>}
          </div>
        </header>

        {(notice || error) && <div className={error ? "alert error" : "alert success"}>{error ? <CircleHelp size={16} /> : <Check size={16} />}{error || notice}<button onClick={() => { setError(""); setNotice(""); }}><X size={15} /></button></div>}

        {tab === "create" && <section className="content-grid">
          <div className="panel prompt-panel">
            <div className="panel-head"><div><span className="eyebrow">01 / IMAGE GENERATION</span><h2>Design your character</h2></div><span className="tag">MAX ROUTER</span></div>
            <label className="field-label">CHARACTER PROMPT</label>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Anime VTuber character, full body, detailed outfit, clean line art, neutral standing pose, symmetrical front view..." rows={7} />
            <div className="prompt-hint">Gunakan desain menghadap depan. Untuk rigging, siapkan layer transparan terpisah atau PSD ber-layer.</div>
            <div className="field-row"><div className="field-grow"><label className="field-label">IMAGE MODEL</label><select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}><option value="">Select image model</option>{models.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}</select></div><button className="icon-button" title="Reload models" onClick={loadModels} disabled={busy}><RefreshCw size={16} /></button></div>
            <button className="primary-button wide" onClick={generateImage} disabled={busy || !selectedModel}><Sparkles size={17} />{busy ? "Processing..." : "Generate character image"}</button>
            <div className="fine-print"><ShieldCheck size={14} />Request melalui Max Router. API key tidak ditanam di source code.</div>
          </div>
          <div className="panel preview-panel">
            <div className="panel-head"><div><span className="eyebrow">02 / OUTPUT PREVIEW</span><h2>Character artwork</h2></div>{generatedImage && <a className="text-link" href={generatedImage} download="character.png"><Download size={14} />Download</a>}</div>
            <div className="image-stage">{generatedImage ? <img src={generatedImage} alt="Generated VTuber character" /> : <div className="empty-state"><div className="empty-icon"><ImagePlus size={28} /></div><b>Your character appears here</b><span>Generate an image using a model connected to Max Router.</span></div>}</div>
            <div className="stage-footer"><span>IMAGE OUTPUT</span><span>{generatedImage ? "READY" : "WAITING FOR PROMPT"}</span></div>
          </div>
          <div className="panel workflow-panel">
            <div className="panel-head"><div><span className="eyebrow">NEXT STEP</span><h2>Turn artwork into a 2D puppet</h2></div><Layers size={18} /></div>
            <p>Iki mengubah layer transparan menjadi karakter dengan blink, gaze, mouth movement, head turn, breathing, dan hair physics.</p>
            <div className="workflow-steps"><span>01</span><div><b>Separate artwork</b><small>Pisahkan wajah, mata, mulut, rambut, dan badan sebagai layer.</small></div></div>
            <div className="workflow-steps"><span>02</span><div><b>Import PSD or PNG layers</b><small>Gunakan ukuran canvas yang sama dan nama role Iki.</small></div></div>
            <div className="workflow-steps"><span>03</span><div><b>Auto-rig and export</b><small>Preview rig lalu ekspor model .iki.</small></div></div>
            <button className="secondary-button wide" onClick={() => setTab("rig")}>Open 2D rigging studio <ArrowRight size={16} /></button>
          </div>
        </section>}

        {tab === "rig" && <section className="rig-layout">
          <div className="panel import-panel">
            <div className="panel-head"><div><span className="eyebrow">01 / LAYER INPUT</span><h2>Import character layers</h2></div><span className="tag">IKI AUTO-RIG</span></div>
            <label className="upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setModelFiles(Array.from(event.dataTransfer.files || [])); setError(""); }}><input type="file" accept=".psd,image/png" multiple onChange={(event) => { setModelFiles(Array.from(event.target.files || [])); setError(""); }} /><div className="upload-icon"><Upload size={23} /></div><b>Choose layered PSD or PNG files</b><span>Drop files here or browse. PSD must contain named pixel layers.</span><small>PNG / PSD · Max 64 layers · 20 MB per PNG</small></label>
            <div className="file-list">{modelFiles.length ? modelFiles.map((file) => <div className="file-row" key={file.name}><FileImage size={16} /><span>{file.name}</span><small>{(file.size / 1024 / 1024).toFixed(1)} MB</small></div>) : <div className="muted-line">No source layers selected.</div>}</div>
            <button className="secondary-button wide" onClick={async () => {
              setBusy(true); setError(""); setNotice("Membuat layer demo untuk menguji pipeline Iki...");
              try { setModelFiles(await createDemoLayers()); setNotice("15 layer demo siap. Tekan Auto-rig with Iki untuk menguji model."); }
              catch (err) { setError(messageOf(err)); setNotice(""); }
              finally { setBusy(false); }
            }} disabled={busy}>Load sample character layers</button>
            <div className="required-roles"><b>Required Iki roles</b><div><code>face</code><code>eye_L</code><code>eye_R</code><code>mouth</code></div><small>Optional: hair_front, hair_back, iris_L/R, brow_L/R, nose, body, arm_L/R.</small></div>
            <button className="primary-button wide" onClick={runRigging} disabled={busy || !modelFiles.length}><Activity size={17} />{busy ? "Building rig..." : "Auto-rig with Iki"}</button>
            <div className="fine-print"><ShieldCheck size={14} />Layer diproses di browser dan tidak diunggah ke Max Router.</div>
          </div>
          <div className="panel rig-preview-panel">
            <div className="panel-head"><div><span className="eyebrow">02 / LIVE PREVIEW</span><h2>Rigged character</h2></div><span className="tag">{riggedModel ? "MODEL READY" : "NO MODEL"}</span></div>
            <div className="rig-stage">{riggedModel ? <canvas ref={canvasRef} /> : <div className="empty-state"><div className="empty-icon"><Clapperboard size={28} /></div><b>Rig preview</b><span>Import role-named layers and run auto-rigging to preview the character.</span></div>}</div>
            {riggedModel && <div className="rig-controls">
              <div className="control-head"><b>Expressions</b><span>{riggedModel.expressions?.length || 0} available</span></div>
              <div className="expression-list">{(riggedModel.expressions || []).map((item) => <button key={item.id} onClick={() => motionRef.current?.playExpression(item.id)}>{item.id}</button>)}</div>
              <div className="control-head"><b>Parameters</b><span>{riggedModel.parameters.length} controls</span></div>
              <div className="parameter-list">{riggedModel.parameters.slice(0, 12).map((parameter) => <label key={parameter.id}><span>{parameter.name || parameter.id}</span><input type="range" min={parameter.min} max={parameter.max} step="0.01" value={parameterValues[parameter.id] ?? parameter.default} onChange={(event) => setParameter(parameter.id, event.target.value)} /></label>)}</div>
            </div>}
            {riggedModel && <div className="export-row"><input value={modelName} onChange={(event) => setModelName(event.target.value)} aria-label="Model name" /><button className="secondary-button" onClick={exportModel}><Download size={15} />Export .iki</button><button className="primary-button" onClick={saveModel} disabled={libraryBusy}><Save size={15} />Save</button></div>}
          </div>
        </section>}

        {tab === "library" && <section className="library-layout">
          <div className="panel auth-panel">
            <div className="panel-head"><div><span className="eyebrow">SUPABASE AUTH</span><h2>Your model workspace</h2></div><Database size={19} /></div>
            {!supabase ? <div className="empty-state"><b>Database belum dikonfigurasi</b><span>VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum tersedia.</span></div> : session ? <><p>Signed in as {session.user.email}</p><button className="secondary-button" onClick={() => supabase.auth.signOut()}><LogOut size={15} />Sign out</button></> : <form onSubmit={sendMagicLink}><p>Masuk menggunakan magic link email untuk menyimpan dan membuka model dari database.</p><label className="field-label">EMAIL ADDRESS</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /><button className="primary-button wide" disabled={libraryBusy}><UserRound size={16} />Send sign-in link</button>{authMessage && <small className="muted-line">{authMessage}</small>}</form>}
          </div>
          <div className="panel library-panel">
            <div className="panel-head"><div><span className="eyebrow">PERSISTENT STORAGE</span><h2>Saved models</h2></div><button className="icon-button" onClick={loadLibrary} disabled={!session || libraryBusy}><RefreshCw size={16} /></button></div>
            {!session ? <div className="empty-state"><FolderOpen size={25} /><b>Sign in to view your library</b><span>Model disimpan per akun dengan Row Level Security.</span></div> : library.length ? <div className="saved-list">{library.map((item) => <button className="saved-model" key={item.id} onClick={() => openSavedModel(item)}><div className="saved-icon"><Layers size={18} /></div><span><b>{item.name}</b><small>{new Date(item.created_at).toLocaleString("id-ID")}</small></span><ArrowRight size={16} /></button>)}</div> : <div className="empty-state"><FolderOpen size={25} /><b>No saved models yet</b><span>Rig a character, then press Save to add it to your library.</span></div>}
          </div>
        </section>}

        {tab === "settings" && <section className="settings-layout">
          <div className="panel settings-panel">
            <div className="panel-head"><div><span className="eyebrow">AI PROVIDER GATEWAY</span><h2>Max Router connection</h2></div><Cloud size={19} /></div>
            <p>Gunakan API key dari menu API Keys di Max Router. Key disimpan hanya di sesi browser saat ini, tidak di GitHub atau database.</p>
            <label className="field-label">MAX ROUTER API KEY</label>
            <div className="secret-field"><KeyRound size={16} /><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste Max Router API key" autoComplete="off" /><button onClick={() => setApiKey("")} title="Clear key"><X size={15} /></button></div>
            <div className="settings-actions"><button className="primary-button" onClick={loadModels} disabled={busy}><RefreshCw size={15} />Test connection</button><a className="secondary-button" href="https://max-router.vercel.app/dashboard" target="_blank" rel="noreferrer">Open Max Router <ArrowRight size={15} /></a></div>
            <div className="notice-block"><ShieldCheck size={17} /><span>Provider API key tetap dikelola di Max Router. Aplikasi ini hanya memakai gateway key Max Router.</span></div>
          </div>
          <div className="panel settings-panel">
            <div className="panel-head"><div><span className="eyebrow">DATABASE</span><h2>Supabase storage</h2></div><Database size={19} /></div>
            <p>Model library menggunakan Supabase Auth dan tabel vtuber_models. Row Level Security membatasi setiap akun pada model miliknya.</p>
            <div className="setting-line"><span>Supabase URL</span><b>{supabaseUrl ? "Configured" : "Missing"}</b></div>
            <div className="setting-line"><span>Public key</span><b>{supabaseAnon ? "Configured" : "Missing"}</b></div>
            <div className="setting-line"><span>Authentication</span><b>{session ? "Signed in" : "Signed out"}</b></div>
          </div>
        </section>}

        <footer className="footer"><span>KURO MODEL LAB</span><span>IKI OPEN FORMAT · MIT · WEBGL2 RUNTIME</span><a href="https://github.com/zeikar/iki" target="_blank" rel="noreferrer">Iki source <ArrowRight size={12} /></a></footer>
      </main>
    </div>
  );
}