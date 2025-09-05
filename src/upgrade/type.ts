export type MementoItem<T> = {
    lastUpdatedTs: number;
    data: T;
}

export type DependencyCheckItem = { name: string, supportedVersion: string }
export type DependencyCheckMetadata = Record<string, DependencyCheckItem>