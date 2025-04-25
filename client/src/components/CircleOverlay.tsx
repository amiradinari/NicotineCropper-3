interface CircleOverlayProps {
  size: number;
}

export default function CircleOverlay({ size }: CircleOverlayProps) {
  return (
    <div 
      className="absolute pointer-events-none"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: '2px dashed white',
        borderRadius: '50%',
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    />
  );
}
