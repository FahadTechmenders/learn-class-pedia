import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';

const NODE_SPACING = 1.6;

const JourneyNode = ({ position, step, index }) => {
  const meshRef = useRef();
  const color = step.highlight ? '#2563eb' : step.muted ? '#94a3b8' : '#60a5fa';
  const emissive = step.highlight ? '#1d4ed8' : '#000000';

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.35 + index;
  });

  return (
    <group position={position}>
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
        <mesh ref={meshRef} scale={step.highlight ? 0.42 : 0.32}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={step.highlight ? 0.5 : 0}
            roughness={0.35}
            metalness={0.25}
            flatShading
          />
        </mesh>
      </Float>
      <Html position={[0, -0.7, 0]} center distanceFactor={7} style={{ pointerEvents: 'none' }}>
        <div className="text-center whitespace-nowrap select-none">
          <div className={`text-[11px] font-semibold ${step.highlight ? 'text-blue-600 dark:text-blue-300' : 'text-gray-800 dark:text-gray-100'}`}>
            {step.label}
          </div>
          <div className="text-[9px] text-gray-500 dark:text-gray-400">{step.caption}</div>
        </div>
      </Html>
    </group>
  );
};

const Connector = ({ from, to, muted }) => {
  const midpoint = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  return (
    <mesh position={midpoint} rotation={[0, 0, angle]}>
      <boxGeometry args={[length - 0.75, 0.035, 0.035]} />
      <meshStandardMaterial color={muted ? '#cbd5e1' : '#93c5fd'} />
    </mesh>
  );
};

const Rig = () => {
  useFrame((state) => {
    const { x, y } = state.pointer;
    state.camera.position.x += (x * 0.4 - state.camera.position.x) * 0.05;
    state.camera.position.y += (y * 0.3 - state.camera.position.y) * 0.05;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
};

const LeadJourneyScene = ({ steps }) => {
  const positions = useMemo(() => {
    const total = steps.length;
    const offset = ((total - 1) * NODE_SPACING) / 2;
    return steps.map((_, i) => [i * NODE_SPACING - offset, (i % 2 === 0 ? 0.25 : -0.25), 0]);
  }, [steps]);

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6.5], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <Rig />
      {steps.map((step, i) => (
        <React.Fragment key={step.key}>
          {i > 0 && <Connector from={positions[i - 1]} to={positions[i]} muted={step.muted} />}
          <JourneyNode position={positions[i]} step={step} index={i} />
        </React.Fragment>
      ))}
    </Canvas>
  );
};

export default LeadJourneyScene;
