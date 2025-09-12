import { ComponentMeta } from "../../types";

export const BaseCardMeta: ComponentMeta = {
  name: "BaseCard",
  props: [{ name: "title", type: "string", default: "Card Title" }],
  slots: ["default"],
};
