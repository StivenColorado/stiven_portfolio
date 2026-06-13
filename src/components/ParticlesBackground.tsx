import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
}

interface MouseTrail {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

/**
 * Fondo de partículas MONOCROMO y sutil.
 * - Sin líneas de conexión (evita el look "red neuronal" de plantilla).
 * - El color sigue el token CSS --particle (negro en claro, blanco en oscuro)
 *   y se actualiza al cambiar de tema vía MutationObserver.
 * - Bajo coste: máx. ~60 puntos, sin gradientes complejos.
 */
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

    // Color dinámico desde el token CSS --particle ("r, g, b")
    let particleRGB = '0, 0, 0';
    const readParticleColor = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue('--particle')
        .trim();
      if (v) particleRGB = v;
    };
    readParticleColor();

    // Re-leer color cuando cambia el tema (clase .dark en <html>)
    const themeObserver = new MutationObserver(readParticleColor);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    const initParticles = () => {
      particles = [];
      const rect = canvas.getBoundingClientRect();
      const particleCount = Math.min(60, Math.floor((rect.width * rect.height) / 32000));

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          size: Math.random() * 1.6 + 0.6,
          speedX: (Math.random() - 0.5) * 0.35,
          speedY: (Math.random() - 0.5) * 0.35,
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

      if (velocity > 2) {
        mouseTrails.push({
          x: mouseX,
          y: mouseY,
          life: 26,
          maxLife: 26,
          size: Math.random() * 3 + 1.5,
        });
        if (mouseTrails.length > 12) mouseTrails.shift();
      }
    };

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Estela del mouse (monocroma, sin halo de color)
      for (let i = mouseTrails.length - 1; i >= 0; i--) {
        const trail = mouseTrails[i];
        trail.life--;
        if (trail.life <= 0) {
          mouseTrails.splice(i, 1);
          continue;
        }
        const alpha = trail.life / trail.maxLife;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, trail.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particleRGB}, ${alpha * 0.7})`;
        ctx.fill();
      }

      // Partículas de fondo
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0 || p.x > rect.width) p.speedX *= -1;
        if (p.y < 0 || p.y > rect.height) p.speedY *= -1;
        p.x = Math.max(0, Math.min(rect.width, p.x));
        p.y = Math.max(0, Math.min(rect.height, p.y));

        if (isMouseMoving) {
          const dx = mouseX - p.x;
          const dy = mouseY - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 100) {
            const force = ((100 - distance) / 100) * 0.02;
            const angle = Math.atan2(dy, dx);
            p.x -= Math.cos(angle) * force;
            p.y -= Math.sin(angle) * force;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particleRGB}, 0.55)`;
        ctx.fill();
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
      themeObserver.disconnect();
      if (animationId) cancelAnimationFrame(animationId);
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
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    </div>
  );
};

export { ParticlesBackground };
