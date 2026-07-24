import { useEffect, useMemo, useState } from "react";
import { getStorageObjectUrl } from "@/lib/storage";

export function useStorageObjectUrl(bucket: string, rawUrl?: string | null) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveUrl = async () => {
      const nextUrl = await getStorageObjectUrl(bucket, rawUrl);
      if (!cancelled) {
        setResolvedUrl(nextUrl);
      }
    };

    void resolveUrl();

    return () => {
      cancelled = true;
    };
  }, [bucket, rawUrl]);

  return resolvedUrl;
}

export function useStorageObjectUrlMap(
  bucket: string,
  rawUrls: Array<string | null | undefined>,
) {
  const rawUrlsKey = useMemo(
    () => rawUrls.map((value) => value?.trim() ?? "").join("||"),
    [rawUrls],
  );
  const uniqueUrls = useMemo(
    () =>
      Array.from(
        new Set(
          rawUrls
            .map((value) => value?.trim() ?? "")
            .filter((value) => Boolean(value)),
        ),
      ),
    [rawUrlsKey],
  );
  const [resolvedMap, setResolvedMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const resolveUrls = async () => {
      if (uniqueUrls.length === 0) {
        if (!cancelled) {
          setResolvedMap({});
        }
        return;
      }

      const entries = await Promise.all(
        uniqueUrls.map(async (value) => [value, await getStorageObjectUrl(bucket, value)] as const),
      );

      if (cancelled) return;

      setResolvedMap(
        Object.fromEntries(
          entries.filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
        ),
      );
    };

    void resolveUrls();

    return () => {
      cancelled = true;
    };
  }, [bucket, uniqueUrls]);

  return resolvedMap;
}
