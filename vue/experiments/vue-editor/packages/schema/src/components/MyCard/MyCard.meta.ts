import { ComponentMeta } from "../../types";

export const MyCardMeta: ComponentMeta = {
  name: "MyCard",
  props: [{ name: "title", type: "string", default: "Card Title" }],
  slots: ["first", "second"],
};
