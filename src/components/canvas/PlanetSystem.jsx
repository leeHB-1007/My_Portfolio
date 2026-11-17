import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
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
  SURFACE,
  atmosphereFragmentShader,
  atmosphereVertexShader,
  beaconFragmentShader,
  beaconVertexShader,
  bodyFragmentShader,
  bodyVertexShader,
  haloFragmentShader,
  haloVertexShader,
  orbitFragmentShader,
  orbitVertexShader,
  ringFragmentShader,
  ringVertexShader,
} from "./planetShaders";

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// 챕터별 행성(조정용). colors: 표면 3색, scale: 노이즈 스케일, atmosphere: 대기 색·두께(세기),
// ring: 장식 고리(행성 반지름 배수), glow: 균열 발광 색
const PLANET_STYLES = [
  {
    type: SURFACE.gas,
    colors: ["#43307f", "#9c63bf", "#ecc8ee"],
    rim: "#c49bff",
    atmosphere: { color: "#b48cff", strength: 0.9 },
    scale: 1,
  },
  {
    type: SURFACE.ringedGas,
    colors: ["#a8714f", "#e9c49b", "#fbeedb"],
    rim: "#ffd7b0",
    atmosphere: { color: "#ffd9b0", strength: 0.65 },
    scale: 1.2,
    ring: { inner: 1.45, outer: 2.4, color: "#efd9bb", opacity: 0.8, tilt: [-Math.PI / 2 + 0.42, 0, 0.3] },
  },
  {
    type: SURFACE.ocean,
    colors: ["#082f4f", "#1b7f8c", "#6d8a52"],
    rim: "#7fd4ff",
    atmosphere: { color: "#6fc4ff", strength: 1.05 },
    scale: 1,
  },
  {
    type: SURFACE.ice,
    colors: ["#1c3168", "#6c9cd6", "#d6e9ff"],
    rim: "#a8d6ff",
    atmosphere: { color: "#9fd0ff", strength: 1.45 },
    scale: 1,
    ring: { inner: 1.55, outer: 1.85, color: "#d3e6ff", opacity: 0.5, tilt: [-Math.PI / 2 + 0.3, 0, -0.25] },
  },
  {
    type: SURFACE.lava,
    colors: ["#26180f", "#6f5038", "#dcc29b"],
    rim: "#ffb070",
    atmosphere: { color: "#ffb070", strength: 0.45 },
    scale: 1,
    glow: "#ff7a2e",
  },
];
// 위성(작은 암석 달): 회색 바탕에 챕터 색을 조금 섞고, 항목마다 밝기·크기를 다르게
const MOON_BASE = "#8e8a96";
const MOON_TINT = 0.22;
const MOON_SIZE_VARIATION = 0.15;
const ATMOSPHERE_SCALE = 1.07;
const PLANET_HALO = { size: 1.6, inner: 0.55, strength: 0.32, flash: 1.6 };
// 앞 위성 강조: 크기, 림 라이트, 선택 고리
const FRONT_SCALE = 1.5;
const FRONT_RIM = 0.55;
const SELECT_RING = { size: 2.6, strength: 0.9, color: "#e8dcff" };
const SPIN_SPEED = 0.12;
// 라벨·목차 호버(포커스) 강조: 크기 배율, 림 밝기, 보간 속도(1/초). 앞 위성 강조가 우선한다.
const HOVER = { scale: 0.25, rim: 0.45, rate: 12 };
// always 모드에서만 주는 고리 흔들림과 위성의 상하 움직임
const SWAY = 2.5 * DEG;
const BOB = 0.004;
const BEHIND_ALPHA = 0.6;
const LABEL_MARGIN = 8;
const ORBIT_SEGMENTS = 192;
const ORBIT_OPACITY = 0.5;
// 태양 방향: 카메라 기준 왼쪽 위 앞(오른쪽·위·카메라 쪽 성분)
const SUN_FROM_CAMERA = { right: -0.62, up: 0.5, toward: 0.6 };
const CORE_TINT = "#ffcf9a";

const smoothstep = (edge0, edge1, value) => {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};

// 항목마다 고정된 0~1 값(크기·밝기 변화용)
const itemHash = (index, salt) => {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// 도착 진행도(0~1): 현재 챕터로 이동하는 끝부분과 도착 이후. 떠나는 챕터는 접힌다.
const arrivalOf = (journey, c) => {
  if (!journey || !journey.measured) return 0;
  if (c === journey.index) {
    return journey.phase === "travel" ? smoothstep(0.5, 1, journey.t) : 1;
  }
  if (c === journey.index - 1 && journey.phase === "travel") {
    return 1 - smoothstep(0, 0.4, journey.t);
  }
  return 0;
};

// 위성 i가 나타나는 정도: 고리를 따라 순서대로(시차) 크기 0 → 1
const satelliteReveal = (arrival, i, count) => {
  const start = (i / Math.max(count, 1)) * 0.55;
  return smoothstep(start, start + 0.45, arrival);
};

// 도착 순간 행성 후광이 한 번 밝아졌다 가라앉는다(도착 단계 진행도 a 기준).
const arrivalFlash = (journey, c) => {
  if (!journey || c !== journey.index || journey.phase !== "arrive") return 0;
  return Math.sin(Math.PI * Math.min(journey.a / 0.5, 1));
};

// 챕터 c 고리에서 앞 자리에 있는 위성 번호(연속값)
const ringProgress = (journey, c, count) => {
  if (!journey || c > journey.index) return 0;
  if (c < journey.index) return Math.max(count - 1, 0);
  return journey.ring;
};

const frontIndex = (journey, c) =>
  journey && c === journey.index && journey.phase === "item" ? journey.item : -1;

// 위성이 앞 자리에 가까운 정도(0~1): 고리가 돌 때 들어오는 위성이 부드럽게 커진다.
const frontness = (count, i, angle) => {
  const a = (i * TAU) / count + angle;
  const wrapped = Math.atan2(Math.sin(a), Math.cos(a));
  return smoothstep(TAU / count, 0, Math.abs(wrapped));
};

const createBody = (style, colors, uniforms, extra = {}) =>
  new ShaderMaterial({
    vertexShader: bodyVertexShader,
    fragmentShader: bodyFragmentShader,
    uniforms: {
      uType: { value: style.type },
      uColorA: { value: colors[0] },
      uColorB: { value: colors[1] },
      uColorC: { value: colors[2] },
      uGlowColor: { value: new Color(style.glow || "#000000") },
      uRimColor: { value: new Color(style.rim) },
      uSun: { value: new Vector3(0, 1, 0) },
      uCore: { value: new Vector3(0, 0, 1) },
      uDim: uniforms.uDim,
      uTime: uniforms.uTime,
      uSpin: { value: 0 },
      uSeed: { value: extra.seed || 0 },
      uScale: { value: style.scale || 1 },
      uRim: { value: 0 },
      uBrightness: { value: extra.brightness || 1 },
      uCenter: { value: new Vector3() },
      uRingNormal: { value: new Vector3(0, 1, 0) },
      uRingRadii: { value: new Float32Array([0, 1]) },
      uRingShadow: { value: extra.ringShadow || 0 },
    },
  });

const createHalo = (color, size, inner, strength, uniforms, ring = 0) =>
  new ShaderMaterial({
    vertexShader: haloVertexShader,
    fragmentShader: haloFragmentShader,
    uniforms: {
      uColor: { value: color },
      uSize: { value: size },
      uInner: { value: inner },
      uStrength: { value: strength },
      uRing: { value: ring },
      uDim: uniforms.uDim,
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

// 궤도선: 고리 각도(aAngle)를 함께 넘겨 앞 자리 근처만 밝게 그린다.
const createOrbitGeometry = (count) => {
  const points = [];
  const angles = [];
  for (let i = 0; i < ORBIT_SEGMENTS; i += 1) {
    const angle = (i / ORBIT_SEGMENTS) * TAU;
    const p = satellitePosition(count, 0, angle);
    points.push(p.x, p.y, p.z);
    angles.push(angle);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  geometry.setAttribute("aAngle", new Float32BufferAttribute(angles, 1));
  return geometry;
};

const ringNormalFromTilt = (tilt) => {
  // RingGeometry는 xy 평면(법선 +z). 메시 회전(오일러 XYZ)을 법선에 그대로 적용한다.
  return new Vector3(0, 0, 1).applyEuler(new Euler(tilt[0], tilt[1], tilt[2], "XYZ"));
};

// 챕터마다 은하 팔 위의 작은 행성, 위성 고리(회전목마), 비콘.
// 현재 챕터 위성의 화면 좌표를 라벨과 연결선에 쓴다.
const PlanetSystem = ({ uniforms }) => {
  const camera = useThree((state) => state.camera);
  const dpr = useThree((state) => state.viewport.dpr);
  const height = useThree((state) => state.size.height);
  const planetGroups = useRef([]);
  const ringMeshes = useRef([]);
  const systems = useRef([]);
  const satellites = useRef([]);
  const selectRings = useRef([]);
  const sizeRef = useRef({ width: 1, height: 1 });
  const written = useRef(new Map());
  // 라벨 상자 반폭 캐시(뷰포트 폭이 바뀌거나 현재 위성이 바뀌면 다시 잰다)
  const halfWidths = useRef(new Map());
  const halfWidthKey = useRef({ width: 0, front: null });
  const lastTag = useRef(null);
  // 위성별 호버 강조 정도(0~1, 부드럽게 보간)
  const hoverAmounts = useRef(new Map());
  const scratch = useMemo(
    () => ({ sun: new Vector3(), right: new Vector3(), up: new Vector3(), toward: new Vector3(), center: new Vector3() }),
    []
  );

  const planets = useMemo(() => createPlanets(journeyChapters.length), []);

  const resources = useMemo(() => {
    const planetGeometry = new SphereGeometry(PLANET_SIZE, 96, 64);
    const atmosphereGeometry = new SphereGeometry(PLANET_SIZE * ATMOSPHERE_SCALE, 64, 40);
    const satelliteGeometry = new SphereGeometry(SATELLITE_SIZE, 32, 20);
    const haloGeometry = new PlaneGeometry(2, 2);

    const chapters = journeyChapters.map((chapter, c) => {
      const style = PLANET_STYLES[c % PLANET_STYLES.length];
      const colors = style.colors.map((hex) => new Color(hex));
      const ring = style.ring
        ? {
            geometry: new RingGeometry(PLANET_SIZE * style.ring.inner, PLANET_SIZE * style.ring.outer, 160, 1),
            normal: ringNormalFromTilt(style.ring.tilt),
            material: new ShaderMaterial({
              vertexShader: ringVertexShader,
              fragmentShader: ringFragmentShader,
              uniforms: {
                uColor: { value: new Color(style.ring.color) },
                uInnerRadius: { value: PLANET_SIZE * style.ring.inner },
                uOuterRadius: { value: PLANET_SIZE * style.ring.outer },
                uOpacity: { value: style.ring.opacity },
                uSun: { value: new Vector3(0, 1, 0) },
                uCenter: { value: new Vector3() },
                uPlanetRadius: { value: PLANET_SIZE },
                uDim: uniforms.uDim,
              },
              transparent: true,
              depthWrite: false,
              side: DoubleSide,
            }),
          }
        : null;
      const planet = createBody(style, colors, uniforms, {
        seed: c * 7.3 + 1.1,
        ringShadow: ring ? 0.75 : 0,
      });
      if (ring) {
        planet.uniforms.uRingRadii.value[0] = PLANET_SIZE * style.ring.inner;
        planet.uniforms.uRingRadii.value[1] = PLANET_SIZE * style.ring.outer;
      }
      const moonBase = new Color(MOON_BASE);
      const tint = new Color(style.colors[2]);
      return {
        style,
        planet,
        ring,
        atmosphere: new ShaderMaterial({
          vertexShader: atmosphereVertexShader,
          fragmentShader: atmosphereFragmentShader,
          uniforms: {
            uColor: { value: new Color(style.atmosphere.color) },
            uSun: planet.uniforms.uSun,
            uStrength: { value: style.atmosphere.strength },
            uDim: uniforms.uDim,
          },
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
        halo: createHalo(new Color(style.rim), PLANET_SIZE * PLANET_HALO.size, PLANET_HALO.inner, PLANET_HALO.strength, uniforms),
        orbit: createOrbitGeometry(chapter.items.length),
        orbitMaterial: new ShaderMaterial({
          vertexShader: orbitVertexShader,
          fragmentShader: orbitFragmentShader,
          uniforms: {
            uColor: { value: new Color(style.rim) },
            uOpacity: { value: ORBIT_OPACITY },
            uDim: uniforms.uDim,
          },
          transparent: true,
          depthWrite: false,
        }),
        satellites: chapter.items.map((item) => {
          const brightness = 0.75 + 0.45 * itemHash(item.index, 2);
          const base = moonBase.clone().lerp(tint, MOON_TINT + 0.15 * itemHash(item.index, 3));
          return createBody(
            { type: SURFACE.moon, rim: style.rim, scale: 1.4 },
            [base.clone().multiplyScalar(0.55), base, base.clone().lerp(new Color("#ffffff"), 0.3)],
            uniforms,
            { seed: item.index * 3.7 + 0.5, brightness }
          );
        }),
        selectRing: createHalo(
          new Color(SELECT_RING.color),
          SATELLITE_SIZE * SELECT_RING.size,
          0,
          SELECT_RING.strength,
          uniforms,
          1
        ),
      };
    });

    const beaconGeometry = new BufferGeometry();
    const positions = new Float32Array(planets.length * 3);
    const tints = new Float32Array(planets.length * 3);
    const indices = new Float32Array(planets.length);
    planets.forEach((planet, c) => {
      positions.set([planet.x, planet.y, planet.z], c * 3);
      const tint = new Color(PLANET_STYLES[c % PLANET_STYLES.length].rim);
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
      atmosphereGeometry,
      satelliteGeometry,
      haloGeometry,
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
        resources.atmosphereGeometry,
        resources.satelliteGeometry,
        resources.haloGeometry,
        resources.beaconGeometry,
        resources.beaconMaterial,
      ].forEach((item) => item.dispose());
      resources.chapters.forEach((chapter) => {
        chapter.planet.dispose();
        chapter.atmosphere.dispose();
        chapter.halo.dispose();
        if (chapter.ring) {
          chapter.ring.geometry.dispose();
          chapter.ring.material.dispose();
        }
        chapter.orbit.dispose();
        chapter.orbitMaterial.dispose();
        chapter.selectRing.dispose();
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

  // 이동 중에도 목적지 행성(멀면 비콘 자리)을 따라간다. 화면 밖·카메라 뒤면 data-offscreen.
  const writeTag = (size) => {
    const element = getLabel(PLANET_TAG_ID);
    if (!element) return;
    const point = tagPoint(size);
    const margin = 24;
    const offscreen =
      !point ||
      !point.visible ||
      point.x < -margin ||
      point.x > size.width + margin ||
      point.y < -margin ||
      point.y > size.height + margin;
    if (element.hasAttribute("data-offscreen") !== offscreen) {
      element.toggleAttribute("data-offscreen", offscreen);
    }
    if (offscreen) return;
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

  useFrame((state, delta) => {
    const journey = rig.journey;
    const hoverStep = 1 - Math.exp(-Math.min(delta, 0.1) * HOVER.rate);
    let hoverMoving = false;
    const time = uniforms.uTime.value;
    const moving = state.frameloop === "always";
    // 항해가 떨어지면 분리된 DOM 노드 참조를 놓는다.
    if (!journey && written.current.size) {
      written.current.clear();
      halfWidths.current.clear();
      hoverAmounts.current.clear();
      lastTag.current = null;
    }
    sizeRef.current = state.size;

    // 태양: 카메라 기준 왼쪽 위 앞에서 모든 행성·위성을 같은 방향으로 비춘다.
    camera.updateMatrixWorld();
    const { sun, right, up, toward, center } = scratch;
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    toward.setFromMatrixColumn(camera.matrixWorld, 2);
    sun
      .copy(right)
      .multiplyScalar(SUN_FROM_CAMERA.right)
      .addScaledVector(up, SUN_FROM_CAMERA.up)
      .addScaledVector(toward, SUN_FROM_CAMERA.toward)
      .normalize();

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
      const body = materials.planet.uniforms;
      body.uSpin.value = time * SPIN_SPEED;
      body.uSun.value.copy(sun);
      body.uCenter.value.copy(group.position);
      body.uCore.value.set(-p.x, 0, -p.z).normalize();
      if (materials.ring) {
        const ringMesh = ringMeshes.current[c];
        if (ringMesh) {
          ringMesh.updateMatrixWorld();
          body.uRingNormal.value
            .copy(materials.ring.normal)
            .transformDirection(ringMesh.parent.matrixWorld);
        }
        const ringUniforms = materials.ring.material.uniforms;
        ringUniforms.uSun.value.copy(sun);
        ringUniforms.uCenter.value.copy(group.position);
      }
      materials.halo.uniforms.uStrength.value =
        PLANET_HALO.strength * (1 + PLANET_HALO.flash * arrivalFlash(journey, c));

      const arrival = arrivalOf(journey, c);
      system.visible = arrival > 0.001;
      if (!system.visible) return;
      // 앞 자리 방향: 체류 카메라 방위(공전 좌표계 기준) + 오른쪽으로 돈 각도
      system.rotation.y = ringYaw(planet, rig.journeyView);
      materials.orbitMaterial.uniforms.uOpacity.value = ORBIT_OPACITY * smoothstep(0, 0.6, arrival);

      const count = chapter.items.length;
      const angle =
        ringAngle(count, ringProgress(journey, c, count)) +
        (moving ? SWAY * Math.sin(time * 0.4 + c) : 0);
      const front = frontIndex(journey, c);
      const highlight = c === journey.index && journey.phase !== "travel" ? 1 : 0;
      let selectTarget = null;
      let selectStrength = 0;
      chapter.items.forEach((item, i) => {
        const mesh = satellites.current[item.index];
        if (!mesh) return;
        const offset = satellitePosition(count, i, angle);
        const bob = moving ? BOB * Math.sin(time * 1.3 + i * 1.7) : 0;
        mesh.position.set(offset.x, offset.y + bob, offset.z);
        const near = frontness(count, i, angle) * highlight;
        // 호버 강조: 앞 자리에 가까울수록 앞 위성 강조에 양보한다.
        const hoverTarget =
          journey.hover === item.id && c === journey.index ? 1 - smoothstep(0.3, 0.7, near) : 0;
        const previousHover = hoverAmounts.current.get(item.index) || 0;
        const hover = previousHover + (hoverTarget - previousHover) * hoverStep;
        if (Math.abs(hoverTarget - hover) > 0.002) hoverMoving = true;
        hoverAmounts.current.set(item.index, Math.abs(hoverTarget - hover) > 0.002 ? hover : hoverTarget);
        const size = 1 + MOON_SIZE_VARIATION * (2 * itemHash(item.index, 1) - 1);
        mesh.scale.setScalar(
          size *
            (1 + (FRONT_SCALE - 1) * near) *
            (1 + HOVER.scale * hover) *
            satelliteReveal(arrival, i, count)
        );
        mesh.visible = mesh.scale.x > 0.001;
        const moon = mesh.material.uniforms;
        moon.uRim.value =
          FRONT_RIM * near * (i === front || front < 0 ? 1 : 0.6) + HOVER.rim * hover;
        moon.uSun.value.copy(sun);
        moon.uCore.value.copy(body.uCore.value);
        moon.uSpin.value = time * SPIN_SPEED * 2;
        if (near > selectStrength) {
          selectStrength = near;
          selectTarget = mesh;
        }
      });
      const ring = selectRings.current[c];
      if (ring) {
        ring.visible = selectTarget !== null && selectStrength > 0.01;
        if (ring.visible) {
          ring.position.copy(selectTarget.position);
          ring.scale.setScalar(selectTarget.scale.x);
          materials.selectRing.uniforms.uStrength.value = SELECT_RING.strength * selectStrength;
        }
      }
    });

    // demand(일시정지) 모드에서도 호버 강조가 끝까지 보간되게 다음 프레임을 요청한다.
    if (hoverMoving) state.invalidate();

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
            <mesh geometry={resources.atmosphereGeometry} material={materials.atmosphere} />
            <mesh
              geometry={resources.haloGeometry}
              material={materials.halo}
              frustumCulled={false}
            />
            {materials.ring && (
              <mesh
                ref={(mesh) => {
                  ringMeshes.current[c] = mesh;
                }}
                geometry={materials.ring.geometry}
                material={materials.ring.material}
                rotation={materials.style.ring.tilt}
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
                ref={(ring) => {
                  selectRings.current[c] = ring;
                }}
                geometry={resources.haloGeometry}
                material={materials.selectRing}
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
