export function lazySchema<T>(fn: () => T): () => T { return fn }
