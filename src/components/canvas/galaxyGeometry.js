export const GALAXY_RADIUS = 5;
// 가장 높은 티어의 입자 수
export const GALAXY_MAX_COUNT = 45000;
export const GALAXY_ARMS = 4;
export const DUST_COUNT = 2000;
export const DUST_MIN_RADIUS = 60;
export const DUST_MAX_RADIUS = 110;

export const GALAXY_COLORS = {
  inside: "#ffe2b8",
  middle: "#915EFF",
  outside: "#f272c8",
};

// Float32 저장 시 반올림으로 5를 넘지 않도록 약간 안쪽에서 자른다.
const RADIUS_CAP = GALAXY_RADIUS - 0.005;
const SPIN = 1.1;
const SPREAD = 0.45;

export const createRng = (seed = 1) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hexToRgb = (hex) => {
  const value = parseInt(hex.slice(1), 16);
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
};

const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const INSIDE = hexToRgb(GALAXY_COLORS.inside);
const MIDDLE = hexToRgb(GALAXY_COLORS.middle);
const OUTSIDE = hexToRgb(GALAXY_COLORS.outside);

export const galaxyColorAt = (radius) => {
  const t = Math.min(Math.max(radius / GALAXY_RADIUS, 0), 1);
  return t < 0.5 ? mix(INSIDE, MIDDLE, t / 0.5) : mix(MIDDLE, OUTSIDE, (t - 0.5) / 0.5);
};

const signedPow = (rng, power) => {
  const value = Math.pow(rng(), power);
  return rng() < 0.5 ? -value : value;
};

// 각 점을 독립적으로 뽑으므로 버퍼의 어느 앞부분(drawRange)도 전체 분포를 대표한다.
export const createGalaxyAttributes = ({ count, seed = 1 }) => {
  const rng = createRng(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const radius = Math.pow(rng(), 1.6) * GALAXY_RADIUS;
    const arm = Math.floor(rng() * GALAXY_ARMS);
    const angle = (arm / GALAXY_ARMS) * Math.PI * 2 + radius * SPIN;
    const spread = SPREAD * (0.35 + radius / GALAXY_RADIUS);

    let x = Math.cos(angle) * radius + signedPow(rng, 3) * spread;
    let y = signedPow(rng, 3) * spread * 0.35;
    let z = Math.sin(angle) * radius + signedPow(rng, 3) * spread;

    const length = Math.hypot(x, y, z);
    if (length > RADIUS_CAP) {
      const k = RADIUS_CAP / length;
      x *= k;
      y *= k;
      z *= k;
    }

    const i3 = i * 3;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    const color = galaxyColorAt(Math.hypot(x, z));
    colors[i3] = color[0];
    colors[i3 + 1] = color[1];
    colors[i3 + 2] = color[2];

    scales[i] = 0.4 + rng() * 0.9 + (rng() < 0.02 ? 1.2 : 0);
    phases[i] = rng() * Math.PI * 2;
  }

  return { count, positions, colors, scales, phases };
};

export const createDustAttributes = ({ count = DUST_COUNT, seed = 7 } = {}) => {
  const rng = createRng(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  const span = DUST_MAX_RADIUS - DUST_MIN_RADIUS;

  for (let i = 0; i < count; i += 1) {
    const radius = DUST_MIN_RADIUS + 0.5 + rng() * (span - 1);
    const u = rng() * 2 - 1;
    const theta = rng() * Math.PI * 2;
    const ring = Math.sqrt(1 - u * u);
    const i3 = i * 3;

    positions[i3] = ring * Math.cos(theta) * radius;
    positions[i3 + 1] = u * radius;
    positions[i3 + 2] = ring * Math.sin(theta) * radius;

    const color = mix(OUTSIDE, [1, 1, 1], 0.55 + rng() * 0.45);
    colors[i3] = color[0];
    colors[i3 + 1] = color[1];
    colors[i3 + 2] = color[2];

    scales[i] = 0.6 + rng() * 1.2;
    phases[i] = rng() * Math.PI * 2;
  }

  return { count, positions, colors, scales, phases };
};
