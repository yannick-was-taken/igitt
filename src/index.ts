import fs from "fs";
import ini from "ini";
import path from "path";

type InitOptions = {
    bare?: boolean,
    defaultBranch?: string,
};

export default class GitRepository {
    private constructor(readonly repoPath: string, readonly gitDir: string) {}

    static async init(repoPath: string, options: InitOptions = {}): Promise<GitRepository> {
        repoPath = path.normalize(repoPath);
        await fs.promises.mkdir(repoPath, { recursive: true });
        options.bare = options.bare || false;
        options.defaultBranch = options.defaultBranch || "main";

        const gitDir = options.bare ? repoPath : path.join(repoPath, ".git");
        if (fs.existsSync(gitDir)) {
            if (fs.existsSync(path.join(gitDir, "HEAD"))) {
                throw new Error("Git repository already exists and is not empty!");
            }
        }

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

        return new GitRepository(repoPath, gitDir);
    }
}
