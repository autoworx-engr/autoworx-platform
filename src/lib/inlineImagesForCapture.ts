/**
 * Convert every <img> inside `root` to a base64 data URI before an html2canvas
 * capture, then return a restore() to put the originals back.
 *
 * Why: html2canvas re-fetches images during capture. Cross-origin (S3) images
 * without CORS headers make it stall forever — the PDF "loading" never ends.
 * Data URIs need no network and no CORS, so capture always succeeds.
 *
 * Images are fetched via their on-page src (which should be same-origin, e.g.
 * an /api/proxy-image URL) so the fetch itself is never blocked by CORS.
 */
export async function inlineImagesForCapture(
  root: HTMLElement,
): Promise<() => void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  const restores: Array<() => void> = [];

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.currentSrc || img.src;
      if (!src || src.startsWith("data:")) return;

      try {
        const res = await fetch(src, { cache: "no-store" });
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = () => reject(new Error("FileReader failed"));
          fr.readAsDataURL(blob);
        });

        const originalSrc = img.src;
        const originalSrcset = img.srcset;
        img.srcset = "";
        img.src = dataUrl;
        await img.decode().catch(() => {});

        restores.push(() => {
          img.src = originalSrc;
          img.srcset = originalSrcset;
        });
      } catch {
        // Leave this image untouched if it can't be inlined.
      }
    }),
  );

  return () => restores.forEach((r) => r());
}
