import { Context } from "./types";

/**
 * Mini-React의 전역 컨텍스트입니다.
 */
export const context: Context = {
  /**
   * 렌더링 루트 관리
   */
  root: {
    container: null,
    node: null,
    instance: null,

    reset({ container, node }) {
      this.container = container;
      this.node = node;
      this.instance = null; // 새 렌더링 시작하므로 instance 초기화
    },
  },

  /**
   * 훅 관련 상태 관리
   */
  hooks: {
    state: new Map(), // path → hook states array
    cursor: new Map(), // path → cursor index
    visited: new Set(), // path visited during rendering
    componentStack: [], // 렌더 중인 컴포넌트 path 스택

    /**
     * 모든 훅 상태 초기화
     */
    clear() {
      this.state.clear();
      this.cursor.clear();
      this.visited.clear();
      this.componentStack.length = 0;
    },

    /**
     * 현재 렌더 중인 컴포넌트의 path
     */
    get currentPath() {
      const path = this.componentStack[this.componentStack.length - 1];
      if (!path) {
        throw new Error("Hooks can only be called inside a component.");
      }
      return path;
    },

    /**
     * 현재 컴포넌트 훅 커서
     */
    get currentCursor() {
      return this.cursor.get(this.currentPath) ?? 0;
    },

    /**
     * 현재 컴포넌트 훅 배열
     */
    get currentHooks() {
      return this.state.get(this.currentPath) ?? [];
    },
  },

  /**
   * useEffect 실행 큐
   */
  effects: {
    queue: [],
  },
};
