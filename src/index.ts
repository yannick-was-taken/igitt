type ReadDirReturns = (
    | string
    | Buffer
    | {}
)[];

type FileSystemProvider = {
    promises: {
        mkdir: (path: string, options?: { recursive: boolean }) => Promise<string | undefined>,
        writeFile: (path: string, data: string) => Promise<void>,
        readdir: (path: string) => Promise<ReadDirReturns>,
    },
    existsSync: (path: string) => boolean,
};

type PackageConfig = {
    fileSystemProvider: () => FileSystemProvider,
};

export const config: PackageConfig = {
    fileSystemProvider: () => require("fs"),
};

import { GitRepository, RepoLocationNotEmpty, RepoNotFound } from "./repository";
export { GitRepository, RepoLocationNotEmpty, RepoNotFound };
