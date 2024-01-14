import { Volume, vol } from "memfs";
import { GitRepository, RepoLocationNotEmpty, RepoNotFound, config } from "./index";
import { RepoBareStatusMismatch } from "./repository";

function expectRepoThere(fs: typeof vol, gitDir: string, there: boolean = true) {
    expect(fs.existsSync(`${gitDir}/HEAD`)).toBe(there);
    expect(fs.existsSync(`${gitDir}/config`)).toBe(there);
    expect(fs.existsSync(`${gitDir}/refs/heads`)).toBe(there);
}

let fs: typeof vol;
beforeEach(() => {
    fs = new Volume;
    config.fileSystemProvider = () => fs;
});
const repoPath = "/test";
const repoPathDotGit = "/test/.git";

test("should init a git repo if there is not one already", async () => {
    expect(fs.existsSync(repoPath)).toBe(false);
    await GitRepository.init(repoPath);

    expectRepoThere(fs, repoPathDotGit);
});

test("should init a git repo if the folder is there but empty", async () => {
    await fs.promises.mkdir(repoPath);
    await GitRepository.init(repoPath);

    expectRepoThere(fs, repoPathDotGit);
});

test("should init a bare git repo if there is not one already", async () => {
    expect(fs.existsSync(repoPath)).toBe(false);
    await GitRepository.init(repoPath, { bare: true });

    expectRepoThere(fs, repoPath);
});


test("should init a bare git repo if the folder is there but empty", async () => {
    await GitRepository.init(repoPath, { bare: true });

    expectRepoThere(fs, repoPath);
});

test("should NOT init a git repo if the folder is there and not empty", async () => {
    // Note: even .git is not allowed
    await fs.promises.mkdir(repoPathDotGit, { recursive: true });

    await expect(GitRepository.init(repoPath)).rejects.toThrow(RepoLocationNotEmpty);
    expectRepoThere(fs, repoPath, false);
});

test("should NOT init a bare git repo if the folder is there and not empty", async () => {
    await fs.promises.mkdir(repoPath + "/foobar", { recursive: true });

    await expect(GitRepository.init(repoPath, { bare: true })).rejects.toThrow(RepoLocationNotEmpty);
    expectRepoThere(fs, repoPath, false);
});

test("should open an existing git repo", async () => {
    await GitRepository.init(repoPath);

    let repo: GitRepository = await GitRepository.open(repoPath);
    expect(repo.repoPath).toBe(repoPath);
    expect(repo.gitDir).toBe(repoPathDotGit);
    expect(repo.meta.bare).toBe(false);
});

test("should open an existing bare git repo", async () => {
    await GitRepository.init(repoPath, { bare: true });

    const repo = await GitRepository.open(repoPath);
    expect(repo.repoPath).toBe(repoPath);
    expect(repo.gitDir).toBe(repoPath);
    expect(repo.meta.bare).toBe(true);
});

test("should NOT open a not existing git repo", async () => {
    await expect(GitRepository.open(repoPath)).rejects.toThrow(RepoNotFound);
});

test("should openOrInit a non existing git repo", async () => {
    const repo = await GitRepository.openOrInit(repoPath);
    expect(repo.repoPath).toBe(repoPath);
    expect(repo.gitDir).toBe(repoPathDotGit);
    expect(repo.meta.bare).toBe(false);
});

test("should openOrInit a non existing bare git repo", async () => {
    const repo = await GitRepository.openOrInit(repoPath, { bare: true });
    expect(repo.repoPath).toBe(repoPath);
    expect(repo.gitDir).toBe(repoPath);
    expect(repo.meta.bare).toBe(true);
});

test("should openOrInit an existing git repo", async () => {
    await GitRepository.init(repoPath);

    const repo = await GitRepository.openOrInit(repoPath);
    expect(repo.repoPath).toBe(repoPath);
    expect(repo.gitDir).toBe(repoPathDotGit);
    expect(repo.meta.bare).toBe(false);
});

test("should openOrInit an existing bare git repo", async () => {
    await GitRepository.init(repoPath, { bare: true });

    const repo = await GitRepository.openOrInit(repoPath, { bare: true });
    expect(repo.repoPath).toBe(repoPath);
    expect(repo.gitDir).toBe(repoPath);
    expect(repo.meta.bare).toBe(true);
});

test("should NOT openOrInit an existing git repo when bare requested", async () => {
    await GitRepository.init(repoPath, { bare: false });

    await expect(GitRepository.openOrInit(repoPath, { bare: true })).rejects.toThrow(RepoBareStatusMismatch);
});

test("should NOT openOrInit an existing bare git repo when regular requested", async () => {
    await GitRepository.init(repoPath, { bare: true });

    await expect(GitRepository.openOrInit(repoPath, { bare: false })).rejects.toThrow(RepoBareStatusMismatch);
});
