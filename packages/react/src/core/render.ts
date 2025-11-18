import { context } from "./context";
import { reconcile } from "./reconciler";
import { cleanupUnusedHooks } from "./hooks";
import { withEnqueue } from "../utils";
import type { Instance } from "./types";

/**
 * 루트 컴포넌트의 렌더링을 수행하는 함수입니다.
 * `enqueueRender`에 의해 스케줄링되어 호출됩니다.
 */
export const render = (): Instance | null => {
  const { container, node, instance } = context.root;
  if (!container) {
    throw new Error("Root container is not set.");
  }

  // 렌더링 전 훅 방문 정보를 초기화합니다.
  context.hooks.visited.clear();
  context.hooks.cursor.clear();

  const nextInstance = node ? reconcile(container, instance, node, "/root") : null;
  context.root.instance = nextInstance;

  cleanupUnusedHooks();

  return nextInstance;
};

/**
 * `render` 함수를 마이크로태스크 큐에 추가하여 중복 실행을 방지합니다.
 */
export const enqueueRender = withEnqueue(render);
