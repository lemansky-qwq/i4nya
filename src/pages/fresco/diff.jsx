import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { db } from '../../lib/firebase';

export default function Diff() {
  const { songId } = useParams();
  const navigate = useNavigate();
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await get(ref(db, 'charts'));
        if (!snap.exists()) { setCharts([]); setLoading(false); return; }
        const data = snap.val();
        const list = [];
        for (const [key, val] of Object.entries(data)) {
          const sid = val.meta?.songId || key.split('_')[0];
          if (sid === songId) {
            list.push({ chartId: key, difficulty: val.meta?.difficulty || 'BS', constant: val.meta?.constant || 1.0, title: val.meta?.title || songId, artist: val.meta?.artist || '', noteCount: val.notes?.length || 0 });
          }
        }
        list.sort((a, b) => a.constant - b.constant);
        setCharts(list);
        setLoading(false);
      } catch (e) { setLoading(false); }
    })();
  }, [songId]);

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: '#888' }}>加载中...</div>;

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', background: '#080812', color: '#ccc', padding: 30 }}>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <button onClick={() => navigate('/fresco')} style={{ background: 'none', border: 'none', color: '#ff6688', cursor: 'pointer', fontSize: 14, marginBottom: 20 }}>← 返回曲库</button>
        <h2 style={{ color: '#ff6688', margin: '0 0 20px 0' }}>{charts[0]?.title || songId}</h2>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{charts[0]?.artist}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {charts.map(c => (
            <div key={c.chartId} onClick={() => navigate(`/fresco/${songId}/${c.difficulty}`)}
              style={{ background: '#0e0e1c', border: '1px solid #1e1e30', borderRadius: 10, padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: 15, fontWeight: 'bold' }}>{c.difficulty}</div><div style={{ fontSize: 11, color: '#888' }}>{c.noteCount} notes</div></div>
              <div style={{ fontSize: 16, color: '#ffaa00' }}>定数 {c.constant}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}