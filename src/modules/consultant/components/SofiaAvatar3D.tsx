import React, { Suspense, memo, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface SofiaAvatar3DProps {
  mouthOpen: number;
  isSpeaking: boolean;
  isHappy?: boolean;
  showHappyEmoticon?: boolean;
  emoticon?: string;
}

interface AvatarModelProps {
  mouthOpen: number;
  isSpeaking: boolean;
  isHappy: boolean;
}

const READY_PLAYER_ME_MODEL_URL = '/avatar-aHD9e6G2mY24yEpignYm.glb';

interface MorphBinding {
  mesh: THREE.Mesh;
  index: number;
  weight: number;
}

const getMorphWeight = (morphName: string): number => {
  const name = morphName.toLowerCase();
  if (name.includes('jawopen') || name.includes('mouthopen')) return 1;
  if (name.includes('viseme_aa') || name.includes('viseme_oh')) return 0.95;
  if (name.includes('viseme')) return 0.75;
  if (name.includes('mouth')) return 0.6;
  return 0.5;
};

const isRoundMouthMorph = (morphName: string): boolean => {
  return /(viseme_oh|viseme_o|viseme_u|mouthpucker|mouthfunnel|mouthshrug|mouthroll)/.test(morphName);
};

const getRoundMorphWeight = (morphName: string): number => {
  if (morphName.includes('viseme_oh') || morphName.includes('viseme_o')) return 1;
  if (morphName.includes('mouthpucker') || morphName.includes('mouthfunnel')) return 0.9;
  if (morphName.includes('viseme_u')) return 0.8;
  return 0.65;
};

const AvatarModel: React.FC<AvatarModelProps> = ({ mouthOpen, isSpeaking, isHappy }) => {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useLoader(GLTFLoader, READY_PLAYER_ME_MODEL_URL);
  const baseYRef = useRef(-3);

  const jawRef = useRef<THREE.Bone | null>(null);
  const headRef = useRef<THREE.Bone | null>(null);
  const cameraWorldRef = useRef(new THREE.Vector3());
  const headLocalCameraRef = useRef(new THREE.Vector3());

  const smoothMouthRef = useRef(0);
  const mouthPhaseRef = useRef(Math.random() * Math.PI * 2);
  const happyBlendRef = useRef(0);

  const { scene, mouthMorphs, roundMouthMorphs, happyMorphs } = useMemo(() => {
    const modelScene = gltf.scene;
    const mouth: MorphBinding[] = [];
    const roundMouth: MorphBinding[] = [];
    const happy: MorphBinding[] = [];

    modelScene.traverse((node) => {
      const object3D = node as THREE.Object3D;

      if ((object3D as THREE.Bone).isBone) {
        const bone = object3D as THREE.Bone;
        const lowerName = bone.name.toLowerCase();

        if (!jawRef.current && /(jaw|chin|mandible)/i.test(lowerName)) {
          jawRef.current = bone;
        }

        if (!headRef.current && /(head|neck)/i.test(lowerName)) {
          headRef.current = bone;
        }
      }

      if (!(object3D as THREE.Mesh).isMesh) return;

      const mesh = object3D as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

      Object.entries(mesh.morphTargetDictionary).forEach(([morphName, index]) => {
        const lowerName = morphName.toLowerCase();

        if (isRoundMouthMorph(lowerName)) {
          roundMouth.push({ mesh, index, weight: getRoundMorphWeight(lowerName) });
          return;
        }

        if (/(smile|mouthsmile)/.test(lowerName) && !/(frown|sad)/.test(lowerName)) {
          happy.push({ mesh, index, weight: 1 });
          return;
        }

        if (/(viseme|mouth|jawopen|mouthopen)/.test(lowerName) && !/(smile|frown|blink|brow|eye|pucker|funnel|roll|shrug)/.test(lowerName)) {
          mouth.push({ mesh, index, weight: getMorphWeight(lowerName) });
        }
      });
    });

    return {
      scene: modelScene,
      mouthMorphs: mouth,
      roundMouthMorphs: roundMouth,
      happyMorphs: happy,
    };
  }, [gltf.scene]);

  useFrame(({ clock, camera }, delta) => {
    const time = clock.elapsedTime;

    const targetMouth = Math.min(1, Math.max(0, mouthOpen)) * (isSpeaking ? 1 : 0.58);
    const attack = 1 - Math.exp(-delta * 16);
    const release = 1 - Math.exp(-delta * 9.5);
    const mouthResponse = targetMouth > smoothMouthRef.current ? attack : release;
    smoothMouthRef.current = THREE.MathUtils.lerp(smoothMouthRef.current, targetMouth, mouthResponse);

    let animatedMouth = smoothMouthRef.current;
    if (isSpeaking && smoothMouthRef.current > 0.04) {
      const syllableRate = THREE.MathUtils.lerp(6.4, 10.8, smoothMouthRef.current);
      mouthPhaseRef.current += delta * syllableRate * Math.PI * 2;

      const primaryFlap = 0.5 + 0.5 * Math.sin(mouthPhaseRef.current);
      const secondaryFlap = 0.5 + 0.5 * Math.sin(mouthPhaseRef.current * 2.15 + 0.9);
      const flapShape = 0.28 + primaryFlap * 0.44 + secondaryFlap * 0.22;
      const consonantPulse = 0.5 + 0.5 * Math.sin(mouthPhaseRef.current * 3.8 + 1.7);
      const closeGate = 0.2 + 0.8 * Math.pow(consonantPulse, 1.8);
      const openBoost = 1 + 0.38 * smoothMouthRef.current;

      animatedMouth = smoothMouthRef.current * flapShape * closeGate * openBoost;
    }

    animatedMouth = THREE.MathUtils.clamp(animatedMouth, 0, 1);

    const happyTarget = isHappy ? 1 : 0;
    happyBlendRef.current = THREE.MathUtils.lerp(happyBlendRef.current, happyTarget, 0.16);

    if (groupRef.current) {
      const breathingDepth = isSpeaking ? 0.012 : 0.009;
      const breathing = Math.sin(time * 1.45) * breathingDepth;
      const torsoSway = Math.sin(time * 0.72) * 0.006;

      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        baseYRef.current + breathing,
        0.12
      );
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, torsoSway, 0.1);
    }

    if (jawRef.current) {
      const desiredJawRotation = -0.03 - animatedMouth * 0.92;
      jawRef.current.rotation.x = THREE.MathUtils.lerp(jawRef.current.rotation.x, desiredJawRotation, 0.46);
    }

    if (headRef.current) {
      const headParent = headRef.current.parent;
      if (headParent) {
        camera.getWorldPosition(cameraWorldRef.current);
        headLocalCameraRef.current.copy(cameraWorldRef.current);
        headParent.worldToLocal(headLocalCameraRef.current);

        const targetYaw = THREE.MathUtils.clamp(
          Math.atan2(headLocalCameraRef.current.x, Math.max(0.001, headLocalCameraRef.current.z)),
          -0.45,
          0.45
        );
        const targetPitch = THREE.MathUtils.clamp(
          Math.atan2(headLocalCameraRef.current.y, Math.max(0.001, headLocalCameraRef.current.z)),
          -0.28,
          0.22
        );

        const naturalTurn = Math.sin(time * 0.42) * 0.012;
        const naturalNod = Math.sin(time * 0.95 + 0.35) * 0.01;
        const naturalTilt = Math.sin(time * 0.58 + 1.1) * 0.008;
        const happyHeadLift = happyBlendRef.current * 0.045;

        const desiredHeadY = targetYaw * 0.84 + naturalTurn;
        const desiredHeadX = -targetPitch * 0.55 + naturalNod - happyHeadLift;
        const desiredHeadZ = naturalTilt;

        headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, desiredHeadY, 0.16);
        headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, desiredHeadX, 0.16);
        headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, desiredHeadZ, 0.14);
      }
    }

    mouthMorphs.forEach(({ mesh, index, weight }) => {
      const current = mesh.morphTargetInfluences?.[index] ?? 0;
      const desired = animatedMouth * weight * 1.26;
      if (mesh.morphTargetInfluences) {
        mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(current, desired, 0.44);
      }
    });

    const roundShapeTarget = isSpeaking
      ? THREE.MathUtils.smoothstep(animatedMouth, 0.16, 0.78) * 1.1
      : 0;

    roundMouthMorphs.forEach(({ mesh, index, weight }) => {
      const current = mesh.morphTargetInfluences?.[index] ?? 0;
      const desired = roundShapeTarget * weight * 1.18;
      if (mesh.morphTargetInfluences) {
        mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(current, desired, 0.45);
      }
    });

    happyMorphs.forEach(({ mesh, index, weight }) => {
      const current = mesh.morphTargetInfluences?.[index] ?? 0;
      const desired = happyBlendRef.current * weight * 0.75;
      if (mesh.morphTargetInfluences) {
        mesh.morphTargetInfluences[index] = THREE.MathUtils.lerp(current, desired, 0.2);
      }
    });

  });

  return (
    <group ref={groupRef} position={[0, -3, 0]} scale={[2, 2, 2]}>
      <primitive object={scene} />
    </group>
  );
};

const SofiaAvatar3D: React.FC<SofiaAvatar3DProps> = ({
  mouthOpen,
  isSpeaking,
  isHappy = false,
  showHappyEmoticon = false,
  emoticon = '😊✨',
}) => {
  return (
    <div className="relative w-full max-w-[520px] aspect-[4/5]">
      <Canvas shadows camera={{ position: [0, 1.45, 2.2], fov: 29 }}>
        <color attach="background" args={['#ffffff']} />
        <ambientLight intensity={0.95} />
        <directionalLight position={[2.5, 3.2, 2.2]} intensity={1.35} castShadow />
        <directionalLight position={[-2.2, 1.8, 1.2]} intensity={0.55} />
        <Suspense fallback={null}>
          <AvatarModel mouthOpen={mouthOpen} isSpeaking={isSpeaking} isHappy={isHappy} />
        </Suspense>
      </Canvas>
      <div
        aria-hidden={!showHappyEmoticon}
        className={`pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-border bg-card/90 px-3 py-1 text-xl transition-opacity duration-150 ${
          showHappyEmoticon ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {emoticon}
      </div>
    </div>
  );
};

export default memo(SofiaAvatar3D);