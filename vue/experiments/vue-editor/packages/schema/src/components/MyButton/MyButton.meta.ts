import type { ComponentMeta } from "../../types";

export const MyButtonMeta: ComponentMeta = {
  name: "MyButton",
  props: [{ name: "text", type: "string", default: "Click Me" }],
  slots: [], // 슬롯이 없으면 생략 가능
};
