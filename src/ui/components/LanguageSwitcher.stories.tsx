import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsProvider } from "../../app/settings/SettingsProvider";
import { createMemorySettingsStore } from "../../core/settings/store";
import "../../i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

const meta = {
  title: "UI/LanguageSwitcher",
  component: LanguageSwitcher,
  decorators: [
    (Story) => (
      <SettingsProvider store={createMemorySettingsStore()}>
        <div className="p-6">
          <Story />
        </div>
      </SettingsProvider>
    ),
  ],
} satisfies Meta<typeof LanguageSwitcher>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
