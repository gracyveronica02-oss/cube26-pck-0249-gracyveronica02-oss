import React, { useState } from 'react';

interface DetectionView {
  detectionId: string;
  label: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  attributes?: Record<string, string>;
  cropUrl?: string;
}

interface BoundingBoxOverlayProps {
  imageUrl?: string;
  detections: DetectionView[];
  selectedDetectionId?: string;
  onSelectDetection?: (id: string) => void;
}

export const BoundingBoxOverlay: React.FC<BoundingBoxOverlayProps> = ({
  imageUrl,
  detections,
  selectedDetectionId,
  onSelectDetection,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const showFallback = !imageUrl || imageUrl.includes('storage.local') || imgError;

  return (
    <div className="vision-canvas-container">
      {!showFallback ? (
        <img
          src={imageUrl}
          alt="Package Open View"
          className="vision-image"
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{ position: 'relative', width: '100%', height: '440px', background: '#111827' }}>
          <svg viewBox="0 0 800 500" style={{ width: '100%', height: '100%' }}>
            {/* Packing Conveyor Grid */}
            <defs>
              <pattern id="conveyor" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 0 20 L 40 20 M 20 0 L 20 40" fill="none" stroke="#1f2937" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="#0f172a" />
            <rect width="100%" height="100%" fill="url(#conveyor)" />

            {/* Industrial Carton Flaps */}
            <rect x="140" y="50" width="520" height="400" rx="6" fill="#8c643b" stroke="#714e2a" strokeWidth="4" />
            <polygon points="140,50 110,15 690,15 660,50" fill="#75522e" opacity="0.9" />
            <polygon points="140,450 110,485 690,485 660,450" fill="#75522e" opacity="0.9" />
            <polygon points="140,50 80,80 80,420 140,450" fill="#694b2a" opacity="0.95" />
            <polygon points="660,50 720,80 720,420 660,450" fill="#694b2a" opacity="0.95" />

            {/* Box Interior */}
            <rect x="155" y="65" width="490" height="370" rx="4" fill="#a2784d" />
            <rect x="165" y="75" width="470" height="350" rx="3" fill="#583c1d" opacity="0.3" />

            {/* Protective Dunnage Paper */}
            <path d="M 165 75 Q 240 120 340 90 T 500 110 T 635 85 L 635 125 Q 480 145 320 125 T 165 135 Z" fill="#cbb387" opacity="0.85" />
            <path d="M 165 425 Q 260 380 370 405 T 530 385 T 635 425 L 635 390 Q 480 360 320 380 T 165 375 Z" fill="#cbb387" opacity="0.85" />

            {/* Camera Watermark */}
            <text x="645" y="475" fill="#64748b" fontFamily="monospace" fontSize="11" textAnchor="end">
              OVERHEAD CAM-01 · 1080P CALIBRATED
            </text>
          </svg>
        </div>
      )}

      {/* Render Normalized Bounding Boxes */}
      {detections.map((det) => {
        const isSelected = selectedDetectionId === det.detectionId;
        const isHovered = hoveredId === det.detectionId;

        const left = `${(det.boundingBox.x * 100).toFixed(1)}%`;
        const top = `${(det.boundingBox.y * 100).toFixed(1)}%`;
        const width = `${(det.boundingBox.width * 100).toFixed(1)}%`;
        const height = `${(det.boundingBox.height * 100).toFixed(1)}%`;

        return (
          <div
            key={det.detectionId}
            className="bounding-box"
            style={{
              left,
              top,
              width,
              height,
              borderColor: isSelected ? '#f59e0b' : (isHovered ? '#38bdf8' : '#0284c7'),
              background: isSelected
                ? 'rgba(245, 158, 11, 0.25)'
                : (isHovered ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.15)'),
            }}
            onMouseEnter={() => setHoveredId(det.detectionId)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onSelectDetection && onSelectDetection(det.detectionId)}
          >
            <div
              className="bounding-box-label"
              style={{
                background: isSelected ? '#d97706' : '#0284c7',
              }}
            >
              {det.label} ({(det.confidence * 100).toFixed(0)}%)
            </div>
          </div>
        );
      })}
    </div>
  );
};
