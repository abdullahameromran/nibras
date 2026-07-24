const DISPLAY_PLACEHOLDER_NAMES = new Set([
  "user",
  "unknown",
  "conversation",
  "welcome",
  "welcome back",
  "hello",
  "hi",
  "مرحبًا",
  "مرحبا",
  "مرحبًا بعودتك",
  "مرحبا بعودتك",
  "مستخدم",
  "غير معروف",
  "محادثة",
]);

function normalizeDisplayValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[!?,.:;،؛]+/g, "")
    .replace(/\s+/g, " ");
}

export function sanitizeDisplayName(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return DISPLAY_PLACEHOLDER_NAMES.has(normalizeDisplayValue(trimmed)) ? null : trimmed;
}

export function isPlaceholderDisplayName(value?: string | null) {
  return sanitizeDisplayName(value) === null;
}

export function isEmailLike(value?: string | null) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function shouldPreferFallbackDisplayName(value?: string | null) {
  const cleaned = sanitizeDisplayName(value);
  return !cleaned || isEmailLike(cleaned);
}

export function formatDisplayName(
  parts: Array<string | null | undefined>,
  fallback?: string | null,
  finalFallback = "User",
) {
  const cleanedParts = parts
    .map((part) => sanitizeDisplayName(part))
    .filter((part): part is string => Boolean(part));

  if (cleanedParts.length > 0) {
    return cleanedParts.join(" ");
  }

  const cleanedFallback = sanitizeDisplayName(fallback);
  if (cleanedFallback) {
    return cleanedFallback;
  }

  return finalFallback;
}

export function getDisplayInitials(value?: string | null, fallback = "U") {
  const source = sanitizeDisplayName(value) ?? sanitizeDisplayName(fallback) ?? "U";
  const segments = source.split(/[\s@._-]+/).filter(Boolean);
  const initials = segments.map((segment) => Array.from(segment)[0]).join("").slice(0, 2);

  if (initials) {
    return initials.toUpperCase();
  }

  return Array.from(source).slice(0, 2).join("").toUpperCase() || "U";
}

export function resolveShellDisplayName({
  name,
  role,
  translatedRole,
  fallback = "User",
}: {
  name?: string | null;
  role?: string | null;
  translatedRole?: string | null;
  fallback?: string | null;
}) {
  const cleanedName = sanitizeDisplayName(name);
  if (cleanedName && !isEmailLike(cleanedName)) {
    return cleanedName;
  }

  const cleanedTranslatedRole = sanitizeDisplayName(translatedRole);
  if (cleanedTranslatedRole) {
    return cleanedTranslatedRole;
  }

  const cleanedRole = sanitizeDisplayName(role);
  if (cleanedRole) {
    return cleanedRole;
  }

  if (cleanedName) {
    return cleanedName;
  }

  return sanitizeDisplayName(fallback) ?? "User";
}
