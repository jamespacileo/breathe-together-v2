import { MathUtils } from 'three';

type SizeLike = { width: number; height: number };

const UI_SELECTORS = [
  '[data-ui]',
  '[data-ui-root]',
  '[data-ui-panel]',
  '[data-ui-control]',
  '[data-ui-modal]',
  '[data-ui-overlay]',
  '[data-ui-no-3d]',
].join(',');

const LEVA_CLASS_PREFIXES = ['leva', 'leva__'];
const VELOCITY_MS_TO_S = 1000;

function isElement(target: EventTarget | null | undefined): target is Element {
  return !!target && target instanceof Element;
}

function hasLevaClass(element: Element): boolean {
  if (!element.classList) return false;
  for (const className of element.classList) {
    for (const prefix of LEVA_CLASS_PREFIXES) {
      if (className.startsWith(prefix)) return true;
    }
  }
  return false;
}

function hasLevaAncestor(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    if (hasLevaClass(current)) return true;
    current = current.parentElement;
  }
  return false;
}

export function getDomEventTarget(event: unknown): EventTarget | null {
  if (!event) return null;
  if (event instanceof Event) return event.target;
  if (typeof event === 'object' && event !== null) {
    const maybeEvent = event as { target?: EventTarget | null; nativeEvent?: Event };
    if (isElement(maybeEvent.target)) return maybeEvent.target;
    return maybeEvent.nativeEvent?.target ?? maybeEvent.target ?? null;
  }
  return null;
}

export function isUiEventTarget(target: EventTarget | null): boolean {
  if (!isElement(target)) return false;
  if (target.closest(UI_SELECTORS)) return true;
  return hasLevaAncestor(target);
}

export function shouldHandleSceneWheel(
  event: WheelEvent,
  eventSourceElement?: HTMLElement | null,
): boolean {
  if (!eventSourceElement) return false;
  if (!isElement(event.target)) return false;
  if (!eventSourceElement.contains(event.target)) return false;
  return !isUiEventTarget(event.target);
}

export function normalizeWheelDeltaY(event: WheelEvent): number {
  switch (event.deltaMode) {
    case 1: // DOM_DELTA_LINE
      return event.deltaY * 16;
    case 2: // DOM_DELTA_PAGE
      return event.deltaY * (typeof window !== 'undefined' ? window.innerHeight : 800);
    default:
      return event.deltaY;
  }
}

export function calculateTargetZoom(
  currentZoom: number,
  wheelDelta: number,
  config: {
    min: number;
    max: number;
    speed: number;
  },
): number {
  const zoomDelta = -wheelDelta * config.speed;
  return MathUtils.clamp(currentZoom + zoomDelta, config.min, config.max);
}

export type MomentumDeltaInput = {
  velocity: [number, number];
  size: SizeLike;
  speed: number;
  momentum: number;
  velocityMultiplier: number;
  timeConstant: number;
  minVelocityThreshold: number;
  maxMomentum: number;
};

export type MomentumDeltaOutput = {
  deltaX: number;
  deltaY: number;
  hasMomentumX: boolean;
  hasMomentumY: boolean;
};

export function calculateMomentumDelta({
  velocity,
  size,
  speed,
  momentum,
  velocityMultiplier,
  timeConstant,
  minVelocityThreshold,
  maxMomentum,
}: MomentumDeltaInput): MomentumDeltaOutput {
  const [vx, vy] = velocity;
  const width = Math.max(1, size.width);
  const height = Math.max(1, size.height);

  const vxPxPerSecond = vx * VELOCITY_MS_TO_S;
  const vyPxPerSecond = vy * VELOCITY_MS_TO_S;

  const hasMomentumX = Math.abs(vxPxPerSecond) > minVelocityThreshold;
  const hasMomentumY = Math.abs(vyPxPerSecond) > minVelocityThreshold;

  if (!hasMomentumX && !hasMomentumY) {
    return { deltaX: 0, deltaY: 0, hasMomentumX: false, hasMomentumY: false };
  }

  const momentumScale = momentum * velocityMultiplier;
  const baseX = vxPxPerSecond * momentumScale * timeConstant;
  const baseY = vyPxPerSecond * momentumScale * timeConstant;

  const deltaX = hasMomentumX
    ? MathUtils.clamp((baseX / width) * Math.PI * speed, -maxMomentum, maxMomentum)
    : 0;
  const deltaY = hasMomentumY
    ? MathUtils.clamp((baseY / height) * Math.PI * speed, -maxMomentum, maxMomentum)
    : 0;

  return { deltaX, deltaY, hasMomentumX, hasMomentumY };
}
