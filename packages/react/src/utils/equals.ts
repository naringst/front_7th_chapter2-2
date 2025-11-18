/**
 * 두 값의 얕은 동등성을 비교합니다.
 * 객체와 배열은 1단계 깊이까지만 비교합니다.
 */
export const shallowEquals = (a: unknown, b: unknown): boolean => {
  // 타입이 다르면 false
  if (typeof a !== typeof b) return false;

  // NaN 비교
  if (typeof a === "number" && typeof b === "number") {
    if (isNaN(a) && isNaN(b)) return true;
  }

  // 기본 타입 비교
  if (a === null || b === null || typeof a !== "object") {
    return Object.is(a, b);
  }

  // 배열 얕은 비교
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      // 1단계까지만 비교 → 참조 비교
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }

  // 객체 얕은 비교
  if (!Array.isArray(a) && !Array.isArray(b)) {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!(key in objB)) return false;

      // 1단계까지만 비교 → 값 or 참조만 비교
      // 깊게 들어가지 않는다.
      if (!Object.is(objA[key], objB[key])) return false;
    }

    return true;
  }

  // 배열/객체 형태 mismatch
  return false;
};

/**
 * 두 값의 깊은 동등성을 비교합니다.
 * 객체와 배열의 모든 중첩된 속성을 재귀적으로 비교합니다.
 */
export const deepEquals = (a: unknown, b: unknown): boolean => {
  // Object.is 로 기본 타입 및 NaN 정확 비교
  if (Object.is(a, b)) return true;

  // 타입 다르면 무조건 false
  if (typeof a !== typeof b) return false;

  // null 비교
  if (a === null || b === null) return false;

  // 배열 비교
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], b[i])) return false;
    }
    return true;
  }

  // 객체 비교
  if (typeof a === "object" && typeof b === "object") {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!(key in objB)) return false;
      if (!deepEquals(objA[key], objB[key])) return false;
    }

    return true;
  }

  // 다른 경우들은 Object.is 에서 이미 걸러짐
  return false;
};
