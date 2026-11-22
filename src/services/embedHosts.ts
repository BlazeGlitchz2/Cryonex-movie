const STATIC_FRAME_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
];

function hostOf(template: string): string | null {
  try {
    return new URL(template.replace(/\{[^}]+\}/g, "1")).hostname;
  } catch {
    return null;
  }
}

export async function syncEmbedHosts(templates: string[]): Promise<void> {
  const hosts = new Set<string>(STATIC_FRAME_HOSTS);
  for (const template of templates) {
    const host = hostOf(template);
    if (host) {
      hosts.add(host);
    }
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("set_embed_hosts", { hosts: Array.from(hosts) });
  } catch {
    // plain browser dev has no ipc and no native guard to sync
  }
}
