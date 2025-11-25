// Import global styles
import "../src/ui/react/styles/global.scss";

/** @type { import('@storybook/react-webpack5').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#000000" },
        { name: "glass", value: "rgba(10, 10, 20, 0.95)" },
        { name: "light", value: "#ffffff" },
      ],
    },
    layout: "centered",
  },
};

export default preview;
