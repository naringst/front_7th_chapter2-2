import { context } from "./context";
import { Fragment, NodeTypes, TEXT_ELEMENT } from "./constants";
import { Instance, VNode } from "./types";
import {
  getFirstDom,
  getFirstDomFromChildren,
  insertInstance,
  removeInstance,
  setDomProps,
  updateDomProps,
} from "./dom";
import { createChildPath } from "./elements";

/**
 * 이전 인스턴스와 새로운 VNode를 비교하여 DOM을 업데이트하는 재조정 과정을 수행합니다.
 *
 * @param parentDom - 부모 DOM 요소
 * @param instance - 이전 렌더링의 인스턴스
 * @param node - 새로운 VNode
 * @param path - 현재 노드의 고유 경로
 * @returns 업데이트되거나 새로 생성된 인스턴스
 */
export const reconcile = (
  parentDom: HTMLElement,
  instance: Instance | null,
  node: VNode | null,
  path: string,
): Instance | null => {
  if (node === null) {
    if (instance) {
      removeInstance(parentDom, instance);
    }
    return null;
  }

  if (!instance) {
    return mountInstance(parentDom, node, path);
  }

  if (shouldReplace(instance, node)) {
    removeInstance(parentDom, instance);
    return mountInstance(parentDom, node, path);
  }

  return updateInstance(parentDom, instance, node, path);
};

const mountInstance = (parentDom: HTMLElement, node: VNode, path: string): Instance | null => {
  if (node.type === TEXT_ELEMENT) {
    const textValue = node.props?.nodeValue ?? "";
    const textNode = document.createTextNode(String(textValue));
    parentDom.appendChild(textNode);
    return {
      kind: NodeTypes.TEXT,
      dom: textNode,
      node,
      children: [],
      key: node.key,
      path,
    };
  }

  if (node.type === Fragment) {
    const children = getVNodeChildren(node);
    const mountedChildren = children
      .map((child, index) => {
        const childPath = createChildPath(path, child.key, index, child.type);
        return reconcile(parentDom, null, child, childPath);
      })
      .filter((child): child is Instance => child !== null);

    return {
      kind: NodeTypes.FRAGMENT,
      dom: null,
      node,
      children: mountedChildren,
      key: node.key,
      path,
    };
  }

  if (typeof node.type === "function") {
    return mountComponent(parentDom, node, path);
  }

  const dom = document.createElement(node.type as string);
  setDomProps(dom, node.props ?? {});
  parentDom.appendChild(dom);

  const childInstances = reconcileChildren(dom, [], getVNodeChildren(node), path);

  return {
    kind: NodeTypes.HOST,
    dom,
    node,
    children: childInstances,
    key: node.key,
    path,
  };
};

const mountComponent = (parentDom: HTMLElement, node: VNode, path: string): Instance | null => {
  const childVNode = renderComponent(node, path);
  const childPath = createChildPath(path, childVNode?.key ?? null, 0, childVNode?.type ?? Fragment);
  const childInstance = reconcile(parentDom, null, childVNode, childPath);

  return {
    kind: NodeTypes.COMPONENT,
    dom: getFirstDom(childInstance),
    node,
    children: childInstance ? [childInstance] : [],
    key: node.key,
    path,
  };
};

const shouldReplace = (instance: Instance, node: VNode): boolean => {
  return instance.node.type !== node.type || instance.key !== node.key;
};

const updateInstance = (parentDom: HTMLElement, instance: Instance, node: VNode, path: string): Instance | null => {
  if (node.type === TEXT_ELEMENT && instance.kind === NodeTypes.TEXT) {
    const textDom = instance.dom as Text | null;
    const nextValue = node.props?.nodeValue ?? "";
    if (textDom && textDom.nodeValue !== nextValue) {
      textDom.nodeValue = String(nextValue);
    }
    instance.node = node;
    return instance;
  }

  if (node.type === Fragment && instance.kind === NodeTypes.FRAGMENT) {
    const children = reconcileChildren(parentDom, instance.children, getVNodeChildren(node), path);
    instance.children = children;
    instance.node = node;
    instance.dom = getFirstDomFromChildren(children);
    return instance;
  }

  if (typeof node.type === "function" && instance.kind === NodeTypes.COMPONENT) {
    const prevChild = instance.children[0] ?? null;
    const rendered = renderComponent(node, path);
    const childPath = prevChild?.path ?? createChildPath(path, rendered?.key ?? null, 0, rendered?.type ?? Fragment);
    const childInstance = reconcile(parentDom, prevChild, rendered, childPath);

    instance.node = node;
    instance.children = childInstance ? [childInstance] : [];
    instance.dom = getFirstDom(childInstance);
    return instance;
  }

  if (typeof node.type === "string" && instance.kind === NodeTypes.HOST) {
    const dom = instance.dom as HTMLElement | null;
    if (!dom) return instance;

    updateDomProps(dom, instance.node.props ?? {}, node.props ?? {});
    const children = reconcileChildren(dom, instance.children, getVNodeChildren(node), path);

    instance.node = node;
    instance.children = children;
    return instance;
  }

  // 유형이 달라졌다면 새로 마운트합니다.
  removeInstance(parentDom, instance);
  return mountInstance(parentDom, node, path);
};

const relocateHookState = (oldPath: string, newPath: string): void => {
  if (oldPath === newPath) return;

  const hooks = context.hooks.state.get(oldPath);
  if (hooks) {
    context.hooks.state.set(newPath, hooks);
    context.hooks.state.delete(oldPath);
  }

  for (const task of context.effects.queue) {
    if (task.path === oldPath) {
      task.path = newPath;
    }
  }
};

const relocateInstancePath = (instance: Instance, newPath: string): void => {
  if (instance.path === newPath) return;
  relocateHookState(instance.path, newPath);
  instance.path = newPath;
};

const reconcileChildren = (
  parentDom: HTMLElement,
  prevChildren: (Instance | null)[],
  nextChildren: VNode[],
  parentPath: string,
): Instance[] => {
  const keyed = new Map<string | number, Instance>();
  const unkeyed: Instance[] = [];

  for (const child of prevChildren) {
    if (!child) continue;
    if (child.key !== null) {
      keyed.set(child.key, child);
    } else {
      unkeyed.push(child);
    }
  }

  const takeUnkeyedInstance = (node: VNode): Instance | null => {
    const idx = unkeyed.findIndex((child) => child.node.type === node.type);
    if (idx >= 0) {
      const [matched] = unkeyed.splice(idx, 1);
      return matched ?? null;
    }
    return null;
  };

  const orderedChildren: Instance[] = [];

  nextChildren.forEach((child, index) => {
    const key = child.key;
    let matched: Instance | null = null;

    if (key !== null) {
      matched = keyed.get(key) ?? null;
      if (matched) {
        keyed.delete(key);
      }
    } else if (unkeyed.length > 0) {
      matched = takeUnkeyedInstance(child);
    }

    const desiredPath = createChildPath(parentPath, key, index, child.type);
    if (matched && matched.path !== desiredPath) {
      relocateInstancePath(matched, desiredPath);
    }

    const childPath = matched?.path ?? desiredPath;
    const reconciled = reconcile(parentDom, matched, child, childPath);
    if (reconciled) {
      orderedChildren[index] = reconciled;
    }
  });

  for (const leftover of keyed.values()) {
    removeInstance(parentDom, leftover);
  }
  for (const leftover of unkeyed) {
    removeInstance(parentDom, leftover);
  }

  // Ensure DOM nodes are ordered correctly
  let anchor: HTMLElement | Text | null = null;
  for (let i = orderedChildren.length - 1; i >= 0; i--) {
    const child = orderedChildren[i];
    if (!child) continue;
    const firstDom = getFirstDom(child);
    if (firstDom && firstDom !== anchor) {
      insertInstance(parentDom, child, anchor);
    }
    if (firstDom) {
      anchor = firstDom;
    }
  }

  return orderedChildren.filter((child): child is Instance => Boolean(child));
};

const getVNodeChildren = (node: VNode): VNode[] => {
  return (node.props?.children ?? []) as VNode[];
};

const renderComponent = (node: VNode, path: string): VNode | null => {
  const component = node.type as React.ComponentType<Record<string, unknown>>;

  context.hooks.componentStack.push(path);
  context.hooks.cursor.set(path, 0);
  context.hooks.visited.add(path);

  try {
    return component(node.props ?? {});
  } finally {
    context.hooks.componentStack.pop();
  }
};
