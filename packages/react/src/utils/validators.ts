/**
 * VNode가 렌더링되지 않아야 하는 값인지 확인합니다.
 * (예: null, undefined, boolean)
 *
 * @param value - 확인할 값
 * @returns 렌더링되지 않아야 하면 true, 그렇지 않으면 false
 */
export const isEmptyValue = (value: unknown): boolean => {
  // null, undefined, boolean 값은 모두 렌더링되지 않음
  if (value === null || value === undefined) return true;
  if (typeof value === "boolean") return true;

  // 나머지는 렌더링됨 (숫자/문자/객체 등)
  return false;
};
