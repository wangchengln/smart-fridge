declare module 'mockjs' {
  interface MockRandom {
    integer(min?: number, max?: number): number;
    float(min?: number, max?: number, dmin?: number, dmax?: number): number;
    pick<T>(arr: readonly T[]): T;
    range(start: number, stop: number, step?: number): number[];
    string(pool?: string, min?: number, max?: number): string;
    cname(): string;
    boolean(min?: number, max?: number): boolean;
    datetime(format?: string): string;
    guid(): string;
  }

  export interface MockRequestOptions {
    url: string;
    type: string;
    body: string;
  }

  type MockTemplateFunction = (options: MockRequestOptions) => unknown;

  interface MockStatic {
    setup: (options: Record<string, unknown>) => void;
    mock: (url: string | RegExp, method: string, template: unknown | MockTemplateFunction) => void;
    Random: MockRandom;
  }

  const Mock: MockStatic;
  export default Mock;
}
