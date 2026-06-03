// src/pages/fresco/about.jsx
import { useNavigate } from 'react-router-dom';

const LANE_KEYS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];

export default function FrescoAbout() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', background: '#080812', color: '#ccc', padding: 30 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <button onClick={() => navigate('/fresco')} style={{ background: 'none', border: 'none', color: '#ff6688', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}>← 返回曲库</button>

        <h1 style={{ color: '#ff6688', textAlign: 'center', fontSize: 32, letterSpacing: 2, margin: '0 0 8px 0' }}>FRESCO</h1>
        <p style={{ textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 30 }}>9键下落式音乐游戏</p>

        {/* 音符类型 */}
        <Section title="🎵 音符类型">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <NoteCard color="#3377bb" label="Tap" desc="普通音符，按对应键" />
            <NoteCard color="#cc9900" label="Ex Tap" desc="高亮音符，判定更宽松" />
            <NoteCard color="#553388" label="Slide" desc="按下方对应键 (ZX/CV等)" showV />
            <NoteCard color="#cc8800" label="Ex Slide" desc="金色，判定更宽松" showV />
            <NoteCard color="#88ccff" label="Hold" desc="长按，每拍一个判定点" />
          </div>
        </Section>

        {/* 轨道布局 */}
        <Section title="⌨️ 键盘映射">
          <div style={{ background: '#0e0e1c', border: '1px solid #1e1e30', borderRadius: 10, padding: 20, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 6 }}>
              {LANE_KEYS.map(k => (
                <div key={k} style={{ width: 36, height: 36, background: '#1a1a30', border: '1px solid #2a2a3e', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14 }}>{k}</div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>主轨道按键</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 12, marginBottom: 6 }}>
              {['Z','X','C','V','B','N','M',','].map(k => (
                <div key={k} style={{ width: 36, height: 36, background: '#1a1a28', border: '1px solid #332244', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14, color: '#9966dd' }}>{k}</div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#6644aa' }}>Slide 下方键</div>
          </div>
        </Section>

        {/* 判定 */}
        <Section title="📏 判定窗口">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#888' }}>
                <th style={thStyle}>判定</th>
                <th style={thStyle}>窗口</th>
                <th style={thStyle}>分数</th>
                <th style={thStyle}>颜色</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={tdStyle}>C.Perfect</td><td style={tdStyle}>±25ms</td><td style={tdStyle}>1010000 / 物量</td><td style={{...tdStyle, color:'#ffdd44'}}>金色</td></tr>
              <tr><td style={tdStyle}>Perfect</td><td style={tdStyle}>±60ms</td><td style={tdStyle}>1000000 / 物量</td><td style={{...tdStyle, color:'#ffaa00'}}>橙色</td></tr>
              <tr><td style={tdStyle}>Great</td><td style={tdStyle}>±100ms</td><td style={tdStyle}>600000 / 物量</td><td style={{...tdStyle, color:'#44aaff'}}>蓝色</td></tr>
              <tr><td style={tdStyle}>Good</td><td style={tdStyle}>±150ms</td><td style={tdStyle}>300000 / 物量</td><td style={{...tdStyle, color:'#888'}}>灰色</td></tr>
              <tr><td style={tdStyle}>Miss</td><td style={tdStyle}>&gt;150ms</td><td style={tdStyle}>0</td><td style={{...tdStyle, color:'#ff4444'}}>红色</td></tr>
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
            * Ex音符在±150ms内均视为C.Perfect<br/>
            * Slide在0-360ms内为C.Perfect，360-400ms Great，400-450ms Good<br/>
            * 满分 = 1010000
          </div>
        </Section>

        {/* 评级 */}
        <Section title="⭐ 评级">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {[
              ['SSS+','1005000','#ffdd44'],['SSS','1000000','#ffdd44'],['SS','990000','#ffaa00'],
              ['S','970000','#ffaa00'],['AAA','950000','#ff6644'],['AA','930000','#ff6644'],
              ['A','900000','#44aaff'],['B','850000','#44cc44'],['C','800000','#888'],['D','0','#666']
            ].map(([g,s,c]) => (
              <div key={g} style={{ background: '#0e0e1c', border: `1px solid ${c}`, borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 70 }}>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: c }}>{g}</div>
                <div style={{ fontSize: 10, color: '#888' }}>{parseInt(s).toLocaleString()}+</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Rating */}
        <Section title="📊 单曲 Rating">
          <div style={{ fontSize: 13, lineHeight: 2, background: '#0e0e1c', border: '1px solid #1e1e30', borderRadius: 10, padding: 16 }}>
            <div>定数 × 100 = <span style={{ color: '#ffaa00' }}>基础 Rating</span></div>
            <div style={{ marginTop: 8 }}>
              <div>0 ~ 949,999：每 100 分 <span style={{ color: '#ff4444' }}>-1</span></div>
              <div>950,000 ~ 969,999：每 200 分 <span style={{ color: '#ff4444' }}>-1</span></div>
              <div>970,000：<span style={{ color: '#ffdd44' }}>= 基础 Rating</span></div>
              <div>970,000 ~ 999,999：每 250 分 <span style={{ color: '#44ff44' }}>+1</span></div>
              <div>1,000,000 ~ 1,004,999：每 100 分 <span style={{ color: '#44ff44' }}>+1</span></div>
              <div>1,005,000 ~ 1,010,000：每 500 分 <span style={{ color: '#44ff44' }}>+1</span></div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
              总 Rating = 个人 Best 10 单曲 Rating 之和
            </div>
          </div>
        </Section>

        {/* 难度 */}
        <Section title="🎚️ 难度">
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {[
              ['BS','BASIC','#44cc44'],['NM','NORMAL','#44aaff'],
              ['HD','HARD','#ffaa00'],['CZ','CRAZY','#ff4444']
            ].map(([abbr,full,color]) => (
              <div key={abbr} style={{ background: '#0e0e1c', border: `1px solid ${color}`, borderRadius: 8, padding: '12px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 'bold', color }}>{abbr}</div>
                <div style={{ fontSize: 10, color: '#888' }}>{full}</div>
              </div>
            ))}
          </div>
        </Section>

        <div style={{ textAlign: 'center', marginTop: 30, fontSize: 12, color: '#444' }}>
          FRESCO — 湿壁画 by Lemansky 2026.6
        </div>
      </div>
    </div>
  );
}

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 28 }}>
    <h3 style={{ color: '#ff6688', fontSize: 16, marginBottom: 12 }}>{title}</h3>
    {children}
  </div>
);

const NoteCard = ({ color, label, desc, showV }) => (
  <div style={{ background: '#0e0e1c', border: `1px solid ${color}44`, borderRadius: 10, padding: '14px 16px', textAlign: 'center', minWidth: 100 }}>
    <div style={{ width: 48, height: 22, background: color, borderRadius: 4, margin: '0 auto 6px', position: 'relative' }}>
      {showV && (
        <svg style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)' }} width="12" height="10">
          <polyline points="0,10 6,0 12,10" stroke={color} strokeWidth="2" fill="none" />
        </svg>
      )}
    </div>
    <div style={{ fontWeight: 'bold', fontSize: 13, color }}>{label}</div>
    <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>{desc}</div>
  </div>
);

const thStyle = { padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #1e1e30' };
const tdStyle = { padding: '8px 12px', borderBottom: '1px solid #1a1a28' };