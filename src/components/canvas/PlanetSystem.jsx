import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  LineBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from "three";

import { journeyChapters } from "../../journey/data";
import { CONNECTOR_ID, PLANET_TAG_ID, getLabel } from "../../journey/labels";
import {
  PLANET_SIZE,
  SATELLITE_SIZE,
  angularSpeed,
  createPlanets,
  ringAngle,
  rotateByTime,
  satellitePosition,
} from "../../journey/planets";
import { ringYaw } from "../../scroll/journeyPose";
import { galaxyDebug, rig } from "../../scroll/scrollRig";
import {
  beaconFragmentShader,
  beaconVertexShader,
  bodyFragmentShader,
  bodyVertexShader,
  haloFragmentShader,
  haloVertexShader,
  ringFragmentShader,
  ringVertexShader,
} from "./planetShaders";

const DEG = Math.PI / 180;
// 챕터별 2색. 기존 팔레트를 채도를 낮춰 쓴다.
const PALETTE = [
  ["#915EFF", "#f272c8"],
  ["#f272c8", "#ffe2b8"],
  ["#00cea8", "#56ccf2"],
  ["#56ccf2", "#915EFF"],
  ["#ffe2b8", "#00cea8"],
];
const DESATURATE = 0.35;
const RINGED = new Set([1, 3]);
const FRONT_SCALE = 1.5;
const SPIN_SPEED = 0.12;
// always 모드에서만 주는 고리 흔들림과 위성의 상하 움직임
const SWAY = 2.5 * DEG;
const BOB = 0.004;
const BEHIND_ALPHA = 0.6;
const LABEL_MARGIN = 8;
const ORBIT_SEGMENTS = 96;

const toned = (hex) => {
  const color = new Color(hex);
  const gray = (color.r + color.g + color.b) / 3;
  return color.lerp(new Color(gray, gray, gray), DESATURATE);
};

const smoothstep = (edge0, edge1, value) => {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};

// 위성 고리는 도착하는 챕터에서 펼쳐지고 떠나는 챕터에서 접힌다(다른 챕터는 행성만).
const systemScale = (journey, c) => {
  if (!journey || !journey.measured) return 0;
  if (c === journey.index) {
    return journey.phase === "travel" ? smoothstep(0.6, 1, journey.t) : 1;
  }
  if (c === journey.index - 1 && journey.phase === "travel") {
    return 1 - smoothstep(0, 0.4, journey.t);
  }
  return 0;
};

// 챕터 c 고리에서 앞 자리에 있는 위성 번호(연속값)
const ringProgress = (journey, c, count) => {
  if (!journey || c > journey.index) return 0;
  if (c < journey.index) return Math.max(count - 1, 0);
  return journey.ring;
};

const frontIndex = (journey, c) =>
  journey && c === journey.index && journey.phase === "item" ? journey.item : -1;

const createBody = (colorA, colorB, uniforms, detail) =>
  new ShaderMaterial({
    vertexShader: bodyVertexShader,
    fragmentShader: bodyFragmentShader,
    uniforms: {
      uColorA: { value: colorA },
      uColorB: { value: colorB },
      uLight: { value: new Vector3(0, 0, 1) },
      uDim: uniforms.uDim,
      uGlow: { value: 1 },
      uSpin: { value: 0 },
      uDetail: { value: detail },
    },
  });

const createHalo = (color, size, inner, strength, uniforms) =>
  new ShaderMaterial({
    vertexShader: haloVertexShader,
    fragmentShader: haloFragmentShader,
    uniforms: {
      uColor: { value: color },
      uSize: { value: size },
      uInner: { value: inner },
      uStrength: { value: strength },
      uDim: uniforms.uDim,
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

const createOrbitGeometry = (count) => {
  const points = [];
  for (let i = 0; i < ORBIT_SEGMENTS; i += 1) {
    const p = satellitePosition(count, 0, (i / ORBIT_SEGMENTS) * Math.PI * 2);
    points.push(p.x, p.y, p.z);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  return geometry;
};

// 챕터마다 은하 팔 위의 작은 행성, 위성 고리(회전목마), 비콘.
// 현재 챕터 위성의 화면 좌표를 라벨과 연결선에 쓴다.
const PlanetSystem = ({ uniforms }) => {
  const camera = useThree((state) => state.camera);
  const dpr = useThree((state) => state.viewport.dpr);
  const height = useThree((state) => state.size.height);
  const planetGroups = useRef([]);
  const systems = useRef([]);
  const satellites = useRef([]);
  const frontHalos = useRef([]);
  const sizeRef = useRef({ width: 1, height: 1 });
  const written = useRef(new Map());
  // 라벨 상자 반폭 캐시(뷰포트 폭이 바뀌거나 현재 위성이 바뀌면 다시 잰다)
  const halfWidths = useRef(new Map());
  const halfWidthKey = useRef({ width: 0, front: null });
  const lastTag = useRef(null);

  const planets = useMemo(() => createPlanets(journeyChapters.length), []);

  const resources = useMemo(() => {
    const planetGeometry = new SphereGeometry(PLANET_SIZE, 64, 40);
    const satelliteGeometry = new SphereGeometry(SATELLITE_SIZE, 24, 16);
    const haloGeometry = new PlaneGeometry(2, 2);
    const ringInner = PLANET_SIZE * 1.45;
    const ringOuter = PLANET_SIZE * 2.3;
    const ringGeometry = new RingGeometry(ringInner, ringOuter, 128);

    const chapters = journeyChapters.map((chapter, c) => {
      const [hexA, hexB] = PALETTE[c % PALETTE.length];
      const colorA = toned(hexA);
      const colorB = toned(hexB);
      const light = colorA.clone().lerp(new Color("#ffffff"), 0.55);
      const lighter = colorB.clone().lerp(new Color("#ffffff"), 0.7);
      return {
        planet: createBody(colorA, colorB, uniforms, 1),
        halo: createHalo(colorB.clone(), PLANET_SIZE * 1.8, 0.5, 0.55, uniforms),
        ring: RINGED.has(c)
          ? new ShaderMaterial({
              vertexShader: ringVertexShader,
              fragmentShader: ringFragmentShader,
              uniforms: {
                uColor: { value: lighter.clone() },
                uInnerRadius: { value: ringInner },
                uOuterRadius: { value: ringOuter },
                uDim: uniforms.uDim,
              },
              transparent: true,
              depthWrite: false,
              side: DoubleSide,
            })
          : null,
        orbit: createOrbitGeometry(chapter.items.length),
        orbitMaterial: new LineBasicMaterial({
          color: lighter,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        }),
        satellites: chapter.items.map(() => createBody(light, lighter, uniforms, 1.6)),
        frontHalo: createHalo(lighter.clone(), SATELLITE_SIZE * 4, 0.25, 0.9, uniforms),
      };
    });

    const beaconGeometry = new BufferGeometry();
    const positions = new Float32Array(planets.length * 3);
    const tints = new Float32Array(planets.length * 3);
    const indices = new Float32Array(planets.length);
    planets.forEach((planet, c) => {
      positions.set([planet.x, planet.y, planet.z], c * 3);
      const tint = toned(PALETTE[c % PALETTE.length][1]);
      tints.set([tint.r, tint.g, tint.b], c * 3);
      indices[c] = c;
    });
    beaconGeometry.setAttribute("position", new BufferAttribute(positions, 3));
    beaconGeometry.setAttribute("aTint", new BufferAttribute(tints, 3));
    beaconGeometry.setAttribute("aIndex", new BufferAttribute(indices, 1));
    const beaconMaterial = new ShaderMaterial({
      vertexShader: beaconVertexShader,
      fragmentShader: beaconFragmentShader,
      uniforms: {
        uTime: uniforms.uTime,
        uDim: uniforms.uDim,
        uScale: { value: 1 },
        uTarget: { value: -10 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    return {
      planetGeometry,
      satelliteGeometry,
      haloGeometry,
      ringGeometry,
      chapters,
      beaconGeometry,
      beaconMaterial,
    };
  }, [planets, uniforms]);

  useEffect(() => {
    resources.beaconMaterial.uniforms.uScale.value = height * dpr * 0.5;
  }, [resources, height, dpr]);

  useEffect(
    () => () => {
      [
        resources.planetGeometry,
        resources.satelliteGeometry,
        resources.haloGeometry,
        resources.ringGeometry,
        resources.beaconGeometry,
        resources.beaconMaterial,
      ].forEach((item) => item.dispose());
      resources.chapters.forEach((chapter) => {
        chapter.planet.dispose();
        chapter.halo.dispose();
        if (chapter.ring) chapter.ring.dispose();
        chapter.orbit.dispose();
        chapter.orbitMaterial.dispose();
        chapter.frontHalo.dispose();
        chapter.satellites.forEach((material) => material.dispose());
      });
    },
    [resources]
  );

  // 현재 챕터 위성의 화면 좌표(px). 라벨·연결선 쓰기와 디버그가 같은 계산을 쓴다.
  const projectSatellites = useMemo(() => {
    const world = new Vector3();
    const center = new Vector3();
    return (size) => {
      const journey = rig.journey;
      if (!journey) return [];
      const c = journey.index;
      const group = planetGroups.current[c];
      if (!group) return [];
      group.updateMatrixWorld(true);
      camera.updateMatrixWorld();
      group.getWorldPosition(center);
      const planetDistance = camera.position.distanceTo(center);
      const front = frontIndex(journey, c);
      return journeyChapters[c].items.map((item, i) => {
        const mesh = satellites.current[item.index];
        if (!mesh) return { id: item.id, x: 0, y: 0, visible: false };
        mesh.getWorldPosition(world);
        const distance = camera.position.distanceTo(world);
        world.project(camera);
        return {
          id: item.id,
          x: ((world.x + 1) / 2) * size.width,
          y: ((1 - world.y) / 2) * size.height,
          visible: world.z < 1,
          behind: distance > planetDistance,
          front: i === front,
          distance,
        };
      });
    };
  }, [camera]);

  useEffect(() => {
    galaxyDebug.satelliteScreens = () =>
      projectSatellites(sizeRef.current).map(({ id, x, y, behind, front }) => ({
        id,
        x,
        y,
        behind,
        front,
      }));
    galaxyDebug.frontScreen = () => {
      const front = projectSatellites(sizeRef.current).find((point) => point.front);
      if (!front) return null;
      const { width, height: h } = sizeRef.current;
      return { x: front.x, y: front.y, rx: front.x / width, ry: front.y / h };
    };
    return () => {
      galaxyDebug.satelliteScreens = () => [];
      galaxyDebug.frontScreen = () => null;
    };
  }, [projectSatellites]);

  const writeLabels = (points, size) => {
    const front = points.find((point) => point.front);
    const frontId = front ? front.id : null;
    const key = halfWidthKey.current;
    if (key.width !== size.width) {
      halfWidths.current.clear();
    } else if (key.front !== frontId) {
      // aria-current로 라벨 크기가 바뀐다.
      halfWidths.current.delete(key.front);
      halfWidths.current.delete(frontId);
    }
    halfWidthKey.current = { width: size.width, front: frontId };

    points.forEach((point) => {
      const element = getLabel(point.id);
      if (!element) return;
      const last = written.current.get(point.id) || {};
      const alpha = point.visible ? (point.behind ? BEHIND_ALPHA : 1) : 0;
      if (
        last.element !== element ||
        Math.abs(last.x - point.x) > 0.1 ||
        Math.abs(last.y - point.y) > 0.1
      ) {
        let half = halfWidths.current.get(point.id);
        if (!half) {
          // 숨은 라벨(반폭 0)은 캐시하지 않고 다음 프레임에 다시 잰다.
          half = (element.firstElementChild?.offsetWidth || 0) / 2;
          if (half) halfWidths.current.set(point.id, half);
        }
        // 라벨 상자만 화면 안으로 민다(기준점은 위성 위치 그대로).
        const min = (half || 0) + LABEL_MARGIN;
        const shift = Math.min(Math.max(point.x, min), size.width - min) - point.x;
        element.style.transform = `translate3d(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px, 0)`;
        element.style.setProperty("--dx", `${shift.toFixed(1)}px`);
        element.style.zIndex = String(Math.max(1, Math.round(1000 - point.distance * 400)));
      }
      if (last.alpha !== alpha) element.style.setProperty("--a", String(alpha));
      written.current.set(point.id, { element, x: point.x, y: point.y, alpha });
    });
  };

  // 챕터 이름표: 행성 중심의 화면 좌표에서 화면상 반지름만큼 아래(행성 아래 가장자리)
  const tagPoint = useMemo(() => {
    const center = new Vector3();
    const edge = new Vector3();
    const up = new Vector3();
    return (size) => {
      const journey = rig.journey;
      const group = journey && planetGroups.current[journey.index];
      if (!group) return null;
      group.getWorldPosition(center);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion).multiplyScalar(PLANET_SIZE);
      edge.copy(center).add(up).project(camera);
      center.project(camera);
      const x = ((center.x + 1) / 2) * size.width;
      const y = ((1 - center.y) / 2) * size.height;
      const radius = Math.abs(((1 - edge.y) / 2) * size.height - y);
      return { x, y: y + radius, radius, visible: center.z < 1 };
    };
  }, [camera]);

  const writeTag = (size) => {
    const element = getLabel(PLANET_TAG_ID);
    const point = tagPoint(size);
    if (!element || !point || !point.visible) return;
    const last = lastTag.current;
    if (
      last &&
      last.element === element &&
      Math.abs(last.x - point.x) <= 0.1 &&
      Math.abs(last.y - point.y) <= 0.1 &&
      Math.abs(last.radius - point.radius) <= 0.1
    ) {
      return;
    }
    element.style.transform = `translate3d(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px, 0)`;
    // 좁은 화면은 앞 위성이 행성 바로 아래에 오므로 CSS가 이름표를 행성 옆으로 옮긴다(--r 사용).
    element.style.setProperty("--r", `${point.radius.toFixed(1)}px`);
    lastTag.current = { element, ...point };
  };

  // 앞 위성 → 패널 가장자리 연결선(1px 폭 요소를 회전·확대)
  const writeConnector = (points) => {
    const element = getLabel(CONNECTOR_ID);
    const journey = rig.journey;
    if (!element || !journey) return;
    const front = points.find((point) => point.front && point.visible);
    if (!front) return;
    const anchor = journey.cardAnchor;
    const dx = anchor.x - front.x;
    const dy = anchor.y - front.y;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    element.style.transform = `translate3d(${front.x.toFixed(1)}px, ${front.y.toFixed(1)}px, 0) rotate(${angle.toFixed(4)}rad) scaleX(${length.toFixed(1)})`;
  };

  useFrame((state) => {
    const journey = rig.journey;
    const time = uniforms.uTime.value;
    const moving = state.frameloop === "always";
    // 항해가 떨어지면 분리된 DOM 노드 참조를 놓는다.
    if (!journey && written.current.size) {
      written.current.clear();
      halfWidths.current.clear();
      lastTag.current = null;
    }
    sizeRef.current = state.size;

    resources.beaconMaterial.uniforms.uTarget.value =
      journey && journey.measured ? journey.index : -10;

    journeyChapters.forEach((chapter, c) => {
      const group = planetGroups.current[c];
      const system = systems.current[c];
      if (!group || !system) return;
      const planet = planets[c];
      const p = rotateByTime(planet, time);
      group.position.set(p.x, p.y, p.z);
      // 행성의 은하 공전 좌표계: 카메라도 같은 회전을 따르므로 고리가 화면에서 흐르지 않는다.
      group.rotation.y = time * angularSpeed(planet.radius);

      const materials = resources.chapters[c];
      materials.planet.uniforms.uSpin.value = time * SPIN_SPEED;
      // 빛은 은하 중심 방향(살짝 위)에서 온다.
      const light = materials.planet.uniforms.uLight.value;
      light.set(-p.x, 0.25 * Math.hypot(p.x, p.z), -p.z).normalize();

      const scale = systemScale(journey, c);
      system.visible = scale > 0.001;
      if (!system.visible) return;
      system.scale.setScalar(scale);
      // 앞 자리 방향: 체류 카메라 방위(공전 좌표계 기준) + 오른쪽으로 돈 각도
      system.rotation.y = ringYaw(planet, rig.journeyView);

      const count = chapter.items.length;
      const angle =
        ringAngle(count, ringProgress(journey, c, count)) +
        (moving ? SWAY * Math.sin(time * 0.4 + c) : 0);
      const front = frontIndex(journey, c);
      chapter.items.forEach((item, i) => {
        const mesh = satellites.current[item.index];
        if (!mesh) return;
        const offset = satellitePosition(count, i, angle);
        const bob = moving ? BOB * Math.sin(time * 1.3 + i * 1.7) : 0;
        mesh.position.set(offset.x, offset.y + bob, offset.z);
        const isFront = i === front;
        mesh.scale.setScalar(isFront ? FRONT_SCALE : 1);
        mesh.material.uniforms.uGlow.value = isFront ? 1.35 : 1;
        mesh.material.uniforms.uLight.value.copy(light);
        mesh.material.uniforms.uSpin.value = time * SPIN_SPEED * 2;
        const halo = frontHalos.current[c];
        if (halo && isFront) halo.position.copy(mesh.position);
      });
      const halo = frontHalos.current[c];
      if (halo) halo.visible = front >= 0;
    });

    if (journey && journey.measured) {
      const points = projectSatellites(state.size);
      writeLabels(points, state.size);
      writeConnector(points);
      writeTag(state.size);
    }
  });

  return (
    <>
      <points
        geometry={resources.beaconGeometry}
        material={resources.beaconMaterial}
        frustumCulled={false}
      />
      {journeyChapters.map((chapter, c) => {
        const materials = resources.chapters[c];
        return (
          <group
            key={chapter.id}
            ref={(group) => {
              planetGroups.current[c] = group;
            }}
          >
            <mesh geometry={resources.planetGeometry} material={materials.planet} />
            <mesh
              geometry={resources.haloGeometry}
              material={materials.halo}
              frustumCulled={false}
            />
            {materials.ring && (
              <mesh
                geometry={resources.ringGeometry}
                material={materials.ring}
                rotation={[-Math.PI / 2 + 0.42, 0, 0.3]}
              />
            )}
            <group
              ref={(system) => {
                systems.current[c] = system;
              }}
            >
              <lineLoop geometry={materials.orbit} material={materials.orbitMaterial} />
              {chapter.items.map((item, i) => (
                <mesh
                  key={item.id}
                  ref={(mesh) => {
                    satellites.current[item.index] = mesh;
                  }}
                  geometry={resources.satelliteGeometry}
                  material={materials.satellites[i]}
                />
              ))}
              <mesh
                ref={(halo) => {
                  frontHalos.current[c] = halo;
                }}
                geometry={resources.haloGeometry}
                material={materials.frontHalo}
                frustumCulled={false}
              />
            </group>
          </group>
        );
      })}
    </>
  );
};

export default PlanetSystem;
