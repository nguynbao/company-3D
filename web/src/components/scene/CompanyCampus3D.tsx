import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Grid, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useCompanyStore } from '../../store/useCompanyStore';
import {
  DepartmentBuilding,
  DepartmentId,
  Employee,
  formatProviderModel,
} from '../../types/company';
import { CANTEEN_POSITION } from '../../data/mockCompanyData';

/**
 * Shared reusable geometries & materials (0 GC allocation per frame, high FPS)
 */
const SHARED_GEOMETRIES = {
  legCapsule: new THREE.CapsuleGeometry(0.065, 0.24, 4, 8),
  shoeBox: new THREE.BoxGeometry(0.15, 0.1, 0.24),
  shoeSole: new THREE.BoxGeometry(0.16, 0.03, 0.25),
  collar: new THREE.BoxGeometry(0.18, 0.08, 0.06),
  lanyardStrap: new THREE.BoxGeometry(0.025, 0.22, 0.01),
  badgeCard: new THREE.BoxGeometry(0.11, 0.14, 0.015),
  badgeHeader: new THREE.BoxGeometry(0.09, 0.035, 0.005),
  backpackStripe: new THREE.BoxGeometry(0.18, 0.04, 0.01),
  armCapsule: new THREE.CapsuleGeometry(0.058, 0.22, 4, 8),
  handSphere: new THREE.SphereGeometry(0.065, 8, 8),
  earSphere: new THREE.SphereGeometry(0.045, 6, 6),
  eyeSphere: new THREE.SphereGeometry(0.034, 8, 8),
  pupilShine: new THREE.SphereGeometry(0.011, 6, 6),
  eyebrowBox: new THREE.BoxGeometry(0.07, 0.018, 0.015),
  cheekCircle: new THREE.CircleGeometry(0.025, 8),
  smileBox: new THREE.BoxGeometry(0.08, 0.022, 0.01),
  fringeBox: new THREE.BoxGeometry(0.34, 0.08, 0.08),
  visorBox: new THREE.BoxGeometry(0.32, 0.065, 0.02),
  headsetArc: new THREE.TorusGeometry(0.21, 0.018, 6, 16, Math.PI),
  earCup: new THREE.CylinderGeometry(0.055, 0.055, 0.04, 10),
  selectRing: new THREE.RingGeometry(0.52, 0.72, 24),
  selectDisc: new THREE.CircleGeometry(0.52, 24),
};

const SHARED_MATERIALS = {
  pants: new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.6 }),
  shoeWhite: new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.4 }),
  skin: new THREE.MeshStandardMaterial({ color: '#FDE68A', roughness: 0.45 }),
  earSkin: new THREE.MeshStandardMaterial({ color: '#FCD34D', roughness: 0.5 }),
  eyeDark: new THREE.MeshBasicMaterial({ color: '#0F172A' }),
  whiteBasic: new THREE.MeshBasicMaterial({ color: '#FFFFFF' }),
  cheekPink: new THREE.MeshBasicMaterial({ color: '#FDA4AF' }),
  smileRed: new THREE.MeshBasicMaterial({ color: '#E11D48' }),
  backpackDark: new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.5 }),
  headsetBand: new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.6 }),
  selectGreen: new THREE.MeshBasicMaterial({ color: '#22C55E', side: THREE.DoubleSide }),
  selectGreenTranslucent: new THREE.MeshBasicMaterial({
    color: '#22C55E',
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
  }),
};

// Scratch vectors for zero-allocation pathfinding in useFrame
const _scratchTarget = new THREE.Vector3();
const _scratchDir = new THREE.Vector3();
const _scratchPush = new THREE.Vector3();

function stepWithAvoidanceInPlace(
  current: THREE.Vector3,
  target: THREE.Vector3,
  buildings: DepartmentBuilding[],
  speed: number,
  delta: number
): number {
  _scratchDir.subVectors(target, current);
  _scratchDir.y = 0;
  const dist = _scratchDir.length();
  if (dist < 0.15) return 0;

  _scratchDir.normalize();
  const prevX = current.x;
  const prevZ = current.z;
  current.addScaledVector(_scratchDir, Math.min(dist, speed * delta));

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const bx = b.position[0];
    const bz = b.position[2];
    const radius = b.id === 'MKT-DIRECTOR' ? 3.5 : 2.5;
    const dx = current.x - bx;
    const dz = current.z - bz;
    const dCenter = Math.hypot(dx, dz);
    const targetDistToBuilding = Math.hypot(target.x - bx, target.z - bz);

    if (dCenter < radius && targetDistToBuilding > radius + 0.5) {
      _scratchPush.set(dx, 0, dz).normalize();
      current.addScaledVector(_scratchPush, (radius - dCenter + 0.25) * 0.65);
    }
  }

  return Math.atan2(current.x - prevX, current.z - prevZ);
}

/**
 * Detailed 3D Character Avatar (Memoized + Zero-GC Animation Loop)
 */
const EmployeeAvatar3D: React.FC<{
  employee: Employee;
  buildings: DepartmentBuilding[];
  isSelected: boolean;
  lowQuality: boolean;
}> = React.memo(({ employee, buildings, isSelected, lowQuality }) => {
  const groupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const laptopRef = useRef<THREE.Group>(null);
  const focusOnEmployee = useCompanyStore((s) => s.focusOnEmployee);

  const posRef = useRef(new THREE.Vector3(...employee.position));
  const phaseOffset = useMemo(
    () => employee.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) * 0.37,
    [employee.id]
  );

  const isLead = employee.id.endsWith('-01') || employee.id === 'video-lead';

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime() + phaseOffset;
    _scratchTarget.set(
      employee.targetPosition[0],
      employee.targetPosition[1],
      employee.targetPosition[2]
    );
    const dist = posRef.current.distanceTo(_scratchTarget);

    const isMoving = dist > 0.2;
    const speed = employee.state === 'working' ? 5.0 : 3.3;

    if (isMoving) {
      const moveAngle = stepWithAvoidanceInPlace(
        posRef.current,
        _scratchTarget,
        buildings,
        speed,
        Math.min(delta, 0.1)
      );
      groupRef.current.position.copy(posRef.current);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, moveAngle, 0.22);

      const swing = Math.sin(t * 9.5) * 0.62;
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.75;
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.75;
      if (headGroupRef.current) {
        headGroupRef.current.rotation.y = Math.sin(t * 4.5) * 0.1;
        headGroupRef.current.rotation.z = Math.cos(t * 9.5) * 0.04;
      }
      groupRef.current.position.y = Math.abs(Math.sin(t * 9.5)) * 0.09;
    } else {
      groupRef.current.position.x = posRef.current.x;
      groupRef.current.position.z = posRef.current.z;

      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;

      if (employee.state === 'working') {
        groupRef.current.position.y = 0;
        if (leftArmRef.current) leftArmRef.current.rotation.x = -1.05 + Math.sin(t * 16) * 0.18;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -1.05 + Math.cos(t * 16) * 0.18;
        if (headGroupRef.current) {
          headGroupRef.current.rotation.x = 0.15 + Math.sin(t * 3) * 0.04;
          headGroupRef.current.rotation.y = Math.sin(t * 2.2) * 0.12;
        }
        if (laptopRef.current) {
          laptopRef.current.position.y = 0.78 + Math.sin(t * 4) * 0.025;
        }
      } else if (employee.state === 'eating' || employee.state === 'cooking') {
        groupRef.current.position.y = 0;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -1.1 + Math.sin(t * 6.5) * 0.35;
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.65;
        if (headGroupRef.current) {
          headGroupRef.current.rotation.x = 0.1 + Math.sin(t * 6.5) * 0.08;
          headGroupRef.current.rotation.y = Math.sin(t * 1.8) * 0.1;
        }
      } else if (employee.state === 'resting') {
        groupRef.current.position.y = Math.sin(t * 2.2) * 0.025;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.85 + Math.max(0, Math.sin(t * 2)) * 0.35;
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.15;
        if (headGroupRef.current) {
          headGroupRef.current.rotation.y = Math.sin(t * 1.5) * 0.18;
        }
      } else if (employee.state === 'chatting') {
        groupRef.current.position.y = Math.abs(Math.sin(t * 4.5)) * 0.04;
        if (leftArmRef.current) leftArmRef.current.rotation.x = -0.55 + Math.sin(t * 6) * 0.3;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -0.55 + Math.cos(t * 6) * 0.3;
        if (headGroupRef.current) {
          headGroupRef.current.rotation.y = Math.sin(t * 3.5) * 0.22;
          headGroupRef.current.rotation.z = Math.sin(t * 4) * 0.06;
        }
      } else {
        groupRef.current.position.y = Math.sin(t * 2.6) * 0.03;
        if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(t * 2) * 0.06;
        if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.sin(t * 2) * 0.06;
        if (headGroupRef.current) {
          headGroupRef.current.rotation.y = Math.sin(t * 1.4) * 0.22;
          headGroupRef.current.rotation.x = 0;
        }
      }
    }
  });

  const stateBadgeColors: Record<string, string> = {
    working: '#22C55E',
    chatting: '#38BDF8',
    eating: '#F59E0B',
    cooking: '#FB923C',
    resting: '#A855F7',
    walking: '#94A3B8',
    idle: '#64748B',
  };

  return (
    <group
      ref={groupRef}
      position={employee.position}
      onClick={(e) => {
        e.stopPropagation();
        focusOnEmployee(employee.id, true);
      }}
    >
      {/* Glowing Selection Aura & Ground Ring */}
      {isSelected && (
        <group position={[0, 0.03, 0]}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            geometry={SHARED_GEOMETRIES.selectRing}
            material={SHARED_MATERIALS.selectGreen}
          />
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.01, 0]}
            geometry={SHARED_GEOMETRIES.selectDisc}
            material={SHARED_MATERIALS.selectGreenTranslucent}
          />
        </group>
      )}

      {/* Left Leg + Sneaker */}
      <group ref={leftLegRef} position={[-0.12, 0.42, 0]}>
        <mesh
          position={[0, -0.18, 0]}
          geometry={SHARED_GEOMETRIES.legCapsule}
          material={SHARED_MATERIALS.pants}
        />
        <mesh
          position={[0, -0.36, 0.04]}
          geometry={SHARED_GEOMETRIES.shoeBox}
          material={SHARED_MATERIALS.shoeWhite}
        />
        <mesh position={[0, -0.39, 0.04]} geometry={SHARED_GEOMETRIES.shoeSole}>
          <meshStandardMaterial color={employee.avatarColor} />
        </mesh>
      </group>

      {/* Right Leg + Sneaker */}
      <group ref={rightLegRef} position={[0.12, 0.42, 0]}>
        <mesh
          position={[0, -0.18, 0]}
          geometry={SHARED_GEOMETRIES.legCapsule}
          material={SHARED_MATERIALS.pants}
        />
        <mesh
          position={[0, -0.36, 0.04]}
          geometry={SHARED_GEOMETRIES.shoeBox}
          material={SHARED_MATERIALS.shoeWhite}
        />
        <mesh position={[0, -0.39, 0.04]} geometry={SHARED_GEOMETRIES.shoeSole}>
          <meshStandardMaterial color={employee.avatarColor} />
        </mesh>
      </group>

      {/* Torso Jacket / Hoodie */}
      <RoundedBox
        args={[0.44, 0.5, 0.26]}
        radius={0.08}
        smoothness={1}
        position={[0, 0.67, 0]}
        castShadow={!lowQuality}
      >
        <meshStandardMaterial color={employee.shirtColor} roughness={0.38} />
      </RoundedBox>

      {/* White Inner Shirt Collar & Department Lanyard ID Card */}
      <mesh
        position={[0, 0.89, 0.11]}
        geometry={SHARED_GEOMETRIES.collar}
        material={SHARED_MATERIALS.shoeWhite}
      />
      <mesh
        position={[-0.05, 0.77, 0.135]}
        rotation={[0, 0, -0.22]}
        geometry={SHARED_GEOMETRIES.lanyardStrap}
      >
        <meshStandardMaterial color={employee.avatarColor} />
      </mesh>
      <mesh
        position={[0.05, 0.77, 0.135]}
        rotation={[0, 0, 0.22]}
        geometry={SHARED_GEOMETRIES.lanyardStrap}
      >
        <meshStandardMaterial color={employee.avatarColor} />
      </mesh>
      <mesh
        position={[0, 0.63, 0.14]}
        geometry={SHARED_GEOMETRIES.badgeCard}
        material={SHARED_MATERIALS.shoeWhite}
      />
      <mesh position={[0, 0.67, 0.148]} geometry={SHARED_GEOMETRIES.badgeHeader}>
        <meshStandardMaterial
          color={employee.avatarColor}
          emissive={employee.avatarColor}
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Tech Backpack on Back */}
      <RoundedBox
        args={[0.3, 0.34, 0.14]}
        radius={0.05}
        smoothness={1}
        position={[0, 0.68, -0.18]}
        material={SHARED_MATERIALS.backpackDark}
      />
      <mesh position={[0, 0.72, -0.255]} geometry={SHARED_GEOMETRIES.backpackStripe}>
        <meshStandardMaterial
          color={employee.avatarColor}
          emissive={employee.avatarColor}
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Left Arm + Hand */}
      <group ref={leftArmRef} position={[-0.29, 0.84, 0]}>
        <mesh position={[0, -0.16, 0]} geometry={SHARED_GEOMETRIES.armCapsule}>
          <meshStandardMaterial color={employee.shirtColor} roughness={0.4} />
        </mesh>
        <mesh
          position={[0, -0.32, 0]}
          geometry={SHARED_GEOMETRIES.handSphere}
          material={SHARED_MATERIALS.skin}
        />
      </group>

      {/* Right Arm + Hand + Held Props */}
      <group ref={rightArmRef} position={[0.29, 0.84, 0]}>
        <mesh position={[0, -0.16, 0]} geometry={SHARED_GEOMETRIES.armCapsule}>
          <meshStandardMaterial color={employee.shirtColor} roughness={0.4} />
        </mesh>
        <mesh
          position={[0, -0.32, 0]}
          geometry={SHARED_GEOMETRIES.handSphere}
          material={SHARED_MATERIALS.skin}
        />

        {employee.state === 'resting' && (
          <group position={[0, -0.34, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.055, 0.045, 0.12, 8]} />
              <meshStandardMaterial color="#F8FAFC" />
            </mesh>
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.057, 0.05, 0.05, 8]} />
              <meshStandardMaterial color="#D97706" />
            </mesh>
          </group>
        )}

        {employee.state === 'eating' && (
          <group position={[-0.12, -0.34, 0.16]} rotation={[Math.PI / 2.2, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.12, 0.07, 0.1, 10]} />
              <meshStandardMaterial color="#EF4444" />
            </mesh>
            <mesh position={[0, 0.045, 0]}>
              <cylinderGeometry args={[0.105, 0.105, 0.02, 10]} />
              <meshStandardMaterial color="#FDE047" />
            </mesh>
          </group>
        )}

        {employee.state === 'cooking' && (
          <group position={[-0.08, -0.34, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.14, 0.12, 0.04, 10]} />
              <meshStandardMaterial color="#1E293B" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.025, 0]}>
              <cylinderGeometry args={[0.09, 0.09, 0.015, 8]} />
              <meshStandardMaterial color="#FB923C" />
            </mesh>
          </group>
        )}
      </group>

      {/* Floating Holographic Laptop when Working */}
      {employee.state === 'working' && (
        <group ref={laptopRef} position={[0, 0.78, 0.36]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.34, 0.02, 0.24]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.7} roughness={0.2} />
          </mesh>
          <group position={[0, 0.1, 0.11]} rotation={[-0.35, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.34, 0.22, 0.018]} />
              <meshStandardMaterial color="#1E293B" metalness={0.5} />
            </mesh>
            <mesh position={[0, 0, -0.011]}>
              <planeGeometry args={[0.3, 0.18]} />
              <meshStandardMaterial
                color={employee.avatarColor}
                emissive={employee.avatarColor}
                emissiveIntensity={1.1}
              />
            </mesh>
          </group>
        </group>
      )}

      {/* Articulated Head + Facial Features + Hair + AI Headset */}
      <group ref={headGroupRef} position={[0, 1.12, 0]}>
        <RoundedBox
          args={[0.36, 0.36, 0.36]}
          radius={0.09}
          smoothness={1}
          castShadow={!lowQuality}
          material={SHARED_MATERIALS.skin}
        />

        <mesh
          position={[-0.19, 0, 0]}
          geometry={SHARED_GEOMETRIES.earSphere}
          material={SHARED_MATERIALS.earSkin}
        />
        <mesh
          position={[0.19, 0, 0]}
          geometry={SHARED_GEOMETRIES.earSphere}
          material={SHARED_MATERIALS.earSkin}
        />

        {/* Eyes */}
        <mesh
          position={[-0.08, 0.03, 0.182]}
          geometry={SHARED_GEOMETRIES.eyeSphere}
          material={SHARED_MATERIALS.eyeDark}
        />
        <mesh
          position={[-0.072, 0.04, 0.212]}
          geometry={SHARED_GEOMETRIES.pupilShine}
          material={SHARED_MATERIALS.whiteBasic}
        />
        <mesh
          position={[0.08, 0.03, 0.182]}
          geometry={SHARED_GEOMETRIES.eyeSphere}
          material={SHARED_MATERIALS.eyeDark}
        />
        <mesh
          position={[0.088, 0.04, 0.212]}
          geometry={SHARED_GEOMETRIES.pupilShine}
          material={SHARED_MATERIALS.whiteBasic}
        />

        {/* Eyebrows */}
        <mesh
          position={[-0.08, 0.095, 0.182]}
          rotation={[0, 0, 0.08]}
          geometry={SHARED_GEOMETRIES.eyebrowBox}
        >
          <meshStandardMaterial color={employee.hairColor} />
        </mesh>
        <mesh
          position={[0.08, 0.095, 0.182]}
          rotation={[0, 0, -0.08]}
          geometry={SHARED_GEOMETRIES.eyebrowBox}
        >
          <meshStandardMaterial color={employee.hairColor} />
        </mesh>

        {/* Cheeks & Smile */}
        <mesh
          position={[-0.12, -0.03, 0.182]}
          geometry={SHARED_GEOMETRIES.cheekCircle}
          material={SHARED_MATERIALS.cheekPink}
        />
        <mesh
          position={[0.12, -0.03, 0.182]}
          geometry={SHARED_GEOMETRIES.cheekCircle}
          material={SHARED_MATERIALS.cheekPink}
        />
        <mesh
          position={[0, -0.06, 0.183]}
          geometry={SHARED_GEOMETRIES.smileBox}
          material={SHARED_MATERIALS.smileRed}
        />

        {/* Hair */}
        <RoundedBox
          args={[0.4, 0.13, 0.4]}
          radius={0.04}
          smoothness={1}
          position={[0, 0.17, -0.01]}
        >
          <meshStandardMaterial color={employee.hairColor} roughness={0.6} />
        </RoundedBox>
        <mesh
          position={[0, 0.13, 0.17]}
          rotation={[0.2, 0, 0]}
          geometry={SHARED_GEOMETRIES.fringeBox}
        >
          <meshStandardMaterial color={employee.hairColor} />
        </mesh>

        {/* AR Visor for Leads */}
        {isLead && (
          <mesh position={[0, 0.035, 0.195]} geometry={SHARED_GEOMETRIES.visorBox}>
            <meshStandardMaterial
              color={employee.avatarColor}
              emissive={employee.avatarColor}
              emissiveIntensity={0.45}
              transparent
              opacity={0.75}
            />
          </mesh>
        )}

        {/* AI Headset */}
        <mesh
          position={[0, 0.06, 0]}
          geometry={SHARED_GEOMETRIES.headsetArc}
          material={SHARED_MATERIALS.headsetBand}
        />
        <mesh
          position={[-0.21, 0.01, 0]}
          rotation={[0, 0, Math.PI / 2]}
          geometry={SHARED_GEOMETRIES.earCup}
        >
          <meshStandardMaterial
            color={employee.avatarColor}
            emissive={employee.avatarColor}
            emissiveIntensity={0.7}
          />
        </mesh>
        <mesh
          position={[0.21, 0.01, 0]}
          rotation={[0, 0, Math.PI / 2]}
          geometry={SHARED_GEOMETRIES.earCup}
        >
          <meshStandardMaterial
            color={employee.avatarColor}
            emissive={employee.avatarColor}
            emissiveIntensity={0.7}
          />
        </mesh>
      </group>

      {/* Lightweight Floating 2D Label (No backdrop-blur inside 3D DOM to guarantee 55-60 FPS) */}
      <Html position={[0, 1.72, 0]} center distanceFactor={22} zIndexRange={[10, 0]}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            focusOnEmployee(employee.id, true);
          }}
          className="cursor-pointer select-none flex flex-col items-center pointer-events-auto"
        >
          {(employee.errorText || employee.chatBubble) && (
            <div
              className={`mb-1 px-2.5 py-1 rounded-lg text-[11px] font-medium max-w-[215px] text-center shadow-md border ${
                employee.errorText
                  ? 'bg-[#EF4444] text-white border-red-300'
                  : 'bg-[#0F172A]/95 text-[#F8FAFC] border-slate-600'
              }`}
            >
              {employee.errorText ? `⚠️ ${employee.errorText}` : employee.chatBubble}
            </div>
          )}

          {employee.state === 'working' && (
            <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1 border border-slate-600">
              <div
                className="h-full bg-[#22C55E]"
                style={{ width: `${Math.max(15, employee.taskProgress)}%` }}
              />
            </div>
          )}

          <div
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 border shadow-sm whitespace-nowrap ${
              isSelected
                ? 'bg-[#22C55E] text-[#0F172A] border-white'
                : employee.enabled === false
                ? 'bg-slate-950/90 text-amber-300 border-amber-500/60 opacity-80'
                : 'bg-[#0F172A]/92 text-[#F8FAFC] border-slate-700'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor:
                  employee.enabled === false
                    ? '#F59E0B'
                    : employee.errorText
                    ? '#EF4444'
                    : stateBadgeColors[employee.state],
              }}
            />
            <span>{employee.name}</span>
            {employee.enabled === false ? (
              <span className="px-1 py-0.2 rounded bg-amber-500/25 text-amber-300 text-[8px] font-extrabold">
                OFF
              </span>
            ) : (
              <span className="opacity-70 text-[9px] font-mono">
                ({formatProviderModel(employee.provider, employee.model)})
              </span>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
});

/**
 * Unique Rooftop & Architectural Props per Department ID
 */
const DepartmentRooftopProp: React.FC<{ deptId: DepartmentId; color: string; height: number }> =
  React.memo(({ deptId, color, height }) => {
    const propRef = useRef<THREE.Group>(null);

    useFrame((state) => {
      if (!propRef.current) return;
      const t = state.clock.getElapsedTime();
      propRef.current.rotation.y = t * 0.65;
      propRef.current.position.y = height + 0.95 + Math.sin(t * 2.2) * 0.08;
    });

    switch (deptId) {
      case 'MKT-DIRECTOR':
        return (
          <group position={[0, height + 0.35, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
              <ringGeometry args={[1.2, 1.45, 24]} />
              <meshBasicMaterial color="#22C55E" side={THREE.DoubleSide} />
            </mesh>
            <group ref={propRef} position={[0, 1.2, 0]}>
              <mesh>
                <octahedronGeometry args={[0.75, 0]} />
                <meshStandardMaterial
                  color="#22C55E"
                  emissive="#22C55E"
                  emissiveIntensity={0.85}
                  wireframe
                />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.42, 12, 12]} />
                <meshStandardMaterial color="#4ADE80" emissive="#22C55E" emissiveIntensity={0.6} />
              </mesh>
              <mesh rotation={[Math.PI / 3, 0, 0]}>
                <torusGeometry args={[1.05, 0.035, 6, 24]} />
                <meshStandardMaterial color="#F8FAFC" emissive="#22C55E" emissiveIntensity={0.7} />
              </mesh>
            </group>
          </group>
        );

      case 'PLANNER':
        return (
          <group position={[0, height + 0.32, 0]}>
            {[-0.6, -0.2, 0.2, 0.6].map((x, idx) => {
              const barH = 0.35 + idx * 0.24;
              return (
                <mesh key={idx} position={[x, barH / 2, 0]}>
                  <boxGeometry args={[0.24, barH, 0.24]} />
                  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
                </mesh>
              );
            })}
            <group ref={propRef} position={[0.6, 1.35, 0]}>
              <mesh>
                <octahedronGeometry args={[0.28, 0]} />
                <meshStandardMaterial color="#60A5FA" emissive="#3B82F6" emissiveIntensity={0.9} />
              </mesh>
            </group>
          </group>
        );

      case 'RESEARCH':
        return (
          <group ref={propRef} position={[0, height + 0.9, 0]}>
            <mesh rotation={[0.5, 0, 0]}>
              <coneGeometry args={[0.85, 0.45, 16, 1, true]} />
              <meshStandardMaterial
                color="#E2E8F0"
                metalness={0.6}
                roughness={0.2}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 0.3, 0.15]}>
              <sphereGeometry args={[0.16, 10, 10]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
            </mesh>
          </group>
        );

      case 'CONTENT':
        return (
          <group ref={propRef} position={[0, height + 0.95, 0]}>
            <mesh rotation={[0, 0, -0.35]}>
              <coneGeometry args={[0.28, 1.3, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} />
            </mesh>
            <mesh position={[0.45, 0, 0]}>
              <boxGeometry args={[0.65, 0.85, 0.06]} />
              <meshStandardMaterial color="#F8FAFC" emissive={color} emissiveIntensity={0.35} />
            </mesh>
          </group>
        );

      case 'DESIGN':
        return (
          <group ref={propRef} position={[0, height + 1.0, 0]}>
            <mesh>
              <torusKnotGeometry args={[0.42, 0.12, 32, 8]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.6}
                metalness={0.4}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0.75, 0.2, 0]}>
              <sphereGeometry args={[0.16, 10, 10]} />
              <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={0.8} />
            </mesh>
            <mesh position={[-0.75, -0.1, 0]}>
              <sphereGeometry args={[0.16, 10, 10]} />
              <meshStandardMaterial color="#FACC15" emissive="#FACC15" emissiveIntensity={0.8} />
            </mesh>
          </group>
        );

      case 'VIDEO':
        return (
          <group ref={propRef} position={[0, height + 0.9, 0]}>
            <mesh>
              <boxGeometry args={[0.75, 0.48, 0.45]} />
              <meshStandardMaterial color="#1E293B" metalness={0.6} />
            </mesh>
            <mesh position={[0.48, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.2, 0.15, 0.35, 12]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
            </mesh>
            <mesh position={[-0.15, 0.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.1, 12]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0.2, 0.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.1, 12]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        );

      case 'OPS':
        return (
          <group ref={propRef} position={[0, height + 0.95, 0]}>
            <mesh>
              <torusGeometry args={[0.55, 0.12, 8, 20]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
            </mesh>
            <mesh rotation={[0, 0, 0.5]}>
              <boxGeometry args={[0.08, 0.45, 0.08]} />
              <meshStandardMaterial color="#F8FAFC" />
            </mesh>
            <mesh rotation={[0, 0, -1.1]}>
              <boxGeometry args={[0.08, 0.32, 0.08]} />
              <meshStandardMaterial color="#22C55E" />
            </mesh>
          </group>
        );

      case 'COMMUNITY':
        return (
          <group ref={propRef} position={[0, height + 0.95, 0]}>
            <RoundedBox args={[0.95, 0.6, 0.22]} radius={0.14} smoothness={1}>
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} />
            </RoundedBox>
            {[-0.22, 0, 0.22].map((x, idx) => (
              <mesh key={idx} position={[x, 0, 0.13]}>
                <sphereGeometry args={[0.07, 8, 8]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
            ))}
          </group>
        );

      case 'QA-QC':
        return (
          <group ref={propRef} position={[0, height + 0.95, 0]}>
            <mesh>
              <octahedronGeometry args={[0.62, 0]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.78, 0.04, 6, 20]} />
              <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={0.8} />
            </mesh>
          </group>
        );
    }
  });

/**
 * Richly Detailed Multi-Tiered 3D Building Mesh (Memoized)
 */
const DepartmentBuilding3D: React.FC<{
  building: DepartmentBuilding;
  employeeCount: number;
  isSelected: boolean;
  lowQuality: boolean;
}> = React.memo(({ building, employeeCount, isSelected, lowQuality }) => {
  const focusOnDepartment = useCompanyStore((s) => s.focusOnDepartment);
  const retryDepartmentTask = useCompanyStore((s) => s.retryDepartmentTask);
  const lang = useCompanyStore((s) => s.lang);
  const isHQ = building.id === 'MKT-DIRECTOR';

  const width = isHQ ? 5.6 : 3.9;
  const height = isHQ ? 5.2 : 3.4;
  const depth = isHQ ? 5.6 : 3.9;
  const floors = isHQ ? 4 : 3;

  const badgeStyles = {
    idle: 'bg-slate-800 text-slate-300 border-slate-600',
    working: 'bg-emerald-950 text-[#22C55E] border-[#22C55E]',
    error: 'bg-red-950 text-red-300 border-red-500',
  };

  return (
    <group
      position={building.position}
      onClick={(e) => {
        e.stopPropagation();
        focusOnDepartment(building.id);
      }}
    >
      {/* 1. Stepped Plaza Foundation */}
      <mesh position={[0, 0.08, 0]} receiveShadow={!lowQuality}>
        <boxGeometry args={[width + 1.5, 0.16, depth + 1.5]} />
        <meshStandardMaterial color={isSelected ? '#22C55E' : '#1E293B'} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[width + 0.7, 0.12, depth + 0.7]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>

      {/* Entrance Steps & Glowing Welcome Mat */}
      <mesh position={[0, 0.14, depth / 2 + 0.55]}>
        <boxGeometry args={[1.6, 0.14, 0.6]} />
        <meshStandardMaterial
          color={building.color}
          emissive={building.color}
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* 2. Main Architectural Core */}
      <RoundedBox
        args={[width, height, depth]}
        radius={0.14}
        smoothness={1}
        position={[0, height / 2 + 0.26, 0]}
        castShadow={!lowQuality}
        receiveShadow={!lowQuality}
      >
        <meshStandardMaterial color="#1B2336" roughness={0.32} metalness={0.3} />
      </RoundedBox>

      {/* 3. Corner Structural Pillars */}
      {[
        [-width / 2, -depth / 2],
        [width / 2, -depth / 2],
        [-width / 2, depth / 2],
        [width / 2, depth / 2],
      ].map(([px, pz], idx) => (
        <mesh key={idx} position={[px, height / 2 + 0.26, pz]}>
          <boxGeometry args={[0.28, height + 0.08, 0.28]} />
          <meshStandardMaterial color="#334155" metalness={0.45} roughness={0.3} />
        </mesh>
      ))}

      {/* 4. Multi-Floor Louvers & Illuminated Window Strips */}
      {Array.from({ length: floors }).map((_, fIdx) => {
        const yPos = 1.05 + fIdx * 1.05;
        const glow = building.status === 'working' ? 0.95 : 0.32;
        return (
          <group key={fIdx} position={[0, yPos, 0]}>
            <mesh>
              <boxGeometry args={[width + 0.16, 0.1, depth + 0.16]} />
              <meshStandardMaterial color="#0F172A" metalness={0.5} />
            </mesh>
            <mesh position={[0, 0.34, depth / 2 + 0.015]}>
              <planeGeometry args={[width * 0.82, 0.52]} />
              <meshStandardMaterial
                color={building.color}
                emissive={building.color}
                emissiveIntensity={glow}
                transparent
                opacity={0.78}
              />
            </mesh>
            <mesh position={[0, 0.34, -depth / 2 - 0.015]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[width * 0.82, 0.52]} />
              <meshStandardMaterial
                color={building.color}
                emissive={building.color}
                emissiveIntensity={glow * 0.8}
                transparent
                opacity={0.7}
              />
            </mesh>
            <mesh position={[-width / 2 - 0.015, 0.34, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[depth * 0.82, 0.52]} />
              <meshStandardMaterial
                color={building.color}
                emissive={building.color}
                emissiveIntensity={glow * 0.8}
                transparent
                opacity={0.7}
              />
            </mesh>
            <mesh position={[width / 2 + 0.015, 0.34, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[depth * 0.82, 0.52]} />
              <meshStandardMaterial
                color={building.color}
                emissive={building.color}
                emissiveIntensity={glow * 0.8}
                transparent
                opacity={0.7}
              />
            </mesh>
          </group>
        );
      })}

      {/* 5. Front Entrance Double Glass Doors + Overhang Canopy */}
      <group position={[0, 0.26, depth / 2 + 0.02]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[1.3, 1.1, 0.08]} />
          <meshStandardMaterial
            color="#E2E8F0"
            emissive={building.color}
            emissiveIntensity={0.6}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh position={[0, 1.18, 0.35]}>
          <boxGeometry args={[1.9, 0.12, 0.8]} />
          <meshStandardMaterial color={building.color} />
        </mesh>
      </group>

      {/* 6. Rooftop Parapet Crown + Solar Panels & HVAC Units */}
      <mesh position={[0, height + 0.32, 0]}>
        <boxGeometry args={[width + 0.3, 0.24, depth + 0.3]} />
        <meshStandardMaterial
          color={building.status === 'error' ? '#EF4444' : building.color}
          emissive={building.status === 'working' ? building.color : '#000000'}
          emissiveIntensity={building.status === 'working' ? 0.65 : 0.15}
        />
      </mesh>
      <mesh position={[-width * 0.28, height + 0.55, -depth * 0.25]}>
        <boxGeometry args={[0.7, 0.35, 0.7]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[width * 0.28, height + 0.5, -depth * 0.25]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[0.85, 0.08, 0.65]} />
        <meshStandardMaterial color="#0284C7" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* 7. Unique Animated Department Rooftop Prop */}
      <DepartmentRooftopProp deptId={building.id} color={building.color} height={height} />

      {/* 8. Billboard Floating Info Card (No heavy CSS blur inside 3D DOM for high FPS) */}
      <Html
        position={[0, height + (isHQ ? 3.1 : 2.15), 0]}
        center
        distanceFactor={25}
        zIndexRange={[20, 0]}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            focusOnDepartment(building.id);
          }}
          className={`cursor-pointer select-none rounded-xl px-3 py-2 min-w-[175px] border transition-colors shadow-lg ${
            isSelected
              ? 'bg-[#1E293B] border-[#22C55E] ring-2 ring-[#22C55E]/40'
              : 'bg-[#0F172A]/95 border-slate-700 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold tracking-wide text-white flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: building.color }}
              />
              {building.shortName}
            </span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase ${
                badgeStyles[building.status]
              }`}
            >
              {building.status}
            </span>
          </div>

          <div className="text-[11px] text-slate-300 truncate mb-1.5">
            {lang === 'vi' ? building.roleVi : building.roleEn}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>
              {employeeCount} {lang === 'vi' ? 'nhân sự AI' : 'AI agents'}
            </span>
            {building.activationPolicy === 'on_demand_only' && (
              <span className="text-amber-400 font-medium">Quota Guard</span>
            )}
            {isHQ && (
              <span className="text-[#22C55E] font-semibold">
                {lang === 'vi' ? 'Bấm giao Task →' : 'Assign Task →'}
              </span>
            )}
          </div>

          {building.status === 'working' && (
            <div className="mt-1.5 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#22C55E] h-full transition-all duration-300"
                style={{ width: `${Math.max(12, building.progress)}%` }}
              />
            </div>
          )}

          {building.status === 'error' && (
            <div className="mt-1.5 space-y-1">
              {building.lastErrorCode && (
                <div className="px-1.5 py-0.5 rounded bg-red-950 border border-red-400 text-red-200 font-mono text-[9px] font-bold text-center truncate">
                  📌 {building.lastErrorCode}
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  retryDepartmentTask(building.id);
                }}
                className="w-full py-1 rounded bg-red-500 hover:bg-red-600 text-white text-[10px] font-semibold cursor-pointer"
              >
                {lang === 'vi' ? 'Thử lại (Retry)' : 'Retry Task'}
              </button>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
});

/**
 * Richly Detailed 3D Canteen & AI Lounge Area (Memoized)
 */
const CanteenZone3D: React.FC<{ lowQuality: boolean }> = React.memo(({ lowQuality }) => {
  const lang = useCompanyStore((s) => s.lang);
  const setCameraTarget = useCompanyStore((s) => s.setCameraTarget);

  return (
    <group
      position={CANTEEN_POSITION}
      onClick={(e) => {
        e.stopPropagation();
        setCameraTarget([CANTEEN_POSITION[0], 0, CANTEEN_POSITION[2]]);
      }}
    >
      {/* Main Terrazzo Deck Platform */}
      <mesh position={[0, 0.08, 0]} receiveShadow={!lowQuality}>
        <boxGeometry args={[13.5, 0.16, 8.5]} />
        <meshStandardMaterial color="#1E293B" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <boxGeometry args={[13.1, 0.04, 8.1]} />
        <meshStandardMaterial color="#334155" roughness={0.45} />
      </mesh>

      {/* Pergola Support Pillars & String-Light Roof */}
      {[
        [-5.6, -3.2],
        [5.6, -3.2],
        [-5.6, -0.4],
        [5.6, -0.4],
      ].map(([px, pz], idx) => (
        <mesh key={idx} position={[px, 1.75, pz]}>
          <cylinderGeometry args={[0.12, 0.12, 3.3, 8]} />
          <meshStandardMaterial color="#78350F" />
        </mesh>
      ))}
      <mesh position={[0, 3.4, -1.8]} castShadow={!lowQuality}>
        <boxGeometry args={[12.2, 0.22, 3.8]} />
        <meshStandardMaterial color="#F59E0B" roughness={0.35} />
      </mesh>
      {[-4, -2, 0, 2, 4].map((lx, idx) => (
        <mesh key={idx} position={[lx, 3.22, -1.8]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#FEF08A" emissive="#F59E0B" emissiveIntensity={1.2} />
        </mesh>
      ))}
      <pointLight position={[0, 2.8, -1.2]} intensity={0.85} color="#FBBF24" distance={14} />

      {/* Kitchen & Espresso Bar Counter */}
      <RoundedBox
        args={[8.2, 1.15, 1.3]}
        radius={0.08}
        smoothness={1}
        position={[0, 0.72, -2.2]}
        castShadow={!lowQuality}
      >
        <meshStandardMaterial color="#334155" roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 1.32, -2.2]}>
        <boxGeometry args={[8.4, 0.08, 1.4]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.2} />
      </mesh>

      {/* Espresso Machine & Cooking Pot */}
      <mesh position={[-2.2, 1.68, -2.2]}>
        <boxGeometry args={[0.9, 0.65, 0.7]} />
        <meshStandardMaterial color="#DC2626" metalness={0.5} roughness={0.25} />
      </mesh>
      <mesh position={[0.4, 1.55, -2.2]}>
        <cylinderGeometry args={[0.35, 0.3, 0.4, 10]} />
        <meshStandardMaterial color="#94A3B8" metalness={0.7} />
      </mesh>

      {/* Beverage Vending Fridge */}
      <group position={[5.1, 1.35, -2.2]}>
        <RoundedBox args={[1.3, 2.3, 1.1]} radius={0.08} smoothness={1}>
          <meshStandardMaterial color="#0F172A" />
        </RoundedBox>
        <mesh position={[0, 0.1, 0.56]}>
          <planeGeometry args={[1.0, 1.7]} />
          <meshStandardMaterial color="#38BDF8" emissive="#0284C7" emissiveIntensity={0.75} />
        </mesh>
      </group>

      {/* 3 Dining Tables + Parasol Umbrellas + 4 Stools Each */}
      {[-3.6, 0, 3.6].map((xOffset, idx) => (
        <group key={idx} position={[xOffset, 0.18, 1.45]}>
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry args={[1.15, 1.15, 0.1, 14]} />
            <meshStandardMaterial color="#F59E0B" roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.14, 0.25, 0.6, 8]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh position={[0, 1.45, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1.7, 6]} />
            <meshStandardMaterial color="#E2E8F0" />
          </mesh>
          <mesh position={[0, 2.3, 0]} castShadow={!lowQuality}>
            <coneGeometry args={[1.45, 0.55, 8]} />
            <meshStandardMaterial color={idx === 1 ? '#22C55E' : '#F97316'} roughness={0.5} />
          </mesh>
          {[
            [-1.35, 0],
            [1.35, 0],
            [0, -1.35],
            [0, 1.35],
          ].map(([sx, sz], sIdx) => (
            <mesh key={sIdx} position={[sx, 0.32, sz]}>
              <cylinderGeometry args={[0.28, 0.24, 0.42, 8]} />
              <meshStandardMaterial color="#1E293B" />
            </mesh>
          ))}
          <mesh position={[0.35, 0.69, 0.2]}>
            <cylinderGeometry args={[0.2, 0.16, 0.03, 10]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[-0.3, 0.72, -0.25]}>
            <cylinderGeometry args={[0.08, 0.07, 0.14, 8]} />
            <meshStandardMaterial color="#38BDF8" />
          </mesh>
        </group>
      ))}

      {/* Canteen Billboard */}
      <Html position={[0, 4.35, -1.8]} center distanceFactor={25} zIndexRange={[15, 0]}>
        <div className="cursor-pointer select-none px-3 py-1.5 rounded-xl bg-amber-500 text-[#0F172A] font-bold text-xs shadow-md border border-amber-200 whitespace-nowrap">
          {lang === 'vi'
            ? '☕ CĂNG-TIN AI & KHU NGHỈ NGƠI (Idle / Cooking / Chat)'
            : '☕ AI CANTEEN & LOUNGE (Rest / Cooking / Chat)'}
        </div>
      </Html>
    </group>
  );
});

/**
 * Instanced Low-Poly Trees for 60 FPS Optimization
 */
const CampusTreesInstanced: React.FC<{ lowQuality: boolean }> = React.memo(({ lowQuality }) => {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const foliageBottomRef = useRef<THREE.InstancedMesh>(null);
  const foliageTopRef = useRef<THREE.InstancedMesh>(null);

  const treeCoords = useMemo<[number, number, number][]>(
    () => [
      [-21, 0, -18],
      [-22, 0, -6],
      [-22, 0, 8],
      [-19, 0, 20],
      [21, 0, -18],
      [22, 0, -6],
      [22, 0, 8],
      [19, 0, 20],
      [-8, 0, 25],
      [8, 0, 25],
      [-16, 0, -19],
      [16, 0, -19],
      [-6, 0, -21],
      [6, 0, -21],
    ],
    []
  );

  useEffect(() => {
    const dummy = new THREE.Object3D();
    treeCoords.forEach(([x, y, z], i) => {
      dummy.position.set(x, y + 0.5, z);
      dummy.updateMatrix();
      trunkRef.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 1.35, z);
      dummy.updateMatrix();
      foliageBottomRef.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, y + 2.1, z);
      dummy.updateMatrix();
      foliageTopRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
    if (foliageBottomRef.current) foliageBottomRef.current.instanceMatrix.needsUpdate = true;
    if (foliageTopRef.current) foliageTopRef.current.instanceMatrix.needsUpdate = true;
  }, [treeCoords]);

  return (
    <group>
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, treeCoords.length]}
        castShadow={!lowQuality}
      >
        <cylinderGeometry args={[0.14, 0.22, 1, 6]} />
        <meshStandardMaterial color="#78350F" />
      </instancedMesh>
      <instancedMesh
        ref={foliageBottomRef}
        args={[undefined, undefined, treeCoords.length]}
        castShadow={!lowQuality}
      >
        <coneGeometry args={[0.95, 1.4, 6]} />
        <meshStandardMaterial color="#15803D" roughness={0.55} />
      </instancedMesh>
      <instancedMesh
        ref={foliageTopRef}
        args={[undefined, undefined, treeCoords.length]}
        castShadow={!lowQuality}
      >
        <coneGeometry args={[0.7, 1.2, 6]} />
        <meshStandardMaterial color="#22C55E" roughness={0.5} />
      </instancedMesh>
    </group>
  );
});

/**
 * Smooth Camera Rig synced to Zustand cameraTarget
 */
const CameraRig: React.FC = () => {
  const cameraTarget = useCompanyStore((s) => s.cameraTarget);
  const controlsRef = useRef<any>(null);
  const targetVec = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!controlsRef.current) return;
    targetVec.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
    controlsRef.current.target.lerp(targetVec, 0.08);
    controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      zoomSpeed={1.25}
      minDistance={5}
      maxDistance={115}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  );
};

export const CompanyCampus3D: React.FC = () => {
  const departments = useCompanyStore((s) => s.departments);
  const employees = useCompanyStore((s) => s.employees);
  const selectedDepartmentId = useCompanyStore((s) => s.selectedDepartmentId);
  const selectedEmployeeId = useCompanyStore((s) => s.selectedEmployeeId);
  const lowQuality = useCompanyStore((s) => s.lowQuality);

  return (
    <div className="w-full h-full relative bg-[#0F172A]">
      <Canvas
        shadows={!lowQuality}
        dpr={lowQuality ? [1, 1] : [1, 1.35]}
        gl={{ antialias: !lowQuality, powerPreference: 'high-performance' }}
        camera={{ position: [0, 30, 42], fov: 45, near: 0.1, far: 300 }}
      >
        <color attach="background" args={['#0B1120']} />
        <fog attach="fog" args={['#0B1120', 75, 165]} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.85} />
        <directionalLight
          position={[18, 28, 16]}
          intensity={1.35}
          castShadow={!lowQuality}
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
        />
        <pointLight position={[0, 9, 0]} intensity={0.8} color="#22C55E" distance={24} />

        {/* Ground Plane & Subtle Tech Grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow={!lowQuality}>
          <planeGeometry args={[220, 220]} />
          <meshStandardMaterial color="#0F172A" roughness={0.9} />
        </mesh>

        <Grid
          position={[0, 0.01, 0]}
          args={[160, 160]}
          cellSize={2}
          cellThickness={0.5}
          cellColor="#1E293B"
          sectionSize={10}
          sectionThickness={1}
          sectionColor="#334155"
          fadeDistance={130}
        />

        {/* Illuminated Circular Ring Road & Radial Pathways */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[7.8, 9.4, 48]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <ringGeometry args={[8.55, 8.65, 48]} />
          <meshBasicMaterial color="#22C55E" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 10.5]}>
          <planeGeometry args={[2.4, 21]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>

        {/* 9 Department Buildings */}
        {departments.map((dept) => {
          const count = employees.filter((e) => e.departmentId === dept.id).length;
          return (
            <DepartmentBuilding3D
              key={dept.id}
              building={dept}
              employeeCount={count}
              isSelected={selectedDepartmentId === dept.id}
              lowQuality={lowQuality}
            />
          );
        })}

        {/* Canteen & Lounge Area */}
        <CanteenZone3D lowQuality={lowQuality} />

        {/* 21 Detailed Autonomous 3D Employees */}
        {employees.map((emp) => (
          <EmployeeAvatar3D
            key={emp.id}
            employee={emp}
            buildings={departments}
            isSelected={selectedEmployeeId === emp.id}
            lowQuality={lowQuality}
          />
        ))}

        {/* Multi-Tiered Instanced Low-Poly Trees */}
        <CampusTreesInstanced lowQuality={lowQuality} />

        <CameraRig />
      </Canvas>
    </div>
  );
};
