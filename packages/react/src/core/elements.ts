/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEmptyValue } from "../utils";
import { VNode } from "./types";
import { Fragment, TEXT_ELEMENT } from "./constants";

/**
 * 주어진 노드를 VNode 형식으로 정규화합니다.
 * null, undefined, boolean, 배열, 원시 타입 등을 처리하여 일관된 VNode 구조를 보장합니다.
 */
export const normalizeNode = (node: any): VNode | null => {
  if (isEmptyValue(node)) return null;
  if (typeof node === "string" || typeof node === "number") {
    return createTextElement(node);
  }
  if (typeof node === "object" && node !== null && "type" in node && "props" in node) {
    return node;
  }
  return null;
};
/**
 * 텍스트 노드를 위한 VNode를 생성합니다.
 */
const createTextElement = (value: string | number): VNode => {
  return {
    type: TEXT_ELEMENT,
    key: null,
    props: {
      children: [],
      nodeValue: String(value),
    },
  };
};

/**
 * JSX → createElement 변환
 */
export const createElement = (
  type: string | symbol | React.ComponentType<any>,
  originProps?: Record<string, any> | null,
  ...rawChildren: any[]
) => {
  const { key = null, ...restProps } = originProps ?? {};

  const flattenChildren = (children: any[]): any[] => {
    const result: any[] = [];
    for (const child of children) {
      if (Array.isArray(child)) {
        result.push(...flattenChildren(child));
      } else {
        result.push(child);
      }
    }
    return result;
  };

  const normalizedChildren = flattenChildren(rawChildren)
    .map((child) => normalizeNode(child))
    .filter((child): child is VNode => child !== null);

  const props: Record<string, any> = {
    ...restProps,
  };

  if (normalizedChildren.length > 0) {
    props.children = normalizedChildren;
  }

  return {
    type,
    key,
    props,
  };
};

/**
 * 부모 경로와 자식의 key/index를 기반으로 고유한 경로를 생성합니다.
 * 훅 상태 유지와 Reconciliation에서 노드를 식별하는 데 사용됨.
 */
export const createChildPath = (
  parentPath: string,
  key: string | null,
  index: number,
  nodeType?: string | symbol | React.ComponentType,
): string => {
  const base = key ?? index.toString();

  // type이 문자열이면 태그명, 아니면 함수형 컴포넌트로 단순화
  const typeLabel = typeof nodeType === "string" ? nodeType : nodeType === Fragment ? "fragment" : "cmp";

  return `${parentPath}/${typeLabel}:${base}`;
};
