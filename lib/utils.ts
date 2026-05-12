import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  delayMs = 0
): Promise<(T | null)[]> {
  const results: (T | null)[] = new Array(tasks.length).fill(null);
  for (let i = 0; i < tasks.length; i += limit) {
    const settled = await Promise.allSettled(tasks.slice(i, i + limit).map((fn) => fn()));
    settled.forEach((r, j) => {
      if (r.status === "fulfilled") results[i + j] = r.value;
    });
    if (delayMs > 0 && i + limit < tasks.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results;
}
