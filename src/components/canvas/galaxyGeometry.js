import { GALAXY_ARMS, SPIN } from "./galaxyShape";

export const GALAXY_RADIUS = 5;
// 가장 높은 티어의 입자 수
export const GALAXY_MAX_COUNT = 45000;
export { GALAXY_ARMS } from "./galaxyShape";
// 먼 배경 별밭(구 껍질)
export const DUST_COUNT = 6000;
// 나선팔을 따라가는 성운(발광)과 먼지(어두운 띠) 구름
export const NEBULA_COUNT = 520;
export const DUST_LANE_COUNT = 320;
// 배경의 은은한 색 얼룩
export const BLOB_COUNT = 14;
export const DUST_MIN_RADIUS = 60;
export const DUST_MAX_RADIUS = 110;

export const GALAXY_COLORS = {
  inside: "#ffe2b8",
  middle: "#915EFF",
  outside: "#f272c8",
};

// Float32 저장 시 반올림으로 5를 넘지 않도록 약간 안쪽에서 자른다.
const RADIUS_CAP = GALAXY_RADIUS - 0.005;
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

// 셰이더는 선형 색 공간에서 계산하고 OutputPass가 sRGB로 바꾸므로 색은 선형으로 넘긴다.
const toLinear = (rgb) => rgb.map((value) => Math.pow(value, 2.2));
const clamp01 = (value) => Math.min(Math.max(value, 0), 1);

// 별의 색온도(청백 → 백색 → 주황)
const STAR_TEMPERATURES = ["#cfdcff", "#f4f1ff", "#ffe4c4", "#ffbf86"].map(hexToRgb);
const temperatureAt = (t) => {
  const scaled = clamp01(t) * (STAR_TEMPERATURES.length - 1);
  const index = Math.min(Math.floor(scaled), STAR_TEMPERATURES.length - 2);
  return mix(STAR_TEMPERATURES[index], STAR_TEMPERATURES[index + 1], scaled - index);
};

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

// 별 크기: 멱분포(대부분 작고 소수만 크다). 가장 큰 일부에는 회절 스파이크를 붙인다.
const STAR_SCALE_MIN = 0.35;
const STAR_SCALE_RANGE = 2.6;
const STAR_SCALE_POWER = 7;
export const SPIKE_SCALE = 2.9;

// 각 점을 독립적으로 뽑으므로 버퍼의 어느 앞부분(drawRange)도 전체 분포를 대표한다.
export const createGalaxyAttributes = ({ count, seed = 1 }) => {
  const rng = createRng(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  const spikes = new Float32Array(count);

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

    // 팔레트 색에 색온도를 섞고, 중심부 별은 하나하나를 어둡게 해 겹쳐도 흰 평면으로 포화되지 않게 한다.
    const planar = Math.hypot(x, z);
    const palette = galaxyColorAt(planar);
    const temperature = temperatureAt(rng());
    const core = 0.4 + 0.6 * Math.min(Math.max((planar - 0.2) / 1.4, 0), 1);
    const color = toLinear(mix(palette, temperature, 0.45)).map((value) => clamp01(value * core));
    colors[i3] = color[0];
    colors[i3 + 1] = color[1];
    colors[i3 + 2] = color[2];

    const scale = STAR_SCALE_MIN + STAR_SCALE_RANGE * Math.pow(rng(), STAR_SCALE_POWER);
    scales[i] = scale;
    spikes[i] = scale >= SPIKE_SCALE ? 1 : 0;
    phases[i] = rng() * Math.PI * 2;
  }

  return { count, positions, colors, scales, phases, spikes };
};

// 나선팔을 따라가는 구름. kind 0: 발광 성운(자홍·청색), 1: 먼지(팔 안쪽 가장자리의 어두운 띠)
const NEBULA_COLORS = ["#c04bd6", "#5b6ff0", "#8a4dff", "#e0609e"].map(hexToRgb);

export const createNebulaAttributes = ({
  count = NEBULA_COUNT,
  dustCount = DUST_LANE_COUNT,
  seed = 11,
} = {}) => {
  const rng = createRng(seed);
  const total = count + dustCount;
  const positions = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  const scales = new Float32Array(total);
  const phases = new Float32Array(total);
  const kinds = new Float32Array(total);

  for (let i = 0; i < total; i += 1) {
    const dust = i >= count;
    const radius = 0.7 + Math.pow(rng(), 0.9) * (RADIUS_CAP - 0.9);
    const arm = Math.floor(rng() * GALAXY_ARMS);
    // 먼지는 팔의 안쪽 가장자리(회전 반대쪽)로 조금 비켜 어두운 틈을 만든다.
    const offset = dust ? -0.32 : 0;
    const angle = (arm / GALAXY_ARMS) * Math.PI * 2 + radius * SPIN + offset;
    const spread = (dust ? 0.22 : 0.4) * (0.4 + radius / GALAXY_RADIUS);
    const i3 = i * 3;
    positions[i3] = Math.cos(angle) * radius + signedPow(rng, 2) * spread;
    positions[i3 + 1] = signedPow(rng, 2) * spread * 0.18;
    positions[i3 + 2] = Math.sin(angle) * radius + signedPow(rng, 2) * spread;

    const color = dust
      ? [0.012, 0.01, 0.02]
      : toLinear(NEBULA_COLORS[Math.floor(rng() * NEBULA_COLORS.length)]);
    colors[i3] = color[0];
    colors[i3 + 1] = color[1];
    colors[i3 + 2] = color[2];
    scales[i] = (dust ? 0.5 : 0.7) + rng() * (dust ? 0.6 : 1.0);
    phases[i] = rng() * Math.PI * 2;
    kinds[i] = dust ? 1 : 0;
  }

  return { count: total, positions, colors, scales, phases, kinds };
};

// 먼 배경의 은은한 색 얼룩(화면 크기 기준의 큰 점)
const BLOB_COLORS = ["#2a1b5e", "#3a1446", "#122a5a", "#2b0f3c"].map(hexToRgb);

export const createBlobAttributes = ({ count = BLOB_COUNT, seed = 23 } = {}) => {
  const rng = createRng(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  const radius = (DUST_MIN_RADIUS + DUST_MAX_RADIUS) / 2;

  for (let i = 0; i < count; i += 1) {
    const u = rng() * 1.6 - 0.8;
    const theta = rng() * Math.PI * 2;
    const ring = Math.sqrt(1 - u * u);
    const i3 = i * 3;
    positions[i3] = ring * Math.cos(theta) * radius;
    positions[i3 + 1] = u * radius;
    positions[i3 + 2] = ring * Math.sin(theta) * radius;
    const color = toLinear(BLOB_COLORS[i % BLOB_COLORS.length]);
    colors[i3] = color[0];
    colors[i3 + 1] = color[1];
    colors[i3 + 2] = color[2];
    scales[i] = 0.6 + rng() * 0.8;
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

    // 먼 별: 색온도 + 약한 팔레트 기운, 대부분 아주 작고 어둡다.
    const temperature = temperatureAt(rng());
    const brightness = 0.25 + 0.75 * Math.pow(rng(), 3);
    const color = toLinear(mix(temperature, OUTSIDE, 0.12)).map((value) =>
      clamp01(value * brightness)
    );
    colors[i3] = color[0];
    colors[i3 + 1] = color[1];
    colors[i3 + 2] = color[2];

    scales[i] = 0.5 + 1.6 * Math.pow(rng(), 4);
    phases[i] = rng() * Math.PI * 2;
  }

  return { count, positions, colors, scales, phases };
};
