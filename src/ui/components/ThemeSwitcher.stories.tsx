import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsProvider } from "../../app/settings/SettingsProvider";
import { createMemorySettingsStore } from "../../core/settings/store";
import { ThemeProvider } from "../theme/theme";
import { ThemeSwitcher } from "./ThemeSwitcher";

const meta = {
  title: "UI/ThemeSwitcher",
  component: ThemeSwitcher,
  decorators: [
    (Story) => (
      <SettingsProvider store={createMemorySettingsStore()}>
        <ThemeProvider>
          <div className="p-6">
            <Story />
          </div>
        </ThemeProvider>
      </SettingsProvider>
    ),
  ],
} satisfies Meta<typeof ThemeSwitcher>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
