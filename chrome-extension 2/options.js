const DEFAULT_SETTINGS = {
  apiBaseUrl: "https://ai-journal-nmo9.onrender.com",
  appUrl: "https://ai-journal-nmo9.onrender.com",
  promptTemplate: `请你作为一名资深视觉设计师和 AI 视觉风格分析师，基于用户上传的参考图反推出一段可复用的 AI 生图 prompt。

请重点分析：
1. 视觉类型与设计语言
2. 构图系统与视觉重心
3. 核心元素、必要元素、禁止元素
4. 字体气质与图文关系
5. 色彩系统、饱和度、明度、对比度
6. 材质、肌理、颗粒、印刷或手绘特征
7. 信息密度与层级
8. 最容易翻车的 Anti-AI 规则

最终输出要能直接用于 AI 生图工具。
生图 prompt 请同时提供两部分：
中文版本：用中文准确描述画面类型、构图、字体、色彩、材质、肌理、元素关系和禁忌。
English version：保留原来高质量英文生图 prompt 的表达方式，可直接复制到 AI 生图工具。`
};

const apiBaseUrl = document.querySelector("#apiBaseUrl");
const appUrl = document.querySelector("#appUrl");
const promptTemplate = document.querySelector("#promptTemplate");
const status = document.querySelector("#status");

init();

async function init() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  apiBaseUrl.value = settings.apiBaseUrl || DEFAULT_SETTINGS.apiBaseUrl;
  appUrl.value = settings.appUrl || DEFAULT_SETTINGS.appUrl;
  promptTemplate.value = settings.promptTemplate || DEFAULT_SETTINGS.promptTemplate;
}

document.querySelector("#save").addEventListener("click", async () => {
  await chrome.storage.sync.set({
    apiBaseUrl: apiBaseUrl.value.trim() || DEFAULT_SETTINGS.apiBaseUrl,
    appUrl: appUrl.value.trim() || DEFAULT_SETTINGS.appUrl,
    promptTemplate: promptTemplate.value.trim() || DEFAULT_SETTINGS.promptTemplate
  });
  flash("已保存");
});

document.querySelector("#restore").addEventListener("click", () => {
  apiBaseUrl.value = DEFAULT_SETTINGS.apiBaseUrl;
  appUrl.value = DEFAULT_SETTINGS.appUrl;
  promptTemplate.value = DEFAULT_SETTINGS.promptTemplate;
  flash("已恢复默认，记得保存");
});

function flash(message) {
  status.textContent = message;
  window.setTimeout(() => {
    status.textContent = "";
  }, 1600);
}
