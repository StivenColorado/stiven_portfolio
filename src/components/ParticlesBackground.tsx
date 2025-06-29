import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
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
    let animationId: number;
    let mouseX = 0;
    let mouseY = 0;

    const colors = [
      'rgba(34, 211, 238, 0.7)',  // cian
      'rgba(56, 189, 248, 0.7)',  // azul claro
      'rgba(59, 130, 246, 0.7)',  // azul
      'rgba(37, 99, 235, 0.7)',   // azul más oscuro
    ];

    // Función para configurar el canvas correctamente
    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Establecer el tamaño del canvas en píxeles CSS
      canvas.style.width = '100%';
      canvas.style.height = '100vh';
      
      // Establecer el tamaño interno del canvas considerando DPR
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Escalar el contexto para que coincida con DPR
      ctx.scale(dpr, dpr);
      
      // Asegurar que el canvas tenga el tamaño correcto inmediatamente
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    // Función para inicializar partículas
    const initParticles = () => {
      particles = [];
      const rect = canvas.getBoundingClientRect();
      const particleCount = Math.floor((rect.width * rect.height) / 15000);
      
      for (let i = 0; i < particleCount; i++) {
        const size = Math.random() * 3 + 1;
        particles.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          size: size,
          speedX: Math.random() * 1 - 0.5,
          speedY: Math.random() * 1 - 0.5,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    // Función de redimensionamiento
    const handleResize = () => {
      setupCanvas();
      initParticles();
    };

    // Manejador de movimiento del mouse
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    // Función de animación
    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Actualizar y dibujar partículas
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Actualizar posición
        p.x += p.speedX;
        p.y += p.speedY;
        
        // Rebotar en los bordes
        if (p.x < 0 || p.x > rect.width) p.speedX *= -1;
        if (p.y < 0 || p.y > rect.height) p.speedY *= -1;
        
        // Mantener partículas dentro de los límites
        p.x = Math.max(0, Math.min(rect.width, p.x));
        p.y = Math.max(0, Math.min(rect.height, p.y));
        
        // Interacción con el mouse
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          const angle = Math.atan2(dy, dx);
          const force = (100 - distance) / 100 * 0.1;
          p.x -= Math.cos(angle) * force;
          p.y -= Math.sin(angle) * force;
        }
        
        // Dibujar partícula
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        
        // Conectar partículas cercanas
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - distance / 100) * 0.3})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }
      
      animationId = requestAnimationFrame(animate);
    };

    // Inicialización con un pequeño delay para asegurar que el DOM esté listo
    const init = () => {
      setTimeout(() => {
        setupCanvas();
        initParticles();
        setIsInitialized(true);
        animate();
      }, 50);
    };

    // Event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    // Inicializar
    if (document.readyState === 'complete') {
      init();
    } else {
      window.addEventListener('load', init);
    }
    
    // Limpieza
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
          width: '99vw',
          height: '100vh',
          backgroundColor: 'transparent',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: isInitialized ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
    </div>
  );
};

export { ParticlesBackground };