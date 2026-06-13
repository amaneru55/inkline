export const resources = {
  "zh-CN": {
    translation: {
      app: {
        eyebrow: "Inkline",
        title: "墨线漫画阅读器",
        subtitle:
          "InkNest 项目下的本地优先漫画阅读器，面向 Windows、macOS、Linux、iOS 和 Android。",
      },
      capabilities: {
        label: "规划能力",
        local: {
          index: "01",
          title: "本地阅读",
          description: "预留本地漫画导入、书架、阅读进度和归档格式支持。",
        },
        online: {
          index: "02",
          title: "在线服务",
          description: "预留常见在线漫画源、搜索、订阅和章节缓存能力。",
        },
        ai: {
          index: "03",
          title: "OCR + AI 翻译",
          description: "预留文字识别、翻译、清字和重新嵌入图片的处理流水线。",
        },
      },
      language: {
        label: "语言",
        chinese: "中文",
        english: "English",
      },
      theme: {
        name: {
          label: "主题",
          default: "默认",
          inkline: "墨线",
        },
        mode: {
          label: "外观模式",
          system: "跟随系统",
          light: "亮色",
          dark: "暗色",
          systemWithResolved: "跟随系统，当前为 {{mode}}",
        },
      },
    },
  },
  "en-US": {
    translation: {
      app: {
        eyebrow: "Inkline",
        title: "Inkline Comic Reader",
        subtitle:
          "A local-first comic reader by InkNest for Windows, macOS, Linux, iOS, and Android.",
      },
      capabilities: {
        label: "Planned capabilities",
        local: {
          index: "01",
          title: "Local Reading",
          description:
            "Reserved for local imports, library shelves, progress, and archive formats.",
        },
        online: {
          index: "02",
          title: "Online Services",
          description: "Reserved for comic sources, search, subscriptions, and chapter caching.",
        },
        ai: {
          index: "03",
          title: "OCR + AI Translation",
          description: "Reserved for OCR, translation, text cleanup, and image re-embedding.",
        },
      },
      language: {
        label: "Language",
        chinese: "中文",
        english: "English",
      },
      theme: {
        name: {
          label: "Theme",
          default: "Default",
          inkline: "Inkline",
        },
        mode: {
          label: "Appearance",
          system: "System",
          light: "Light",
          dark: "Dark",
          systemWithResolved: "System, currently {{mode}}",
        },
      },
    },
  },
} as const;

export type Locale = keyof typeof resources;
export type TranslationResource = (typeof resources)["zh-CN"]["translation"];

export const defaultLocale: Locale = "zh-CN";
export const supportedLocales = Object.keys(resources) as Locale[];
