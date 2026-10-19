import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { films, books, music, games } from '../data'

const allItems = [
  ...films.map((item, i) => ({ ...item, type: 'film', index: i })),
  ...books.map((item, i) => ({ ...item, type: 'book', index: i })),
  ...music.map((item, i) => ({ ...item, type: 'music', index: i })),
  ...games.map((item, i) => ({ ...item, type: 'game', index: i })),
]

const repeatedItems = allItems

// 每张卡片随机位置：铺满视口，z 分层
const positions = repeatedItems.map((_, i) => {
  const z = -6 - Math.random() * 20
  const spread = 5 + Math.abs(z) * 0.6
  return {
    x: (Math.random() - 0.5) * spread * 2.4,
    y: (Math.random() - 0.5) * spread * 1.4,
    z,
    scale: 0.5 + Math.random() * 0.7,
    opacity: 0.4 + Math.random() * 0.3,
  }
})

function CameraRig({ mouse }) {
  const camX = useRef(0)
  const camY = useRef(0)
  const introClock = useRef(0)
  const introDone = useRef(false)

  useFrame(({ camera }, delta) => {
    // 入场穿梭：mount 后立即开始，不依赖图片
    if (!introDone.current) {
      introClock.current += delta
      const t = Math.min(introClock.current / 3, 1)
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      camera.position.z = -50 + 50 * eased
      camera.position.x = 0
      camera.position.y = 0
      camera.rotation.set(0, 0, 0)
      if (t >= 1) introDone.current = true
      return
    }
    // 鼠标视差：大幅度移动，阻尼顺滑
    const targetX = mouse.current.x * 6
    const targetY = mouse.current.y * 4
    camX.current += (targetX - camX.current) * 0.05
    camY.current += (targetY - camY.current) * 0.05
    camera.position.x = camX.current
    camera.position.y = camY.current
    camera.position.z = 0
  })
  return null
}

function Card({ item, pos, onHover, onLeave, onClick }) {
  const matRef = useRef()
  const [hovered, setHovered] = useState(false)
  const [tex, setTex] = useState(null)
  const [ready, setReady] = useState(false)

  // 每张卡片独立加载，加载完成立即淡入显示
  useEffect(() => {
    if (!item.cover) { setReady(true); return }
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    let alive = true
    loader.load(
      item.cover,
      (t) => { if (!alive) return; setTex(t); setReady(true) },
      undefined,
      () => { if (alive) setReady(true) }
    )
    return () => { alive = false }
  }, [item.cover])

  // 淡入动画：opacity 从 0 平滑升到目标值
  useFrame(() => {
    if (!ready || !matRef.current) return
    const target = hovered ? 1 : pos.opacity
    matRef.current.opacity += (target - matRef.current.opacity) * 0.08
  })

  if (!ready || !tex) return null

  const aspect = tex.image.width / tex.image.height
  const w = 4 * pos.scale
  const h = w / aspect

  return (
    <sprite
      position={[pos.x, pos.y, pos.z]}
      scale={[w, h, 1]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover(item); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); onLeave(); document.body.style.cursor = 'default' }}
      onClick={(e) => { e.stopPropagation(); onClick(item) }}
    >
      <spriteMaterial ref={matRef} map={tex} transparent opacity={0} />
    </sprite>
  )
}

export default function Scene({ onHover, onLeave, onPlay, playingItem }) {
  const mouse = useRef({ x: 0, y: 0 })
  const audio = useRef(new Audio())
  const [playing, setPlaying] = useState(null)

  useEffect(() => {
    const fn = (e) => {
      mouse.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      }
    }
    window.addEventListener('mousemove', fn)
    return () => window.removeEventListener('mousemove', fn)
  }, [])

  const handleClick = async (item) => {
    if (item.type !== 'music') return
    if (playing?.title === item.title) { audio.current.pause(); setPlaying(null); onPlay(null); return }
    audio.current.pause()
    let url = item.fallbackPreview
    try {
      const res = await fetch(item.itunesUrl)
      const data = await res.json()
      if (data.results?.[0]?.previewUrl) url = data.results[0].previewUrl
    } catch (e) {}
    audio.current.src = url
    audio.current.currentTime = 0
    audio.current.play().catch(() => {})
    setPlaying(item)
    onPlay(item)
    setTimeout(() => { audio.current.pause(); setPlaying(null); onPlay(null) }, 15000)
  }

  return (
    <>
      <CameraRig mouse={mouse} />
      {repeatedItems.map((item, i) => (
        <Card
          key={`${item.type}-${item.title}`}
          item={item}
          pos={positions[i]}
          onHover={onHover}
          onLeave={onLeave}
          onClick={handleClick}
        />
      ))}
    </>
  )
}
