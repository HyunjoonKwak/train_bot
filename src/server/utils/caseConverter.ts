/** Convert a single snake_case key to camelCase */
function toCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = Record<string, any>;

/** Convert all snake_case keys of an object to camelCase */
export function toCamel<T = AnyObject>(obj: AnyObject): T {
  const result: AnyObject = {};
  for (const key of Object.keys(obj)) {
    result[toCamelKey(key)] = obj[key];
  }
  return result as T;
}

/** Convert an array of snake_case objects to camelCase */
export function toCamelArray<T = AnyObject>(arr: AnyObject[]): T[] {
  return arr.map(obj => toCamel<T>(obj));
}
