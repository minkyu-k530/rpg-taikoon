import * as THREE from 'three';

type Part = { name: string; parent: string | null; joint: [number, number, number]; center: [number, number, number]; size: [number, number, number] };

const parts: Part[] = [
  { name: 'pelvis', parent: null, joint: [0, 0.75, 0], center: [0, 0.75, 0], size: [0.22, 0.13, 0.13] },
  { name: 'spine1', parent: 'pelvis', joint: [0, 0.17, 0], center: [0, 0.94, 0], size: [0.19, 0.2, 0.12] },
  { name: 'spine2', parent: 'spine1', joint: [0, 0.23, 0], center: [0, 1.17, 0], size: [0.23, 0.18, 0.12] },
  { name: 'neck', parent: 'spine2', joint: [0, 0.18, 0], center: [0, 1.38, 0], size: [0.075, 0.1, 0.075] },
  { name: 'head', parent: 'neck', joint: [0, 0.12, 0], center: [0, 1.56, 0], size: [0.14, 0.16, 0.13] },
  ...([-1, 1] as const).flatMap((side) => {
    const label = side < 0 ? 'L' : 'R';
    return [
      { name: `shoulder${label}`, parent: 'spine2', joint: [side * 0.25, 0.12, 0], center: [side * 0.27, 1.27, 0], size: [0.09, 0.1, 0.1] },
      { name: `upperArm${label}`, parent: `shoulder${label}`, joint: [side * 0.04, -0.09, 0], center: [side * 0.29, 1.08, 0], size: [0.085, 0.18, 0.08] },
      { name: `lowerArm${label}`, parent: `upperArm${label}`, joint: [0, -0.25, 0], center: [side * 0.29, 0.82, 0], size: [0.07, 0.16, 0.07] },
    ] as Part[];
  }),
  ...([-1, 1] as const).flatMap((side) => {
    const label = side < 0 ? 'L' : 'R';
    return [
      { name: `thigh${label}`, parent: 'pelvis', joint: [side * 0.12, -0.1, 0], center: [side * 0.12, 0.48, 0], size: [0.1, 0.28, 0.1] },
      { name: `shin${label}`, parent: `thigh${label}`, joint: [0, -0.35, 0], center: [side * 0.12, 0.15, 0], size: [0.08, 0.2, 0.08] },
    ] as Part[];
  }),
];

function segmentCount(target: number) {
  let best = 8;
  for (let s = 8; s <= 80; s++) {
    const count = parts.length * (s + 1) * (Math.floor(s / 2) + 1);
    if (Math.abs(count - target) < Math.abs(parts.length * (best + 1) * (Math.floor(best / 2) + 1) - target)) best = s;
  }
  return best;
}

export function createCharacterGeometry(targetVertices: number) {
  const segments = segmentCount(targetVertices);
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], indices: number[] = [];
  const skinIndices: number[] = [], skinWeights: number[] = [];
  for (const [boneIndex, part] of parts.entries()) {
    const primitive = new THREE.SphereGeometry(1, segments, Math.floor(segments / 2));
    const pos = primitive.getAttribute('position');
    const normal = primitive.getAttribute('normal');
    const uv = primitive.getAttribute('uv');
    const start = positions.length / 3;
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i) * part.size[0] + part.center[0], pos.getY(i) * part.size[1] + part.center[1], pos.getZ(i) * part.size[2] + part.center[2]);
      const nx = normal.getX(i) / part.size[0];
      const ny = normal.getY(i) / part.size[1];
      const nz = normal.getZ(i) / part.size[2];
      const length = Math.hypot(nx, ny, nz);
      normals.push(nx / length, ny / length, nz / length);
      uvs.push(uv.getX(i), uv.getY(i));
      skinIndices.push(boneIndex, 0, 0, 0);
      skinWeights.push(1, 0, 0, 0);
    }
    const index = primitive.getIndex()!;
    for (let i = 0; i < index.count; i++) indices.push(start + index.getX(i));
    primitive.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function walkingClip() {
  const tracks: THREE.KeyframeTrack[] = [];
  const times = [0, 0.25, 0.5, 0.75, 1];
  for (const [name, sign] of [['thighL', 1], ['thighR', -1], ['upperArmL', -1], ['upperArmR', 1]] as const) {
    tracks.push(new THREE.NumberKeyframeTrack(`${name}.rotation[x]`, times, [0, sign * 0.5, 0, -sign * 0.5, 0]));
  }
  for (const [name, sign] of [['shinL', 1], ['shinR', -1], ['lowerArmL', -1], ['lowerArmR', 1]] as const) {
    tracks.push(new THREE.NumberKeyframeTrack(`${name}.rotation[x]`, times, [0, sign * 0.2, 0, -sign * 0.2, 0]));
  }
  return new THREE.AnimationClip('walk', 1, tracks);
}

export const walkClip = walkingClip();

export function makeCharacter(geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial) {
  const bones = new Map<string, THREE.Bone>();
  for (const part of parts) {
    const bone = new THREE.Bone();
    bone.name = part.name;
    bone.position.set(...part.joint);
    bones.set(part.name, bone);
    if (part.parent) bones.get(part.parent)!.add(bone);
  }
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.castShadow = true;
  mesh.add(bones.get('pelvis')!);
  mesh.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(parts.map((part) => bones.get(part.name)!));
  mesh.bind(skeleton);
  const mixer = new THREE.AnimationMixer(mesh);
  mixer.clipAction(walkClip).play();
  return { mesh, mixer };
}
