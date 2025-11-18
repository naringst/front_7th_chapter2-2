/* eslint-disable @typescript-eslint/no-explicit-any */
import { NodeTypes } from "./constants";
import { Instance } from "./types";

const BOOLEAN_ATTRIBUTES = new Set(["disabled", "checked", "multiple", "required"]);

const isEventProp = (key: string): boolean => key.startsWith("on") && key.length > 2;
const extractEventName = (key: string): string => key.slice(2).toLowerCase();

const applyStyle = (
  dom: HTMLElement,
  prevStyle: Record<string, any> = {},
  nextStyle: Record<string, any> = {},
): void => {
  for (const styleName in prevStyle) {
    if (!(styleName in nextStyle)) {
      dom.style[styleName as any] = "";
    }
  }

  for (const styleName in nextStyle) {
    const value = nextStyle[styleName];
    dom.style[styleName as any] = value ?? "";
  }
};

const applyAttribute = (dom: HTMLElement, key: string, value: any): void => {
  if (key === "children") return;

  if (key === "className") {
    if (value == null || value === "") {
      dom.removeAttribute("class");
    } else {
      dom.setAttribute("class", value);
    }
    return;
  }

  if (key === "readOnly") {
    const boolValue = Boolean(value);
    (dom as any).readOnly = boolValue;
    if (boolValue) {
      dom.setAttribute("readonly", "");
    } else {
      dom.removeAttribute("readonly");
    }
    return;
  }

  if (key === "value") {
    const resolved = value ?? "";
    (dom as any).value = resolved;
    if (resolved === "") {
      dom.removeAttribute("value");
    } else {
      dom.setAttribute("value", resolved);
    }
    return;
  }

  if (BOOLEAN_ATTRIBUTES.has(key)) {
    const boolValue = Boolean(value);
    (dom as any)[key] = boolValue;
    if (boolValue) {
      dom.setAttribute(key, "");
    } else {
      dom.removeAttribute(key);
    }
    return;
  }

  if (value === true) {
    dom.setAttribute(key, "");
    return;
  }

  if (value === false || value == null) {
    dom.removeAttribute(key);
    return;
  }

  if (key in dom) {
    try {
      (dom as any)[key] = value;
    } catch {
      // ignore assignment failure
    }
  }

  dom.setAttribute(key, String(value));
};

/**
 * DOM 요소에 속성(props)을 설정합니다.
 */
export const setDomProps = (
  dom: HTMLElement,
  props: Record<string, any>,
  prevProps: Record<string, any> = {},
): void => {
  for (const key in props) {
    if (key === "children") continue;
    const value = props[key];

    if (isEventProp(key) && typeof value === "function") {
      const event = extractEventName(key);
      const prevHandler = prevProps[key];
      if (prevHandler !== value) {
        if (prevHandler) {
          dom.removeEventListener(event, prevHandler);
        }
        dom.addEventListener(event, value);
      }
      continue;
    }

    if (key === "style" && typeof value === "object") {
      applyStyle(dom, (prevProps.style as Record<string, any>) ?? {}, value);
      continue;
    }

    applyAttribute(dom, key, value);
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
  for (const key in prevProps) {
    if (key === "children") continue;

    if (isEventProp(key)) {
      const prevHandler = prevProps[key];
      const nextHandler = nextProps[key];
      if (typeof prevHandler === "function" && prevHandler !== nextHandler) {
        dom.removeEventListener(extractEventName(key), prevHandler);
      }
      continue;
    }

    if (!(key in nextProps)) {
      applyAttribute(dom, key, undefined);
    }
  }

  setDomProps(dom, nextProps, prevProps);
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
