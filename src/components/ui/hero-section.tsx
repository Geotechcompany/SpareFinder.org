import React, { useRef, useLayoutEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Shape,
  ExtrudeGeometry,
  Group,
  MeshStandardMaterial,
  Color,
  InstancedMesh,
  Matrix4,
  Euler,
  BufferGeometry,
  Material,
} from "three";

type Vector3Tuple = [number, number, number];

const BoxesInstanced: React.FC = () => {
  const meshRef = useRef<InstancedMesh<BufferGeometry, Material> | null>(null);

  const geometry = useMemo(() => {
    const shape = new Shape();
    const angleStep = Math.PI * 0.5;
    const radius = 1;
    shape.absarc(2, 2, radius, angleStep * 0, angleStep * 1);
    shape.absarc(-2, 2, radius, angleStep * 1, angleStep * 2);
    shape.absarc(-2, -2, radius, angleStep * 2, angleStep * 3);
    shape.absarc(2, -2, radius, angleStep * 3, angleStep * 4);

    const extrudeSettings = {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 6,
      curveSegments: 6,
    } as const;

    const g = new ExtrudeGeometry(shape, extrudeSettings);
    g.center();
    return g as BufferGeometry;
  }, []);

  const material = useMemo(() => {
    return new MeshStandardMaterial({
      color: new Color("#232323"),
      metalness: 0.8,
      roughness: 0.35,
    }) as Material;
  }, []);

  const count = useMemo(() => {
    if (typeof window === "undefined") return 40;
    return window.innerWidth < 640 ? 24 : 40;
  }, []);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    const m = new Matrix4();
    for (let i = 0; i < count; i++) {
      const rot = new Euler((i - 10) * 0.1, Math.PI / 2, 0);
      m.makeRotationFromEuler(rot);
      m.setPosition((i - count / 2) * 0.75, 0, 0);
      meshRef.current.setMatrixAt(i, m);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count]);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.x += delta * 0.05;
  });

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} />;
};

export const Scene: React.FC = () => {
  const [cameraPosition] = React.useState<Vector3Tuple>([5, 5, 20]);
  return (
    <div className="w-full h-full z-0">
      <Canvas
        camera={{ position: cameraPosition, fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        shadows={false}
      >
        <ambientLight intensity={2} />
        <directionalLight position={[10, 10, 5]} intensity={3} />
        <BoxesInstanced />
      </Canvas>
    </div>
  );
};

export default Scene;
