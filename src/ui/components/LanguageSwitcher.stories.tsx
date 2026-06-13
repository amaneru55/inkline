import type { Meta, StoryObj } from "@storybook/react-vite";
import "../../i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

const meta = {
  title: "UI/LanguageSwitcher",
  component: LanguageSwitcher,
  decorators: [
    (Story) => (
      <div className="p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LanguageSwitcher>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
