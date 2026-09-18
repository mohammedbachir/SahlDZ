import { createServerFn } from "@tanstack/react-start";

type GithubCfg = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
};

function readGithubCfg(): GithubCfg {
  return {
    token: process.env.GITHUB_IMG_TOKEN || "",
    owner: process.env.GITHUB_IMG_OWNER || "",
    repo: process.env.GITHUB_IMG_REPO || "",
    branch: process.env.GITHUB_IMG_BRANCH || "main",
  };
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/**
 * Uploads a file (base64) to a GitHub repository via the Contents API and
 * returns a public `raw.githubusercontent.com` download URL. The repo must be
 * public so images are directly usable in <img> tags.
 */
export const uploadImageToGithub = createServerFn({ method: "POST" })
  .validator((d: { path: string; base64: string; commitMessage?: string }) => d)
  .handler(async ({ data }) => {
    const cfg = readGithubCfg();
    if (!cfg.token || !cfg.owner || !cfg.repo) {
      throw new Error(
        "مخزن GitHub غير مُهيّأ — أضف GITHUB_IMG_TOKEN و GITHUB_IMG_OWNER و GITHUB_IMG_REPO في ملف .env",
      );
    }

    const cleanPath = data.path.replace(/^\/+/, "").trim();
    if (!cleanPath) throw new Error("مسار الصورة غير صالح");

    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodePath(cleanPath)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: data.commitMessage || `sahldz: upload ${cleanPath}`,
        content: data.base64,
        branch: cfg.branch,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const msg =
        (body as any)?.message || `GitHub رفض الرفع (HTTP ${res.status})`;
      throw new Error(msg);
    }

    const json: any = await res.json();
    const downloadUrl: string | undefined = json?.content?.download_url;
    if (!downloadUrl) throw new Error("GitHub لم يُرجع رابط الصورة");
    return {
      url: downloadUrl,
      path: json?.content?.path ?? cleanPath,
      sha: json?.content?.sha ?? null,
    };
  });
