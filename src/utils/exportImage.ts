import type { DesignDocument, Project } from "../types";
import { getScene, getTemplate } from "../data/scenes";

export function buildExportFileName(project: Project, document: DesignDocument) {
  const scene = getScene(document.sceneId);
  const template = getTemplate(document.sceneId, document.templateId);
  const safeProjectName = project.name.replace(/[\\/:*?"<>|]/g, "_");
  return `${safeProjectName}_${scene?.name || "场景"}_${template?.name || "模板"}_${document.canvas.width}x${document.canvas.height}.png`;
}

export async function exportDesignAsPng(_node: HTMLElement | null, project: Project, document: DesignDocument) {
  // Future extension point: wire html-to-image or a server-side renderer here.
  return {
    ok: true,
    fileName: buildExportFileName(project, document)
  };
}
