import { context } from "./context";
import { VNode } from "./types";
import { removeInstance } from "./dom";
// import { cleanupUnusedHooks } from "./hooks";
import { render } from "./render";

/**
 * Mini-React의 루트 렌더링을 초기화하고 실행합니다.
 */
export const setup = (rootNode: VNode | null, container: HTMLElement): void => {
  // 1. 컨테이너 유효성 검사
  if (!container) {
    throw new Error("Container is required for rendering.");
  }
  if (rootNode === null) {
    throw new Error("Cannot render null as a root element.");
  }

  // 2. 이전 렌더링 정리
  if (context.root.instance && context.root.container) {
    removeInstance(context.root.container, context.root.instance);
  }

  // 컨테이너 비우기
  container.innerHTML = "";

  // 3. 루트 컨텍스트 / 훅 컨텍스트 초기화
  context.root.reset({ container, node: rootNode });
  context.hooks.clear();
  context.effects.queue.length = 0;

  // 4. 첫 렌더 실행
  const newInstance = render();

  // 저장
  context.root.instance = newInstance;
};
