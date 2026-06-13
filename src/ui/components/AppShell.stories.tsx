import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppProviders } from "../../app/providers/AppProviders";
import { AppShell } from "./AppShell";

const meta = {
  title: "App/AppShell",
  component: AppShell,
  decorators: [
    (Story) => (
      <AppProviders>
        <Story />
      </AppProviders>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AppShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
