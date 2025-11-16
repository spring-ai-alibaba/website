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

    // Initialize nodes
    const nodeCount = 40
    nodesRef.current = []

    for (let i = 0; i < nodeCount; i++) {
      nodesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      })
    }

    const animate = () => {
      if (!ctx || !canvas) return

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

        // Draw node
        ctx.beginPath()
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(102, 126, 234, 0.7)'
        ctx.fill()

        // Add glow effect
        ctx.beginPath()
        ctx.arc(node.x, node.y, 5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(102, 126, 234, 0.3)'
        ctx.fill()

        // Draw connections
        nodes.forEach((otherNode, j) => {
          if (i >= j) return

          const dx = node.x - otherNode.x
          const dy = node.y - otherNode.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(otherNode.x, otherNode.y)
            const opacity = 0.4 * (1 - distance / 150)
            ctx.strokeStyle = `rgba(102, 126, 234, ${opacity})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        })
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

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
