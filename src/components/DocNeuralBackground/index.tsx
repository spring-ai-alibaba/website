import React, { useEffect, useRef } from 'react'
import styles from './styles.module.css'

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const DocNeuralBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()

    // Initialize nodes - reduced count
    const nodeCount = 25 // Reduced from 40 to 25
    nodesRef.current = []

    for (let i = 0; i < nodeCount; i++) {
      nodesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      })
    }

    const animate = (currentTime: number) => {
      if (!ctx || !canvas) return

      // Frame rate control: target ~24fps for background animation
      const elapsed = currentTime - lastFrameTimeRef.current
      if (elapsed < 42) { // ~24fps
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }
      lastFrameTimeRef.current = currentTime

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const nodes = nodesRef.current

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Update position
        node.x += node.vx
        node.y += node.vy

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        // Keep nodes within bounds
        node.x = Math.max(0, Math.min(canvas.width, node.x))
        node.y = Math.max(0, Math.min(canvas.height, node.y))

        // Draw node (simplified)
        ctx.beginPath()
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2) // Reduced size from 3 to 2
        ctx.fillStyle = 'rgba(102, 126, 234, 0.6)' // Reduced opacity
        ctx.fill()

        // Draw connections (reduced distance)
        nodes.forEach((otherNode, j) => {
          if (i >= j) return

          const dx = node.x - otherNode.x
          const dy = node.y - otherNode.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 120) { // Reduced from 150 to 120
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(otherNode.x, otherNode.y)
            const opacity = 0.3 * (1 - distance / 120) // Reduced opacity
            ctx.strokeStyle = `rgba(102, 126, 234, ${opacity})`
            ctx.lineWidth = 0.8 // Reduced from 1 to 0.8
            ctx.stroke()
          }
        })
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    lastFrameTimeRef.current = performance.now()
    animate(lastFrameTimeRef.current)

    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div className={styles.neuralBackgroundContainer}>
      <canvas ref={canvasRef} className={styles.neuralCanvas} />
      <div className={styles.gradientOverlay} />
    </div>
  )
}

export default DocNeuralBackground
