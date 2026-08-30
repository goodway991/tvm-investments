export type DiscordProfile = {
  discordId: string;
  discordUsername: string;
  discordGlobalName: string | null;
  discordAvatar: string | null;
};

export function parseDiscordProfile(
  data: Record<string, unknown> | undefined,
): DiscordProfile | null {
  if (data?.discordConnected !== true) return null;
  const discordId = typeof data.discordId === "string" ? data.discordId : "";
  const discordUsername =
    typeof data.discordUsername === "string" ? data.discordUsername : "";
  if (!discordId || !discordUsername) return null;
  return {
    discordId,
    discordUsername,
    discordGlobalName:
      typeof data.discordGlobalName === "string" ? data.discordGlobalName : null,
    discordAvatar: typeof data.discordAvatar === "string" ? data.discordAvatar : null,
  };
}

export function discordProfileAvatarUrl(profile: DiscordProfile, size = 128) {
  if (profile.discordAvatar) {
    return `https://cdn.discordapp.com/avatars/${profile.discordId}/${profile.discordAvatar}.png?size=${size}`;
  }
  const fallback = Number(profile.discordId) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${fallback}.png`;
}

export function discordProfileDisplayName(profile: DiscordProfile) {
  return profile.discordGlobalName?.trim() || profile.discordUsername;
}

export function discordProfileHandle(profile: DiscordProfile) {
  return `@${profile.discordUsername}`;
}
