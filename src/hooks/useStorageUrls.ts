import { useEffect, useMemo, useState } from "react";
import { getStorageObjectUrl } from "@/lib/storage";

export function useStorageObjectUrl(bucket: string, rawUrl?: string | null) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdBlobUrl: string | null = null;

    const resolveUrl = async () => {
      const nextUrl = await getStorageObjectUrl(bucket, rawUrl);
      if (cancelled) {
        if (nextUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(nextUrl);
        }
        return;
      }

      if (nextUrl?.startsWith("blob:")) {
        createdBlobUrl = nextUrl;
      }

      setResolvedUrl((currentUrl) => {
        if (currentUrl?.startsWith("blob:") && currentUrl !== nextUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return nextUrl;
      });
    };

    void resolveUrl();

    return () => {
      cancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
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
    let createdBlobUrls: string[] = [];

    const resolveUrls = async () => {
      if (uniqueUrls.length === 0) {
        if (!cancelled) {
          setResolvedMap((currentMap) => {
            Object.values(currentMap).forEach((url) => {
              if (url.startsWith("blob:")) {
                URL.revokeObjectURL(url);
              }
            });
            return {};
          });
        }
        return;
      }

      const entries = await Promise.all(
        uniqueUrls.map(async (value) => [value, await getStorageObjectUrl(bucket, value)] as const),
      );

      if (cancelled) return;

      createdBlobUrls = entries
        .map((entry) => entry[1])
        .filter((url): url is string => Boolean(url?.startsWith("blob:")));

      setResolvedMap(
        (currentMap) => {
          Object.values(currentMap).forEach((url) => {
            if (url.startsWith("blob:") && !createdBlobUrls.includes(url)) {
              URL.revokeObjectURL(url);
            }
          });

          return Object.fromEntries(
            entries.filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
          );
        },
      );
    };

    void resolveUrls();

    return () => {
      cancelled = true;
      createdBlobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [bucket, uniqueUrls]);

  return resolvedMap;
}
