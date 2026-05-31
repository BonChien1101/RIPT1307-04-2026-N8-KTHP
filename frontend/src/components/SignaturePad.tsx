import React, { useRef, useEffect, useCallback } from 'react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  height?: number;
  strokeColor?: string;
  bgColor?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  height = 140,
  strokeColor = '#0f1b2d',
  bgColor = 'rgba(248, 249, 252, 0.9)',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const isEmpty = useRef(true);

  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (parent) {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(ratio, ratio);
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = strokeColor;
      }
    }
  }, [height, strokeColor, bgColor]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as MouseEvent).clientX - rect.left,
      y: (e as MouseEvent).clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    const pos = getPos(e);
    lastPoint.current = pos;
    isEmpty.current = false;

    const ctx = getCtx();
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.arc(pos.x, pos.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = strokeColor;
      ctx.fill();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;

    const ctx = getCtx();
    const pos = getPos(e);

    if (ctx && lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    lastPoint.current = pos;
  };

  const stopDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    if (!isEmpty.current) {
      const canvas = canvasRef.current;
      if (canvas) onSave(canvas.toDataURL('image/png'));
    }
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    isEmpty.current = true;
    onSave('');
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          border: '1.5px solid rgba(15,23,42,0.12)',
          borderRadius: 14,
          overflow: 'hidden',
          background: bgColor,
          cursor: 'crosshair',
          position: 'relative',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)',
          touchAction: 'none',
        }}
      >
        {/* Guide lines */}
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: 16,
            right: 16,
            height: 1,
            background: 'rgba(195,155,89,0.25)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 34,
            left: 16,
            fontSize: 10,
            color: 'rgba(139,107,49,0.50)',
            fontStyle: 'italic',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          Ký tên tại đây
        </div>

        <canvas
          ref={canvasRef}
          style={{ display: 'block', touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>

      <button
        type="button"
        onClick={clearPad}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(240, 68, 56, 0.10)',
          border: '1px solid rgba(240, 68, 56, 0.20)',
          borderRadius: 8,
          color: '#d92d20',
          fontSize: 11,
          fontWeight: 700,
          padding: '4px 10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          zIndex: 2,
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.background = 'rgba(240, 68, 56, 0.18)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.background = 'rgba(240, 68, 56, 0.10)';
        }}
      >
        Xóa
      </button>
    </div>
  );
};

export default SignaturePad;
