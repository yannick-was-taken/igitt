import ini from "ini";
import path from "path";
import { config } from "./index";

type InitOptions = {
    bare?: boolean,
    defaultBranch?: string,
};

export class RepoNotFound extends Error {
    constructor(what: string) {
        super(what);
    }
}

export class RepoLocationNotEmpty extends Error {
    constructor(what: string) {
        super(what);
    }
}

export class RepoBareStatusMismatch extends Error {
    constructor(requested: boolean, found: boolean) {
        super(`bare status mismatch, requested bare = ${requested}, found bare = ${found}`);
    }
}

type RepositoryMeta = {
    bare: boolean,
};

export class GitRepository {
    private constructor(readonly repoPath: string, readonly gitDir: string, readonly meta: RepositoryMeta) {}

    static async init(repoPath: string, options: InitOptions = {}): Promise<GitRepository> {
        const fs = config.fileSystemProvider();

        repoPath = path.normalize(repoPath);
        if (fs.existsSync(repoPath)) {
            let files = await fs.promises.readdir(repoPath);
            if (files.length > 0) {
                throw new RepoLocationNotEmpty(`${repoPath} exists and is not empty`);
            }
        }

        await fs.promises.mkdir(repoPath, { recursive: true });
        options.bare = options.bare || false;
        options.defaultBranch = options.defaultBranch || "main";

        const gitDir = options.bare ? repoPath : path.join(repoPath, ".git");
        if (!options.bare) {
            await fs.promises.mkdir(gitDir);
        }

        // https://git-scm.com/docs/gitrepository-layout
        const folders = [
            "objects",
            "refs/heads",
            "refs/tags",
        ];
        for (const folder of folders) {
            await fs.promises.mkdir(path.join(gitDir, folder), { recursive: true });
        }

        await fs.promises.writeFile(path.join(gitDir, "HEAD"), `ref: refs/heads/${options.defaultBranch}`);

        const gitConfig = {
            core: {
                repositoryformatversion: 0,
                filemode: true,
                bare: options.bare,
            }
        };

        await fs.promises.writeFile(path.join(gitDir, "config"), ini.stringify(gitConfig));

        return new GitRepository(repoPath, gitDir, {
            bare: options.bare,
        });
    }

    static async open(repoPath: string): Promise<GitRepository> {
        const fs = config.fileSystemProvider();

        repoPath = path.normalize(repoPath);
        if (!fs.existsSync(repoPath)) {
            throw new RepoNotFound(repoPath);
        }

        let bare: boolean = true;
        if (fs.existsSync(path.join(repoPath, ".git"))) {
            bare = false;
        }

        const gitDir = bare ? repoPath : path.join(repoPath, ".git");
        return new GitRepository(repoPath, gitDir, {
            bare,
        });
    }

    static async openOrInit(repoPath: string, options: InitOptions = {}): Promise<GitRepository> {
        try {
            const repo = await GitRepository.open(repoPath);
            options.bare = options.bare || false;
            if (options.bare != repo.meta.bare) {
                throw new RepoBareStatusMismatch(options.bare, repo.meta.bare);
            }
            return repo;
        } catch (e) {
            if (e instanceof RepoNotFound) {
                return await GitRepository.init(repoPath, options);
            } else {
                throw e;
            }
        }
    }
}
