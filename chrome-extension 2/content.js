document.addEventListener(
  "contextmenu",
  (event) => {
    const srcUrl = findContextImage(event);
    if (!srcUrl) return;
    void chrome.runtime.sendMessage({ type: "ai-journal-context-image", srcUrl }).catch(() => undefined);
  },
  true
);

function findContextImage(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return "";

  const candidates = [];
  const addImage = (image, priority = 0) => {
    if (!(image instanceof HTMLImageElement)) return;
    const src = image.currentSrc || image.src;
    const width = image.naturalWidth || image.clientWidth;
    const height = image.naturalHeight || image.clientHeight;
    if (!src || width < 40 || height < 40) return;
    candidates.push({ src, priority, area: width * height });
  };

  if (target instanceof HTMLImageElement) addImage(target, 120);
  document.elementsFromPoint(event.clientX, event.clientY).forEach((element) => addImage(element, 110));

  if (target instanceof HTMLVideoElement && target.poster) {
    candidates.push({ src: target.poster, priority: 120, area: target.clientWidth * target.clientHeight });
  }
  if (target instanceof HTMLCanvasElement) {
    try {
      candidates.push({ src: target.toDataURL("image/png"), priority: 120, area: target.width * target.height });
    } catch {
      // Cross-origin canvases cannot be exported; continue with nearby image candidates.
    }
  }

  let container = target;
  for (let depth = 0; container && depth < 6; depth += 1, container = container.parentElement) {
    if (container === document.body || container === document.documentElement) break;
    container.querySelectorAll("img").forEach((image) => addImage(image, 100 - depth * 12));
    const backgroundImage = getComputedStyle(container).backgroundImage;
    const backgroundUrl = backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if (backgroundUrl) candidates.push({ src: backgroundUrl, priority: 95 - depth * 12, area: container.clientWidth * container.clientHeight });
  }

  candidates.sort((left, right) => right.priority - left.priority || right.area - left.area);
  return candidates[0]?.src || "";
}
