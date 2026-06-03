// src/pages/editor.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '../lib/firebase';
import { isAdmin } from '../lib/pu';
import { ref, set, get } from 'firebase/database';
import { db } from '../lib/firebase';

const LANE_COUNT = 9;
const LANE_KEYS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];
const SLIDE_LABELS = [null, 'ZX', 'XC', 'CV', 'VB', 'BN', 'NM', 'M,', null];
const SLIDE_MAP = { 1: ['Z','X'], 2: ['X','C'], 3: ['C','V'], 4: ['V','B'], 5: ['B','N'], 6: ['N','M'], 7: ['M',','] };

const LANE_WIDTH = 64;
const CANVAS_WIDTH = LANE_COUNT * LANE_WIDTH;
const PIXELS_PER_BEAT = 160;
const SUBDIVISIONS = 8;
const JUDGE_LINE_BOTTOM_MARGIN = 400;
const TOTAL_BEATS = 96;
const NOTE_WIDTH_SCALE = 0.8;

const EMPTY_CHART = {
  meta: { title: '新谱面', artist: '', bpm: 120, laneCount: 9, offset: 0, songId: '', difficulty: 'BS', constant: 1.0 },
  notes: [],
};

const genId = () => 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
const getBeatDur = (bpm) => 60 / bpm;

const beatPosToTime = (bar, beat, sub, bpm) => {
  const totalBeats = (bar - 1) * 4 + (beat - 1) + sub / SUBDIVISIONS;
  return totalBeats * getBeatDur(bpm);
};

const timeToBeatPos = (time, bpm) => {
  const beatDur = getBeatDur(bpm);
  const totalBeats = Math.max(0, time / beatDur);
  const bar = Math.floor(totalBeats / 4) + 1;
  const beat = Math.floor(totalBeats % 4) + 1;
  const sub = Math.min(Math.round((totalBeats - Math.floor(totalBeats)) * SUBDIVISIONS), SUBDIVISIONS - 1);
  return { bar, beat, sub };
};

export default function Editor() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const hitInputRef = useRef(null);
  const audioRef = useRef(null);

  const [chart, setChart] = useState(EMPTY_CHART);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [toolWidth, setToolWidth] = useState(1);
  const [toolSlide, setToolSlide] = useState(false);
  const [toolEx, setToolEx] = useState(false);
  const [toolHold, setToolHold] = useState(false);
  const [toolHoldBeats, setToolHoldBeats] = useState(4);

  const [history, setHistory] = useState([EMPTY_CHART]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');
  const [chartList, setChartList] = useState([]);
  const [showLoadPanel, setShowLoadPanel] = useState(false);
  const [chartIdInput, setChartIdInput] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [hitSoundUrl, setHitSoundUrl] = useState(null);

  const pushHistory = useCallback((nc) => {
    setHistory(prev => {
      const t = prev.slice(0, historyIdx + 1);
      const n = [...t, JSON.parse(JSON.stringify(nc))];
      if (n.length > 100) n.shift();
      return n;
    });
    setHistoryIdx(prev => Math.min(prev + 1, 99));
  }, [historyIdx]);

  const undo = () => { if (historyIdx > 0) { const i = historyIdx - 1; setHistoryIdx(i); setChart(JSON.parse(JSON.stringify(history[i]))); setSelectedNoteId(null); } };
  const redo = () => { if (historyIdx < history.length - 1) { const i = historyIdx + 1; setHistoryIdx(i); setChart(JSON.parse(JSON.stringify(history[i]))); setSelectedNoteId(null); } };
  const updateChart = useCallback((nc) => { setChart(nc); pushHistory(nc); }, [pushHistory]);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playStartRef = useRef(0);
  const playTimeRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let c = false;
    (async () => {
      const u = auth.currentUser;
      if (!u) { if (!c) { setHasAccess(false); setLoading(false); } return; }
      try { const a = await isAdmin(u.uid); if (!c) setHasAccess(a); } catch { if (!c) setHasAccess(false); }
      if (!c) setLoading(false);
    })();
    return () => { c = true; };
  }, []);

  useEffect(() => {
    if (!isPlaying) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    if (audioRef.current?.paused) { audioRef.current.currentTime = currentTime; audioRef.current.play().catch(() => {}); }
    playStartRef.current = performance.now();
    playTimeRef.current = currentTime;
    const loop = () => {
      setCurrentTime(playTimeRef.current + (performance.now() - playStartRef.current) / 1000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!isPlaying) {
      const a = audioRef.current;
      if (a && !a.src) a.src = `/audio/${chart.meta.songId || 'song'}.mp3`;
      playTimeRef.current = currentTime;
      playStartRef.current = performance.now();
      if (a) { a.currentTime = currentTime; a.play().catch(() => {}); }
    } else { audioRef.current?.pause(); }
    setIsPlaying(p => !p);
  };
  const stopPlay = () => { setIsPlaying(false); setCurrentTime(0); if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } };

  const addNoteAtBeat = useCallback((bar, beat, sub, lane) => {
    const note = { id: genId(), bar, beat, sub, lane, width: toolWidth, slide: toolSlide, ex: toolEx };
    if (toolHold) {
      const bpm = chart.meta.bpm;
      const stb = (bar - 1) * 4 + (beat - 1) + sub / SUBDIVISIONS;
      const etb = stb + toolHoldBeats / SUBDIVISIONS;
      note.hold = true;
      note.holdEndBar = Math.floor(etb / 4) + 1;
      note.holdEndBeat = Math.floor(etb % 4) + 1;
      note.holdEndSub = Math.min(Math.round((etb - Math.floor(etb)) * SUBDIVISIONS), SUBDIVISIONS - 1);
    }
    const nn = [...chart.notes, note].sort((a, b) => {
      const ta = beatPosToTime(a.bar, a.beat, a.sub, chart.meta.bpm);
      const tb = beatPosToTime(b.bar, b.beat, b.sub, chart.meta.bpm);
      return ta - tb;
    });
    updateChart({ ...chart, notes: nn });
  }, [chart, toolWidth, toolSlide, toolEx, toolHold, toolHoldBeats, updateChart]);

  const deleteNote = useCallback((id) => {
    updateChart({ ...chart, notes: chart.notes.filter(n => n.id !== id) });
    if (selectedNoteId === id) setSelectedNoteId(null);
  }, [chart, selectedNoteId, updateChart]);

  const updateNoteField = useCallback((id, field, value) => {
    updateChart({ ...chart, notes: chart.notes.map(n => n.id === id ? { ...n, [field]: value } : n) });
  }, [chart, updateChart]);

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveToFirebase(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Z') { e.preventDefault(); redo(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNoteId && document.activeElement?.tagName !== 'INPUT') deleteNote(selectedNoteId);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectedNoteId, undo, redo, deleteNote]);

  const totalHeight = TOTAL_BEATS * PIXELS_PER_BEAT + JUDGE_LINE_BOTTOM_MARGIN;

  const beatToY = useCallback((bar, beat, sub) => {
    const t = beatPosToTime(bar, beat, sub, chart.meta.bpm);
    const pps = PIXELS_PER_BEAT / getBeatDur(chart.meta.bpm);
    return (totalHeight - JUDGE_LINE_BOTTOM_MARGIN) - t * pps;
  }, [chart.meta.bpm, totalHeight]);

  const yToBeat = useCallback((y) => {
    const pps = PIXELS_PER_BEAT / getBeatDur(chart.meta.bpm);
    const t = ((totalHeight - JUDGE_LINE_BOTTOM_MARGIN) - y) / pps;
    return timeToBeatPos(Math.max(0, t), chart.meta.bpm);
  }, [chart.meta.bpm, totalHeight]);

  const getJudgeY = useCallback(() => {
    const pps = PIXELS_PER_BEAT / getBeatDur(chart.meta.bpm);
    return (totalHeight - JUDGE_LINE_BOTTOM_MARGIN) - currentTime * pps;
  }, [chart.meta.bpm, totalHeight, currentTime]);

  const saveToFirebase = async () => {
    try {
      setSaveStatus('保存中...');
      const cid = `${chart.meta.songId || 'unknown'}_${chart.meta.difficulty || 'BS'}`;
      setChartIdInput(cid);
      await set(ref(db, `charts/${cid}`), { ...chart, updatedAt: Date.now() });
      setSaveStatus(`已保存 charts/${cid}`);
    } catch (err) { setSaveStatus('保存失败: ' + err.message); }
  };

  const loadFromFirebase = async (cid) => {
    try {
      const snap = await get(ref(db, `charts/${cid}`));
      if (!snap.exists()) { setSaveStatus('谱面不存在'); return; }
      const data = snap.val(); setChart(data); setChartIdInput(cid);
      setHistory([data]); setHistoryIdx(0); setSelectedNoteId(null);
      setSaveStatus(`已加载 ${cid}`); setShowLoadPanel(false);
    } catch (err) { setSaveStatus('加载失败'); }
  };

  const loadChartList = async () => {
    try {
      const snap = await get(ref(db, 'charts'));
      if (!snap.exists()) { setChartList([]); return; }
      setChartList(Object.entries(snap.val()).map(([id, val]) => ({
        id, title: val.meta?.title || '', artist: val.meta?.artist || '',
        noteCount: val.notes?.length || 0, diff: val.meta?.difficulty || '', updatedAt: val.updatedAt || 0,
      })).sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (e) {}
  };

  const handleFileUpload = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (!d.meta || !d.notes) { setSaveStatus('无效谱面'); return; }
        setChart(d); setHistory([d]); setHistoryIdx(0); setSelectedNoteId(null);
        setSaveStatus('已加载: ' + f.name);
      } catch { setSaveStatus('JSON解析失败'); }
    };
    r.readAsText(f); e.target.value = '';
  };

  const exportToFile = () => {
    const b = new Blob([JSON.stringify(chart, null, 2)], { type: 'application/json' });
    const u = URL.createObjectURL(b); const a = document.createElement('a');
    a.href = u; a.download = `${chart.meta.songId || 'chart'}_${chart.meta.difficulty || 'BS'}.json`;
    a.click(); URL.revokeObjectURL(u);
  };

  const handleAudioUpload = (e) => { const f = e.target.files[0]; if (f) { setAudioUrl(URL.createObjectURL(f)); e.target.value = ''; } };
  const handleHitSoundUpload = (e) => { const f = e.target.files[0]; if (f) { setHitSoundUrl(URL.createObjectURL(f)); e.target.value = ''; } };

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bpm = chart.meta.bpm;
    const w = CANVAS_WIDTH, h = totalHeight;
    canvas.width = w; canvas.height = h;

    ctx.fillStyle = '#0a0a16'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < LANE_COUNT; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#0d0d1f' : '#0a0a18';
      ctx.fillRect(i * LANE_WIDTH, 0, LANE_WIDTH, h);
    }
    for (let i = 1; i <= 7; i++) {
      ctx.fillStyle = 'rgba(100, 50, 180, 0.06)';
      ctx.fillRect(i * LANE_WIDTH, 0, LANE_WIDTH, h);
    }

    const jy = getJudgeY();
    const totalBars = Math.ceil(TOTAL_BEATS / 4);

    for (let bar = 1; bar <= totalBars; bar++) {
      for (let beat = 1; beat <= 4; beat++) {
        for (let sub = 0; sub < SUBDIVISIONS; sub++) {
          const y = beatToY(bar, beat, sub);
          if (y < -50 || y > h + 50) continue;
          const isBL = (beat === 1 && sub === 0);
          const isB = (sub === 0);
          const isH = (sub % 4 === 0);
          const isQ = (sub % 2 === 0);
          let lc, lw;
          if (isBL) { lc = '#6a6a80'; lw = 2.5; }
          else if (isB) { lc = '#4a4a62'; lw = 2; }
          else if (isH) { lc = '#303048'; lw = 1; }
          else if (isQ) { lc = '#222238'; lw = 0.5; }
          else { lc = '#181828'; lw = 0.3; }
          ctx.strokeStyle = lc; ctx.lineWidth = lw;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
          if (isBL) { ctx.fillStyle = '#8888aa'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'right'; ctx.fillText('[' + bar + ']', w - 8, y - 5); }
          if (isB && !isBL) { ctx.fillStyle = '#5a5a78'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'right'; ctx.fillText(bar + '.' + beat, w - 8, y - 3); }
        }
      }
    }

    ctx.strokeStyle = '#1e1e30'; ctx.lineWidth = 1;
    for (let i = 1; i < LANE_COUNT; i++) {
      ctx.beginPath(); ctx.moveTo(i * LANE_WIDTH, 0); ctx.lineTo(i * LANE_WIDTH, h); ctx.stroke();
    }

    ctx.strokeStyle = '#ff4466'; ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff4466'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(0, jy); ctx.lineTo(w, jy); ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#666'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    for (let i = 0; i < LANE_COUNT; i++) ctx.fillText(LANE_KEYS[i], i * LANE_WIDTH + LANE_WIDTH / 2, jy + 18);
    ctx.fillStyle = '#3a3050'; ctx.font = '9px monospace';
    for (let i = 1; i <= 7; i++) if (SLIDE_LABELS[i]) ctx.fillText(SLIDE_LABELS[i], i * LANE_WIDTH + LANE_WIDTH / 2, jy + 32);

    const cp = timeToBeatPos(currentTime, bpm);
    ctx.fillStyle = '#ff4466'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
    ctx.fillText('▶ ' + currentTime.toFixed(2) + 's', 8, jy + 18);
    ctx.fillText('拍: ' + cp.bar + ':' + cp.beat + '/' + cp.sub, 8, jy + 36);

    const noteH = 22;

    // 先画所有 hold 长条（修复版）
    const drawnHolds = new Set();

    for (const note of chart.notes) {
      if (!note.hold || drawnHolds.has(note.id)) continue;
      drawnHolds.add(note.id);

      const y1 = beatToY(note.bar, note.beat, note.sub);           // Hold 头
      const y2 = beatToY(note.holdEndBar, note.holdEndBeat, note.holdEndSub); // Hold 尾

      const topY = Math.min(y1, y2);      // 实际绘制起点（较小的y）
      const barH = Math.abs(y2 - y1);     // 真实高度
      if (barH <= 0) continue;

      let fc = '#2a6099';
      if (note.ex && note.slide) fc = '#cc8800';
      else if (note.ex) fc = '#cc9900';
      else if (note.slide) fc = '#553388';

      const noteW = note.width * LANE_WIDTH * NOTE_WIDTH_SCALE;
      const totalLaneW = note.width * LANE_WIDTH;
      const offsetX = (totalLaneW - noteW) / 2;
      const x = note.lane * LANE_WIDTH + offsetX;

      const px = x + 2;
      const py = topY + noteH / 2;        // 从较上面的位置开始绘制

      const rr = parseInt(fc.slice(1, 3), 16);
      const gg = parseInt(fc.slice(3, 5), 16);
      const bb = parseInt(fc.slice(5, 7), 16);

      const r = 8;   // 圆角半径

      ctx.fillStyle = `rgba(${rr},${gg},${bb},0.35)`;
      ctx.strokeStyle = `rgba(${rr},${gg},${bb},0.8)`;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.roundRect(px, py, noteW - 4, barH, r);
      ctx.fill();
      ctx.stroke();
      
    }

    // 再画音符头部
    const drawnHeads = new Set();
    for (const note of chart.notes) {
      const y = beatToY(note.bar, note.beat, note.sub);
      if (y < -50 || y > h + 50) continue;
      const noteW = note.width * LANE_WIDTH * NOTE_WIDTH_SCALE;
      const totalLaneW = note.width * LANE_WIDTH;
      const offsetX = (totalLaneW - noteW) / 2;
      const x = note.lane * LANE_WIDTH + offsetX;
      const sel = note.id === selectedNoteId;
      const px = x, py = y - noteH / 2;

      let fc, sc, gc;
      if (note.ex && note.slide) { fc = '#cc8800'; sc = '#ffaa22'; gc = '#ffbb33'; }
      else if (note.ex) { fc = '#cc9900'; sc = '#eebb22'; gc = '#eebb22'; }
      else if (note.slide) { fc = '#553388'; sc = '#8855cc'; gc = '#9966dd'; }
      else { fc = '#2a6099'; sc = '#4499cc'; gc = '#5599dd'; }

      ctx.shadowColor = sel ? '#fff' : gc; ctx.shadowBlur = sel ? 14 : 6;
      ctx.fillStyle = fc; ctx.strokeStyle = sc; ctx.lineWidth = 1.5;
      const r = 3;
      ctx.beginPath();
      ctx.moveTo(px + r, py); ctx.lineTo(px + noteW - r, py);
      ctx.arcTo(px + noteW, py, px + noteW, py + r, r);
      ctx.lineTo(px + noteW, py + noteH - r);
      ctx.arcTo(px + noteW, py + noteH, px + noteW - r, py + noteH, r);
      ctx.lineTo(px + r, py + noteH);
      ctx.arcTo(px, py + noteH, px, py + noteH - r, r);
      ctx.lineTo(px, py + r); ctx.arcTo(px, py, px + r, py, r);
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

      if (note.slide) {
        const cx = px + noteW / 2, vTop = py - 10, vSize = 6;
        const vc = (note.ex && note.slide) ? '#ffdd66' : '#c8a0ff';
        ctx.shadowColor = vc; ctx.shadowBlur = 4;
        ctx.strokeStyle = vc; ctx.fillStyle = vc; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - vSize, vTop); ctx.lineTo(cx, vTop + vSize); ctx.lineTo(cx + vSize, vTop); ctx.stroke();
        ctx.shadowBlur = 0;
      }

      if (note.width >= 5) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('×' + note.width, px + noteW / 2, py + noteH / 2 + 4);
      }

      if (sel) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        ctx.strokeRect(px - 2, py - 4, noteW + 4, noteH + 8); ctx.setLineDash([]);
      }
    }
  }, [chart, selectedNoteId, currentTime, totalHeight, beatToY, getJudgeY]);

  useEffect(() => { if (!loading && hasAccess) requestAnimationFrame(draw); }, [loading, hasAccess, draw]);
  useEffect(() => {
    if (!loading && hasAccess && scrollRef.current) {
      requestAnimationFrame(() => {
        const c = scrollRef.current; if (!c) return;
        c.scrollTop = getJudgeY() - c.clientHeight + JUDGE_LINE_BOTTOM_MARGIN;
      });
    }
  }, [loading, hasAccess, totalHeight, getJudgeY]);
  useEffect(() => {
    if (!isPlaying || !scrollRef.current) return;
    scrollRef.current.scrollTop = getJudgeY() - scrollRef.current.clientHeight + JUDGE_LINE_BOTTOM_MARGIN;
  }, [currentTime, isPlaying, getJudgeY]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width), y: (e.clientY - rect.top) * (totalHeight / rect.height) };
  };

  const handleClick = (e) => {
    const { x, y } = getPos(e);
    const lane = Math.floor(x / LANE_WIDTH);
    if (lane < 0 || lane >= LANE_COUNT) return;
    const clicked = findNoteAt(x, y);
    if (clicked) { setSelectedNoteId(clicked.id); return; }
    const { bar, beat, sub } = yToBeat(y);
    addNoteAtBeat(bar, beat, sub, lane);
  };

  const handleRightClick = (e) => { e.preventDefault(); const { x, y } = getPos(e); const c = findNoteAt(x, y); if (c) deleteNote(c.id); };

  const findNoteAt = (cx, cy) => {
    for (let i = chart.notes.length - 1; i >= 0; i--) {
      const n = chart.notes[i];
      const ny = beatToY(n.bar, n.beat, n.sub);
      const nw = n.width * LANE_WIDTH * NOTE_WIDTH_SCALE;
      const ox = (n.width * LANE_WIDTH - nw) / 2;
      const nx = n.lane * LANE_WIDTH + ox;
      if (cx >= nx && cx <= nx + nw && cy >= ny - 11 && cy <= ny + 11) return n;
      // 也检查 hold 长条区域
      if (n.hold) {
        const ey = beatToY(n.holdEndBar, n.holdEndBeat, n.holdEndSub);
        if (cx >= nx && cx <= nx + nw && cy >= ny && cy <= ey) return n;
      }
    }
    return null;
  };

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: '#888' }}>检查权限中...</div>;
  if (!hasAccess) return <div style={{ padding: 100, textAlign: 'center' }}><h1>无访问权限</h1></div>;

  const selectedNote = chart.notes.find(n => n.id === selectedNoteId);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: '#080812', color: '#ccc' }}>
      <div style={{ width: 280, flexShrink: 0, background: '#0e0e1c', borderRight: '1px solid #1e1e30', padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, color: '#ff6688' }}>🎵 谱面编辑器</h3>

        <div style={{ background: '#12122a', borderRadius: 8, padding: 12 }}>
          <Lbl>🎧 音频 (public/audio/song.mp3)</Lbl>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Btn onClick={() => audioInputRef.current?.click()}>🎵 加载音乐</Btn>
            <Btn onClick={() => hitInputRef.current?.click()}>🔊 打击音效</Btn>
          </div>
          <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioUpload} style={{ display: 'none' }} />
          <input ref={hitInputRef} type="file" accept="audio/*" onChange={handleHitSoundUpload} style={{ display: 'none' }} />
          <audio ref={audioRef} src={audioUrl || `/audio/${chart.meta.songId || 'song'}.mp3`} preload="auto" style={{ display: 'none' }} />
        </div>

        <div style={{ background: '#12122a', borderRadius: 8, padding: 12 }}>
          <Lbl>📁 文件 (Ctrl+S 保存)</Lbl>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Btn onClick={exportToFile}>📥 导出JSON</Btn>
            <Btn onClick={() => fileInputRef.current?.click()}>📤 上传JSON</Btn>
            <Btn onClick={() => { setShowLoadPanel(p => !p); if (!showLoadPanel) loadChartList(); }}>☁️ {showLoadPanel ? '关闭' : '云端'}</Btn>
          </div>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
          <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
            <Inp value={chartIdInput} onChange={e => setChartIdInput(e.target.value)} placeholder="songId_BS" style={{ flex: 1 }} />
            <Btn onClick={saveToFirebase}>💾</Btn>
          </div>
          {showLoadPanel && (
            <div style={{ maxHeight: 180, overflowY: 'auto', marginTop: 4 }}>
              {chartList.map(c => (
                <div key={c.id} onClick={() => loadFromFirebase(c.id)} style={{ padding: '4px 6px', cursor: 'pointer', fontSize: 11, borderBottom: '1px solid #1e1e30' }}>
                  <span style={{ color: '#ccc' }}>{c.title}</span> <span style={{ color: '#888' }}>{c.diff}</span> <span style={{ color: '#666', fontSize: 10 }}>{c.id}</span>
                </div>
              ))}
            </div>
          )}
          {saveStatus && <div style={{ fontSize: 10, color: saveStatus.includes('失败') ? '#f44' : '#4a4', marginTop: 4 }}>{saveStatus}</div>}
        </div>

        <div>
          <Lbl>标题</Lbl>
          <Inp value={chart.meta.title} onChange={e => { const nc = { ...chart, meta: { ...chart.meta, title: e.target.value } }; setChart(nc); pushHistory(nc); }} />
          <Lbl>艺术家</Lbl>
          <Inp value={chart.meta.artist} onChange={e => { const nc = { ...chart, meta: { ...chart.meta, artist: e.target.value } }; setChart(nc); pushHistory(nc); }} />
          <Lbl>BPM</Lbl>
          <Inp type="number" value={chart.meta.bpm} onChange={e => { const nc = { ...chart, meta: { ...chart.meta, bpm: parseInt(e.target.value) || 120 } }; setChart(nc); pushHistory(nc); }} />
          <Lbl>Song ID</Lbl>
          <Inp value={chart.meta.songId || ''} onChange={e => { const nc = { ...chart, meta: { ...chart.meta, songId: e.target.value } }; setChart(nc); pushHistory(nc); }} />
          <Lbl>难度</Lbl>
          <select value={chart.meta.difficulty || 'BS'} onChange={e => { const nc = { ...chart, meta: { ...chart.meta, difficulty: e.target.value } }; setChart(nc); pushHistory(nc); }} style={{ width: '100%', padding: '5px 8px', background: '#080812', border: '1px solid #1e1e30', borderRadius: 4, color: '#ccc', fontSize: 13 }}>
            <option value="BS">BS</option><option value="NM">NM</option><option value="HD">HD</option><option value="CZ">CZ</option>
          </select>
          <Lbl>定数</Lbl>
          <Inp type="number" step="0.1" value={chart.meta.constant || 1.0} onChange={e => { const nc = { ...chart, meta: { ...chart.meta, constant: parseFloat(e.target.value) || 1.0 } }; setChart(nc); pushHistory(nc); }} />
        </div>

        <div style={{ background: '#12122a', borderRadius: 8, padding: 12 }}>
          <Lbl>音符类型</Lbl>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <label style={cs}><input type="checkbox" checked={toolSlide} onChange={e => setToolSlide(e.target.checked)} /><span style={{ color: '#9966dd' }}>Slide</span></label>
            <label style={cs}><input type="checkbox" checked={toolEx} onChange={e => setToolEx(e.target.checked)} /><span style={{ color: '#ddaa00' }}>Ex</span></label>
            <label style={cs}><input type="checkbox" checked={toolHold} onChange={e => setToolHold(e.target.checked)} /><span style={{ color: '#88ccff' }}>Hold</span></label>
          </div>
          {toolHold && (
            <div style={{ marginBottom: 8 }}>
              <Lbl>Hold持续(八分拍): {toolHoldBeats}</Lbl>
              <input type="range" min={1} max={32} value={toolHoldBeats} onChange={e => setToolHoldBeats(parseInt(e.target.value))} style={{ width: '100%' }} />
            </div>
          )}
          <Lbl>音符宽度</Lbl>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min={1} max={9} value={toolWidth} onChange={e => setToolWidth(parseInt(e.target.value))} style={{ flex: 1 }} />
            <span style={{ fontWeight: 'bold' }}>{toolWidth}</span>
          </div>
          <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{toolSlide && toolEx ? 'ExSlide 金V' : toolSlide ? 'Slide 紫V' : toolEx ? 'Ex 黄' : toolHold ? 'Hold 蓝条' : '普通 蓝'}</div>
        </div>

        <div style={{ background: '#12122a', borderRadius: 8, padding: 12 }}>
          <Lbl>播放</Lbl>
          <div style={{ display: 'flex', gap: 6 }}><Btn onClick={togglePlay}>{isPlaying ? '⏸' : '▶'}</Btn><Btn onClick={stopPlay}>⏹</Btn></div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{currentTime.toFixed(2)}s</div>
        </div>

        {selectedNote && (
          <div style={{ background: '#12122a', borderRadius: 8, padding: 12 }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#ff6688' }}>编辑音符</h4>
            <Lbl>小节</Lbl>
            <Inp type="number" min={1} value={selectedNote.bar} onChange={e => updateNoteField(selectedNote.id, 'bar', Math.max(1, parseInt(e.target.value) || 1))} />
            <Lbl>拍 (1-4)</Lbl>
            <Inp type="number" min={1} max={4} value={selectedNote.beat} onChange={e => updateNoteField(selectedNote.id, 'beat', Math.min(4, Math.max(1, parseInt(e.target.value) || 1)))} />
            <Lbl>子拍 (0-7)</Lbl>
            <Inp type="number" min={0} max={7} value={selectedNote.sub} onChange={e => updateNoteField(selectedNote.id, 'sub', Math.min(7, Math.max(0, parseInt(e.target.value) || 0)))} />
            <Lbl>轨道 (0-8)</Lbl>
            <Inp type="number" min={0} max={8} value={selectedNote.lane} onChange={e => updateNoteField(selectedNote.id, 'lane', Math.min(8, Math.max(0, parseInt(e.target.value) || 0)))} />
            <Lbl>宽度 (1-9)</Lbl>
            <Inp type="number" min={1} max={9} value={selectedNote.width || 1} onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 9) updateNoteField(selectedNote.id, 'width', v); }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <label style={cs}><input type="checkbox" checked={!!selectedNote.slide} onChange={e => updateNoteField(selectedNote.id, 'slide', e.target.checked)} /><span style={{ color: '#9966dd' }}>Slide</span></label>
              <label style={cs}><input type="checkbox" checked={!!selectedNote.ex} onChange={e => updateNoteField(selectedNote.id, 'ex', e.target.checked)} /><span style={{ color: '#ddaa00' }}>Ex</span></label>
              <label style={cs}><input type="checkbox" checked={!!selectedNote.hold} onChange={e => {
                const v = e.target.checked;
                updateNoteField(selectedNote.id, 'hold', v);
                if (v && !selectedNote.holdEndBar) {
                  updateNoteField(selectedNote.id, 'holdEndBar', selectedNote.bar);
                  updateNoteField(selectedNote.id, 'holdEndBeat', selectedNote.beat);
                  updateNoteField(selectedNote.id, 'holdEndSub', Math.min(selectedNote.sub + 4, 7));
                }
              }} /><span style={{ color: '#88ccff' }}>Hold</span></label>
            </div>
            {selectedNote.hold && (
              <>
                <Lbl>Hold结束 小节</Lbl>
                <Inp type="number" min={1} value={selectedNote.holdEndBar || selectedNote.bar} onChange={e => updateNoteField(selectedNote.id, 'holdEndBar', Math.max(1, parseInt(e.target.value) || 1))} />
                <Lbl>Hold结束 拍</Lbl>
                <Inp type="number" min={1} max={4} value={selectedNote.holdEndBeat || selectedNote.beat} onChange={e => updateNoteField(selectedNote.id, 'holdEndBeat', Math.min(4, Math.max(1, parseInt(e.target.value) || 1)))} />
                <Lbl>Hold结束 子拍</Lbl>
                <Inp type="number" min={0} max={7} value={selectedNote.holdEndSub || 0} onChange={e => updateNoteField(selectedNote.id, 'holdEndSub', Math.min(7, Math.max(0, parseInt(e.target.value) || 0)))} />
              </>
            )}
            <Btn onClick={() => deleteNote(selectedNote.id)} style={{ marginTop: 8, background: '#cc3344', borderColor: '#cc3344' }}>🗑 删除</Btn>
          </div>
        )}

        <div style={{ fontSize: 11, color: '#666' }}>
          <div>总音符: {chart.notes.length}</div>
          <div>Slide: {chart.notes.filter(n => n.slide).length} | Ex: {chart.notes.filter(n => n.ex).length} | Hold: {chart.notes.filter(n => n.hold).length}</div>
          <div>Ctrl+Z/Y 撤销重做 | Ctrl+S 保存</div>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', background: '#060610' }}>
        <canvas ref={canvasRef} onClick={handleClick} onContextMenu={handleRightClick} style={{ display: 'block', cursor: 'crosshair', width: CANVAS_WIDTH }} />
      </div>
    </div>
  );
}

const Lbl = ({ children }) => <div style={{ fontSize: 11, color: '#777', marginTop: 4, marginBottom: 1 }}>{children}</div>;
const Inp = (props) => <input {...props} style={{ width: '100%', padding: '4px 8px', background: '#080812', border: '1px solid #1e1e30', borderRadius: 4, color: '#ccc', fontSize: 13, boxSizing: 'border-box', ...props.style }} />;
const Btn = ({ children, style, ...props }) => <button {...props} style={{ padding: '5px 10px', background: '#1a1a30', color: '#ccc', border: '1px solid #2a2a3e', borderRadius: 4, cursor: 'pointer', fontSize: 12, ...style }}>{children}</button>;
const cs = { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' };