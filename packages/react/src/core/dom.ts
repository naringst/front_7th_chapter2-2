/* eslint-disable @typescript-eslint/no-explicit-any */
import { NodeTypes } from "./constants";
import { Instance } from "./types";

/**
 * DOM 요소에 속성(props)을 설정합니다.
 */
export const setDomProps = (dom: HTMLElement, props: Record<string, any>): void => {
  for (const key in props) {
    const value = props[key];

    if (key === "children") continue; // children 제외

    // 이벤트 핸들러
    if (key.startsWith("on") && typeof value === "function") {
      const event = key.slice(2).toLowerCase();
      dom.addEventListener(event, value);
      continue;
    }

    // 스타일
    if (key === "style" && typeof value === "object") {
      Object.assign(dom.style, value);
      continue;
    }

    // className
    if (key === "className") {
      dom.setAttribute("class", value);
      continue;
    }

    // 일반 속성
    if (value === true) {
      dom.setAttribute(key, "");
    } else if (value === false || value == null) {
      dom.removeAttribute(key);
    } else {
      dom.setAttribute(key, value);
    }
  }
};

/**
 * 이전 속성과 새로운 속성을 비교하여 DOM 요소의 속성을 업데이트합니다.
 */
export const updateDomProps = (
  dom: HTMLElement,
  prevProps: Record<string, any> = {},
  nextProps: Record<string, any> = {},
): void => {
  // 1. 제거할 props 처리
  for (const key in prevProps) {
    if (key === "children") continue;

    // 삭제된 event handler
    if (key.startsWith("on") && !(key in nextProps)) {
      const event = key.slice(2).toLowerCase();
      dom.removeEventListener(event, prevProps[key]);
      continue;
    }

    // 삭제된 일반 속성
    if (!(key in nextProps)) {
      dom.removeAttribute(key);
    }
  }

  // 2. 새 props 적용
  setDomProps(dom, nextProps);
};

/**
 * 인스턴스에서 실제 DOM 노드를 모두 추출합니다.
 */
export const getDomNodes = (instance: Instance | null): (HTMLElement | Text)[] => {
  if (!instance) return [];

  // TEXT_ELEMENT 또는 DOM Element
  if (instance.kind === NodeTypes.TEXT || instance.kind === NodeTypes.HOST) {
    return instance.dom ? [instance.dom] : [];
  }

  // Fragment, Component → children을 통해 수집
  const result: (HTMLElement | Text)[] = [];
  for (const child of instance.children) {
    result.push(...getDomNodes(child));
  }
  return result;
};

/**
 * 첫 번째 DOM 노드 반환
 */
export const getFirstDom = (instance: Instance | null): HTMLElement | Text | null => {
  const nodes = getDomNodes(instance);
  return nodes.length > 0 ? nodes[0] : null;
};

/**
 * 자식 인스턴스 배열에서 첫 번째 DOM 반환
 */
export const getFirstDomFromChildren = (children: (Instance | null)[]): HTMLElement | Text | null => {
  for (const child of children) {
    const dom = getFirstDom(child);
    if (dom) return dom;
  }
  return null;
};

/**
 * 인스턴스를 부모 DOM에 삽입합니다.
 */
export const insertInstance = (
  parentDom: HTMLElement,
  instance: Instance | null,
  anchor: HTMLElement | Text | null = null,
): void => {
  if (!instance) return;

  const nodes = getDomNodes(instance);
  for (const node of nodes) {
    if (anchor) {
      parentDom.insertBefore(node, anchor);
    } else {
      parentDom.appendChild(node);
    }
  }
};

/**
 * 부모 DOM에서 인스턴스에 해당하는 모든 DOM 제거
 */
export const removeInstance = (parentDom: HTMLElement, instance: Instance | null): void => {
  if (!instance) return;

  const nodes = getDomNodes(instance);
  for (const node of nodes) {
    if (node.parentNode === parentDom) {
      parentDom.removeChild(node);
    }
  }
};
