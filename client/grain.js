import {
  GrainGradientShapes,
  ShaderFitOptions,
  ShaderMount,
  defaultObjectSizing,
  getShaderColorFromString,
  getShaderNoiseTexture,
  grainGradientFragmentShader,
} from "@paper-design/shaders";

const SHAPES = ["corners", "wave", "ripple", "sphere"];
const SPEED = 1.6;

const BACKGROUND = "#0a0a0a";
const FALLBACK_PALETTE = ["#ff4f00", "#ff8a3d", "#c23a00", "#5c1a04"];

function paint(element, noiseTexture) {
  const bytes = element.dataset.seed.match(/../g).map((pair) => parseInt(pair, 16));
  const unit = (index) => bytes[index] / 255;
  const shape = SHAPES[bytes[0] % SHAPES.length];
  const palette = element.dataset.palette?.split(",") ?? FALLBACK_PALETTE;
  const lead = bytes[1] % palette.length;
  const colors = palette.map((_, index) => palette[(lead + index) % palette.length]);
  const label = element.parentElement.querySelector("[data-shape]");
  if (label) label.textContent = shape;
  const still = element.hasAttribute("data-still") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  new ShaderMount(
    element,
    grainGradientFragmentShader,
    {
      u_colorBack: getShaderColorFromString(BACKGROUND),
      u_colors: colors.map(getShaderColorFromString),
      u_colorsCount: colors.length,
      u_softness: 0.3 + unit(2) * 0.6,
      u_intensity: 0.15 + unit(3) * 0.55,
      u_noise: 0.4,
      u_shape: GrainGradientShapes[shape],
      u_noiseTexture: noiseTexture,
      u_fit: ShaderFitOptions[defaultObjectSizing.fit],
      u_scale: 0.6 + unit(4) * 0.6,
      u_rotation: unit(5) * 360,
      u_offsetX: (unit(6) - 0.5) * 0.6,
      u_offsetY: (unit(7) - 0.5) * 0.6,
      u_originX: defaultObjectSizing.originX,
      u_originY: defaultObjectSizing.originY,
      u_worldWidth: defaultObjectSizing.worldWidth,
      u_worldHeight: defaultObjectSizing.worldHeight,
    },
    undefined,
    still ? 0 : SPEED,
    (bytes[0] ^ bytes[7]) * 400,
  );
}

const noiseTexture = getShaderNoiseTexture();
noiseTexture.decode().then(() => {
  document.querySelectorAll("[data-seed]").forEach((element) => paint(element, noiseTexture));
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.setAttribute("data-painted", "")));
});
