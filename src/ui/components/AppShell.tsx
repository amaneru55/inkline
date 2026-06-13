import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";

type Capability = {
  id: string;
  indexKey: string;
  titleKey: string;
  descriptionKey: string;
};

const capabilities = [
  {
    id: "local",
    indexKey: "capabilities.local.index",
    titleKey: "capabilities.local.title",
    descriptionKey: "capabilities.local.description",
  },
  {
    id: "online",
    indexKey: "capabilities.online.index",
    titleKey: "capabilities.online.title",
    descriptionKey: "capabilities.online.description",
  },
  {
    id: "ai",
    indexKey: "capabilities.ai.index",
    titleKey: "capabilities.ai.title",
    descriptionKey: "capabilities.ai.description",
  },
] as const satisfies readonly Capability[];

export function AppShell() {
  const { t } = useTranslation();

  return (
    <main className="app-shell">
      <header className="titlebar">
        <p className="brand-mark">{t("app.eyebrow")}</p>
        <div className="app-controls">
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </header>

      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="hero"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <p className="eyebrow">{t("app.eyebrow")}</p>
        <h1>{t("app.title")}</h1>
        <p className="lede">{t("app.subtitle")}</p>
      </motion.section>

      <section className="capability-grid" aria-label={t("capabilities.label")}>
        {capabilities.map((capability) => (
          <article key={capability.id}>
            <span>{t(capability.indexKey)}</span>
            <h2>{t(capability.titleKey)}</h2>
            <p>{t(capability.descriptionKey)}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
