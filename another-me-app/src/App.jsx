import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './components/Scene'

export default function App() {
  const [playing, setPlaying] = useState(null)
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    document.body.style.background = '#000'
    document.body.style.margin = '0'
    document.body.style.overflow = 'hidden'
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      <Canvas
        camera={{ fov: 55, position: [0, 0, -45], near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1]}
      >
        <color attach="background" args={['#000']} />
        <Scene
          onHover={(item) => setHovered(item)}
          onLeave={() => setHovered(null)}
          onPlay={(item) => setPlaying(item)}
          playingItem={playing}
        />
      </Canvas>

      {/* 顶部居中标题 */}
      <div style={{
        position: 'fixed', top: '12%', left: 0, right: 0, zIndex: 5,
        textAlign: 'center', pointerEvents: 'none',
      }}>
        <div style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: '1.3rem', letterSpacing: '0.5em', color: '#E6E5E5', fontWeight: 400,
          paddingLeft: '0.5em',
        }}>SYLVAN</div>
        <div style={{
          fontFamily: "'Georgia', serif", fontSize: '0.65rem',
          letterSpacing: '0.4em', color: '#666', marginTop: '0.4rem', paddingLeft: '0.4em',
        }}>ANOTHER ME</div>
      </div>

      {/* 中心加号 */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 5, pointerEvents: 'none', textAlign: 'center',
      }}>
        <div style={{ fontSize: '1.2rem', color: '#555' }}>+</div>
      </div>

      {/* 底部导航 */}
      <div style={{
        position: 'fixed', bottom: '8%', left: 0, right: 0, zIndex: 5,
        textAlign: 'center', pointerEvents: 'none',
        fontFamily: "'Georgia', serif", fontSize: '0.7rem', letterSpacing: '0.3em', color: '#888',
      }}>
        WHAT I WATCH · READ · HEAR · PLAY
      </div>

      {/* hover 信息 */}
      {hovered && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '2rem', zIndex: 10,
          color: '#ccc', fontSize: '0.85rem', letterSpacing: '0.05em',
          fontFamily: "'Georgia', serif",
        }}>
          <div style={{ fontSize: '1rem', color: '#fff', marginBottom: '0.2rem' }}>{hovered.title}</div>
          <div style={{ color: '#888' }}>{hovered.creator || hovered.artist} · {hovered.year || ''}</div>
          {hovered.note && <div style={{ color: '#666', marginTop: '0.3rem', maxWidth: '300px' }}>{hovered.note}</div>}
          {hovered.type === 'music' && (
            <div style={{ marginTop: '0.5rem', color: '#999', fontSize: '0.75rem' }}>
              {playing?.title === hovered.title ? '▶ playing' : 'click to play'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
