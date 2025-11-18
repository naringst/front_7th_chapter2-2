import { shallowEquals, withEnqueue } from "../utils";
import { context } from "./context";
import { EffectHook } from "./types";
import { enqueueRender } from "./render";
import { HookTypes } from "./constants";

type HookSlot = {
  path: string;
  cursor: number;
  hooks: unknown[];
};

const flushEffects = withEnqueue(() => {
  while (context.effects.queue.length > 0) {
    const task = context.effects.queue.shift();
    if (!task) continue;
    const hookArray = context.hooks.state.get(task.path);
    const hook = hookArray?.[task.cursor] as EffectHook | undefined;
    if (!hook || hook.kind !== HookTypes.EFFECT) continue;

    if (hook.cleanup) {
      hook.cleanup();
      hook.cleanup = null;
    }

    const cleanup = hook.effect();
    hook.cleanup = typeof cleanup === "function" ? cleanup : null;
  }
});

const getCurrentHookSlot = (): HookSlot => {
  const path = context.hooks.currentPath;
  const cursor = context.hooks.cursor.get(path) ?? 0;
  const hooks = context.hooks.state.get(path) ?? [];

  if (!context.hooks.state.has(path)) {
    context.hooks.state.set(path, hooks);
  }

  context.hooks.cursor.set(path, cursor + 1);

  return { path, cursor, hooks };
};

const isEffectHook = (hook: unknown): hook is EffectHook => {
  return typeof hook === "object" && hook !== null && (hook as EffectHook).kind === HookTypes.EFFECT;
};

/**
 * 사용되지 않는 컴포넌트의 훅 상태와 이펙트 클린업 함수를 정리합니다.
 */
export const cleanupUnusedHooks = () => {
  const { visited, state, cursor } = context.hooks;

  for (const [path, hooks] of state.entries()) {
    if (visited.has(path)) continue;

    for (const hook of hooks) {
      if (isEffectHook(hook)) {
        hook.cleanup?.();
        hook.cleanup = null;
      }
    }

    state.delete(path);
    cursor.delete(path);
  }

  context.effects.queue = context.effects.queue.filter(({ path }) => state.has(path));
  visited.clear();
};

const resolveInitialState = <T>(initialValue: T | (() => T)): T => {
  if (typeof initialValue === "function") {
    return (initialValue as () => T)();
  }
  return initialValue;
};

/**
 * 컴포넌트의 상태를 관리하기 위한 훅입니다.
 * @param initialValue - 초기 상태 값 또는 초기 상태를 반환하는 함수
 * @returns [현재 상태, 상태를 업데이트하는 함수]
 */
export const useState = <T>(initialValue: T | (() => T)): [T, (nextValue: T | ((prev: T) => T)) => void] => {
  const { cursor, hooks } = getCurrentHookSlot();

  if (!(cursor in hooks)) {
    hooks[cursor] = resolveInitialState(initialValue);
  }

  const setState = (nextValue: T | ((prev: T) => T)) => {
    const currentValue = hooks[cursor] as T;
    const value = typeof nextValue === "function" ? (nextValue as (prev: T) => T)(currentValue) : nextValue;

    if (Object.is(currentValue, value)) {
      return;
    }

    hooks[cursor] = value;
    enqueueRender();
  };

  return [hooks[cursor] as T, setState];
};

/**
 * 컴포넌트의 사이드 이펙트를 처리하기 위한 훅입니다.
 * @param effect - 실행할 이펙트 함수. 클린업 함수를 반환할 수 있습니다.
 * @param deps - 의존성 배열. 이 값들이 변경될 때만 이펙트가 다시 실행됩니다.
 */
export const useEffect = (effect: () => (() => void) | void, deps?: unknown[]): void => {
  const { path, cursor, hooks } = getCurrentHookSlot();
  const existingHook = hooks[cursor] as EffectHook | undefined;
  const nextDeps = deps === undefined ? null : [...deps];

  let shouldRun = false;

  if (!existingHook) {
    shouldRun = true;
  } else if (deps === undefined) {
    shouldRun = true;
  } else if (existingHook.deps === null) {
    shouldRun = true;
  } else if (!shallowEquals(existingHook.deps, deps)) {
    shouldRun = true;
  }

  const hook: EffectHook =
    existingHook ??
    ({
      kind: HookTypes.EFFECT,
      deps: nextDeps,
      cleanup: null,
      effect,
    } as EffectHook);

  hook.effect = effect;
  hook.deps = deps === undefined ? null : nextDeps;

  hooks[cursor] = hook;

  if (shouldRun) {
    context.effects.queue.push({ path, cursor });
    flushEffects();
  }
};
