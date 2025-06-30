import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  alpha?: number;
  life?: number;
  maxLife?: number;
}

interface MouseTrail {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

const ParticlesBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let mouseTrails: MouseTrail[] = [];
    let animationId: number;
    let mouseX = 0;
    let mouseY = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let isMouseMoving = false;

    const colors = [
      'rgba(56, 189, 248, 0.6)',  // azul claro
      'rgba(59, 130, 246, 0.5)',  // azul
      'rgba(37, 99, 235, 0.4)',   // azul oscuro
    ];

    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.style.width = '100%';
      canvas.style.height = '100vh';
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    // Menos partículas para mejor rendimiento
    const initParticles = () => {
      particles = [];
      const rect = canvas.getBoundingClientRect();
      const particleCount = Math.min(80, Math.floor((rect.width * rect.height) / 25000)); // Máximo 80 partículas
      
      for (let i = 0; i < particleCount; i++) {
        const size = Math.random() * 2 + 1;
        particles.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          size: size,
          speedX: (Math.random() - 0.5) * 0.5, // Velocidad más lenta
          speedY: (Math.random() - 0.5) * 0.5,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    const handleResize = () => {
      setupCanvas();
      initParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      lastMouseX = mouseX;
      lastMouseY = mouseY;
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      
      const dx = mouseX - lastMouseX;
      const dy = mouseY - lastMouseY;
      const velocity = Math.sqrt(dx * dx + dy * dy);
      
      isMouseMoving = velocity > 1;
      
      // Solo crear estela si se mueve rápido - muy simple y eficiente
      if (velocity > 2) {
        // Solo una partícula por movimiento para máximo rendimiento
        mouseTrails.push({
          x: mouseX,
          y: mouseY,
          life: 30, // Vida corta
          maxLife: 30,
          size: Math.random() * 4 + 2
        });
        
        // Limitar cantidad de trails para evitar lag
        if (mouseTrails.length > 15) {
          mouseTrails.shift();
        }
      }
    };

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // 1. Dibujar estela del mouse - súper simple
      for (let i = mouseTrails.length - 1; i >= 0; i--) {
        const trail = mouseTrails[i];
        trail.life--;
        
        if (trail.life <= 0) {
          mouseTrails.splice(i, 1);
          continue;
        }
        
        const alpha = trail.life / trail.maxLife;
        const size = trail.size * alpha;
        
        // Círculo simple sin gradientes complejos
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
        ctx.fill();
        
        // Halo exterior simple
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.3})`;
        ctx.fill();
      }
      
      // 2. Dibujar partículas de fondo
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Actualizar posición
        p.x += p.speedX;
        p.y += p.speedY;
        
        // Rebotar en bordes
        if (p.x < 0 || p.x > rect.width) p.speedX *= -1;
        if (p.y < 0 || p.y > rect.height) p.speedY *= -1;
        
        // Mantener dentro de límites
        p.x = Math.max(0, Math.min(rect.width, p.x));
        p.y = Math.max(0, Math.min(rect.height, p.y));
        
        // Interacción suave con mouse
        if (isMouseMoving) {
          const dx = mouseX - p.x;
          const dy = mouseY - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            const force = (100 - distance) / 100 * 0.02; // Fuerza muy suave
            const angle = Math.atan2(dy, dx);
            p.x -= Math.cos(angle) * force;
            p.y -= Math.sin(angle) * force;
          }
        }
        
        // Dibujar partícula - círculo simple
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      
      // 3. Conexiones entre partículas - solo algunas y muy simples
      if (particles.length > 0) {
        for (let i = 0; i < particles.length; i += 3) { // Solo cada tercera partícula
          const p1 = particles[i];
          
          for (let j = i + 3; j < particles.length; j += 3) {
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 120) {
              const alpha = (1 - distance / 120) * 0.15;
              ctx.beginPath();
              ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
              ctx.lineWidth = 0.5;
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }
      
      animationId = requestAnimationFrame(animate);
    };

    const init = () => {
      setTimeout(() => {
        setupCanvas();
        initParticles();
        setIsInitialized(true);
        animate();
      }, 50);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    if (document.readyState === 'complete') {
      init();
    } else {
      window.addEventListener('load', init);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('load', init);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);
  
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{
          display: 'block',
          width: '100vw',
          height: '100vh',
          backgroundColor: 'transparent',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: isInitialized ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
      {/* Pequeño guiño para el dev 😉 */}
      <div 
        className="absolute bottom-2 right-2 text-xs text-blue-400 opacity-10 pointer-events-none select-none"
        style={{ fontFamily: 'monospace' }}
      >
        🚀 Optimized for speed
      </div>
    </div>
  );
};

export { ParticlesBackground };