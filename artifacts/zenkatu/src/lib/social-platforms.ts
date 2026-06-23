import {
  Youtube,
  Instagram,
  MessageCircle,
  Twitter,
  Music,
  Globe,
  type LucideIcon,
} from "lucide-react";

export type SocialPlatformKey = "youtube" | "instagram" | "discord" | "twitter" | "tiktok" | "site";

export interface SocialPlatform {
  key: SocialPlatformKey;
  label: string;
  icon: LucideIcon;
  color: string;
  match: (url: string) => boolean;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: "youtube",   label: "YouTube",     icon: Youtube,       color: "text-red-500",    match: u => /youtube\.com|youtu\.be/.test(u) },
  { key: "instagram", label: "Instagram",   icon: Instagram,     color: "text-pink-500",   match: u => /instagram\.com/.test(u) },
  { key: "discord",   label: "Discord",     icon: MessageCircle, color: "text-indigo-400", match: u => /discord\.(gg|com)/.test(u) },
  { key: "twitter",   label: "Twitter / X", icon: Twitter,       color: "text-sky-400",    match: u => /twitter\.com|x\.com/.test(u) },
  { key: "tiktok",    label: "TikTok",      icon: Music,         color: "text-foreground", match: u => /tiktok\.com/.test(u) },
  { key: "site",      label: "Site",        icon: Globe,         color: "text-primary",    match: () => true },
];

export function detectPlatform(url: string): SocialPlatform {
  for (const p of SOCIAL_PLATFORMS) {
    if (p.key !== "site" && p.match(url)) return p;
  }
  return SOCIAL_PLATFORMS.find(p => p.key === "site")!;
}

export interface SocialLink {
  url: string;
}

export function parseSocialLinks(raw: string | undefined): SocialLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
