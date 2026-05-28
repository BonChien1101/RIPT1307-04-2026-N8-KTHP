import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Tooltip } from 'antd';
import { SyncOutlined, PauseOutlined, ExpandOutlined } from '@ant-design/icons';

interface Product3DViewerProps {
  /** Image URL for the main/front face */
  imageUrl?: string;
  /** Equipment name (used for alt text & placeholder) */
  name?: string;
  /** Size of the cube in pixels */
  size?: number;
  /** Whether to auto-rotate on mount */
  autoRotate?: boolean;
}

/**
 * Product3DViewer
 * An interactive 3D card / cube that the user can drag to rotate.
 * Uses pure CSS + JS – no three.js dependency needed.
 */
const Product3DViewer: React.FC<Product3DViewerProps> = ({
  imageUrl,
  name = 'Thiết bị',
  size = 220,
  autoRotate = true,
}) => {
  const cubeRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(15);
  const [rotateY, setRotateY] = useState(25);
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(autoRotate);
  const [isExpanded, setIsExpanded] = useState(false);

  const lastPos = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);
  const autoRotateRef = useRef(isAutoRotating);
  autoRotateRef.current = isAutoRotating;

  // Auto-rotate animation loop
  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (autoRotateRef.current && !isDragging) {
        setRotateY((prev) => (prev + 0.4) % 360);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isDragging]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    setIsAutoRotating(false);
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setRotateY((prev) => prev + dx * 0.6);
      setRotateX((prev) => Math.max(-60, Math.min(60, prev - dy * 0.4)));
      lastPos.current = { x: e.clientX, y: e.clientY };
    },
    [isDragging],
  );

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Color faces for the cube sides (visible from all angles)
  const faces = [
    // front
    {
      style: {
        transform: `translateZ(${size / 2}px)`,
        background: imageUrl
          ? `url(${imageUrl}) center/cover no-repeat`
          : 'linear-gradient(135deg, rgba(195,155,89,0.30), rgba(15,27,45,0.20))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.22,
      },
      content: !imageUrl ? '📦' : null,
    },
    // back
    {
      style: {
        transform: `rotateY(180deg) translateZ(${size / 2}px)`,
        background: 'linear-gradient(135deg, rgba(15,27,45,0.85), rgba(7,15,28,0.90))',
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 12,
      },
      content: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: size * 0.12, marginBottom: 6 }}>📋</div>
          <div style={{ fontSize: size * 0.07, fontWeight: 700, color: '#f4dfb0', lineHeight: 1.3 }}>
            {name}
          </div>
          <div style={{ fontSize: size * 0.055, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
            BorrowX Asset
          </div>
        </div>
      ),
    },
    // right
    {
      style: {
        transform: `rotateY(90deg) translateZ(${size / 2}px)`,
        background: 'linear-gradient(135deg, rgba(195,155,89,0.20), rgba(139,107,49,0.15))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.16,
      },
      content: '🏷️',
    },
    // left
    {
      style: {
        transform: `rotateY(-90deg) translateZ(${size / 2}px)`,
        background: 'linear-gradient(135deg, rgba(122,90,248,0.14), rgba(15,27,45,0.20))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.16,
      },
      content: '🔍',
    },
    // top
    {
      style: {
        transform: `rotateX(90deg) translateZ(${size / 2}px)`,
        background: 'linear-gradient(135deg, rgba(18,183,106,0.15), rgba(15,27,45,0.18))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.16,
      },
      content: '✅',
    },
    // bottom
    {
      style: {
        transform: `rotateX(-90deg) translateZ(${size / 2}px)`,
        background: 'linear-gradient(135deg, rgba(240,68,56,0.10), rgba(15,27,45,0.18))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.16,
      },
      content: '🔧',
    },
  ];

  const faceBaseStyle: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    border: '1px solid rgba(195,155,89,0.25)',
    borderRadius: 16,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.15)',
  };

  const displaySize = isExpanded ? size * 1.5 : size;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        userSelect: 'none',
      }}
    >
      {/* 3D Scene */}
      <div
        className="product-3d-scene"
        style={{
          width: displaySize,
          height: displaySize,
          perspective: displaySize * 3.5,
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: isExpanded ? 'width 0.3s ease, height 0.3s ease' : 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Shadow below cube */}
        <div
          style={{
            position: 'absolute',
            bottom: -20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: displaySize * 0.7,
            height: 20,
            background: 'rgba(0,0,0,0.18)',
            borderRadius: '50%',
            filter: 'blur(10px)',
            transition: 'opacity 0.3s ease',
            opacity: isDragging ? 0.08 : 0.18,
          }}
        />

        {/* Cube */}
        <div
          ref={cubeRef}
          className="product-3d-cube"
          style={{
            width: displaySize,
            height: displaySize,
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transition: isDragging
              ? 'none'
              : 'transform 0.05s linear',
          }}
        >
          {faces.map((face, i) => (
            <div
              key={i}
              className="product-3d-face"
              style={{
                ...faceBaseStyle,
                width: displaySize,
                height: displaySize,
                ...face.style,
              }}
            >
              {face.content}
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <Tooltip title={isAutoRotating ? 'Dừng xoay' : 'Tự động xoay'}>
          <button
            onClick={() => setIsAutoRotating((v) => !v)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid rgba(195,155,89,0.30)',
              background: isAutoRotating
                ? 'linear-gradient(135deg, #c39b59, #8b6b31)'
                : 'rgba(195,155,89,0.10)',
              color: isAutoRotating ? '#fff' : '#8b6b31',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              transition: 'all 0.2s ease',
            }}
          >
            {isAutoRotating ? <PauseOutlined /> : <SyncOutlined />}
          </button>
        </Tooltip>

        <Tooltip title={isExpanded ? 'Thu nhỏ' : 'Phóng to'}>
          <button
            onClick={() => setIsExpanded((v) => !v)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--muted-light)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              transition: 'all 0.2s ease',
            }}
          >
            <ExpandOutlined />
          </button>
        </Tooltip>

        <div
          style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}
        >
          🖱️ Kéo để xoay 360°
        </div>
      </div>
    </div>
  );
};

export default Product3DViewer;
