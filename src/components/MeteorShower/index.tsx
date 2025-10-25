import React, { useEffect, useRef } from 'react';
import styles from './styles.module.css';

interface Meteor {
  x: number;
  y: number;
  length: number;
  speed: number;
  color: string;
  opacity: number;
  angle: number;
  tail: { x: number; y: number; opacity: number }[];
}

const MeteorShower: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meteorsRef = useRef<Meteor[]>([]);
  const animationRef = useRef<number | undefined>(undefined);

  const meteorColors = [
    '#ff6b9d', // Pink
    '#60a5fa', // Blue
    '#fbbf24', // Gold
    '#34d399', // Green
    '#a78bfa', // Purple
    '#f97316', // Orange
    '#fde047', // Yellow
    '#94a3b8', // Gray
  ];

  const createMeteor = (): Meteor => {
    // Start randomly from anywhere on the page
    const startX = Math.random() * window.innerWidth; // Random across screen width
    const startY = Math.random() * window.innerHeight; // Random across screen height

    // Random angle to make meteors move in different directions
    const angles = [
      Math.PI / 6,    // 30 degrees
      Math.PI / 4,    // 45 degrees
      Math.PI / 3,    // 60 degrees
      -Math.PI / 6,   // -30 degrees
      -Math.PI / 4,   // -45 degrees
      -Math.PI / 3,   // -60 degrees
    ];
    const randomAngle = angles[Math.floor(Math.random() * angles.length)];

    return {
      x: startX,
      y: startY,
      length: Math.random() * 80 + 60, // 60-140px length
      speed: Math.random() * 2 + 2, // Speed: 2-4 pixels per frame
      color: meteorColors[Math.floor(Math.random() * meteorColors.length)],
      opacity: 1,
      angle: randomAngle, // Random angle
      tail: []
    };
  };

  const updateMeteor = (meteor: Meteor, canvas: HTMLCanvasElement): boolean => {
    // Update position - move at 45 degree angle
    const dx = Math.cos(meteor.angle) * meteor.speed;
    const dy = Math.sin(meteor.angle) * meteor.speed;

    // Record tail trajectory - increase tail length
    meteor.tail.unshift({ x: meteor.x, y: meteor.y, opacity: meteor.opacity });
    if (meteor.tail.length > 40) {  // Increase tail length from 20 to 40
      meteor.tail.pop();
    }

    meteor.x += dx;
    meteor.y += dy;

    // If meteor completely leaves the screen, return false
    return meteor.x < canvas.width + 200 && meteor.y < canvas.height + 200;
  };

  const drawMeteor = (ctx: CanvasRenderingContext2D, meteor: Meteor) => {
    if (meteor.tail.length < 2) return;

    // Draw tail - enhanced effect
    ctx.strokeStyle = meteor.color;
    ctx.lineWidth = 6;  // Increase line width
    ctx.lineCap = 'round';

    for (let i = 0; i < meteor.tail.length - 1; i++) {
      const current = meteor.tail[i];
      const next = meteor.tail[i + 1];
      const alpha = (1 - i / meteor.tail.length) * meteor.opacity * 0.8;  // Increase opacity
      const width = 6 * alpha;  // Increase base width

      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(width, 1);  // Ensure minimum width of 1

      ctx.beginPath();
      ctx.moveTo(current.x, current.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }

    // Draw head light ball
    ctx.globalAlpha = meteor.opacity;
    const gradient = ctx.createRadialGradient(meteor.x, meteor.y, 0, meteor.x, meteor.y, 8);  // Slightly increase head size
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(0.3, meteor.color);
    gradient.addColorStop(0.6, meteor.color + '80');
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(meteor.x, meteor.y, 8, 0, Math.PI * 2);  // Slightly increase head size
    ctx.fill();

    // Add outer glow effect
    ctx.globalAlpha = meteor.opacity * 0.5;  // Increase glow opacity
    const outerGradient = ctx.createRadialGradient(meteor.x, meteor.y, 0, meteor.x, meteor.y, 16);  // Increase glow size
    outerGradient.addColorStop(0, meteor.color + '60');
    outerGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = outerGradient;
    ctx.beginPath();
    ctx.arc(meteor.x, meteor.y, 16, 0, Math.PI * 2);
    ctx.fill();
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;

    // Update and draw meteors
    meteorsRef.current = meteorsRef.current.filter(meteor => {
      const isVisible = updateMeteor(meteor, canvas);
      if (isVisible) {
        drawMeteor(ctx, meteor);
      }
      return isVisible;
    });

    // Randomly add new meteors - reduce frequency
    if (Math.random() < 0.01 && meteorsRef.current.length < 6) {  // Reduced from 0.04 to 0.01, max count from 12 to 6
      meteorsRef.current.push(createMeteor());
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  useEffect(() => {
    resizeCanvas();

    // Initialize a small number of meteors
    for (let i = 0; i < 2; i++) {  // Reduced from 5 to 2
      meteorsRef.current.push(createMeteor());
    }

    animate();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.meteorCanvas} />;
};

export default MeteorShower;
