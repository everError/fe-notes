import { MyButtonMeta } from "./components/MyButton/MyButton.meta";
import { MyCardMeta } from "./components/MyCard/MyCard.meta";
import { ComponentMeta } from "./types";

export { componentMap } from "./componentMap";

export const allComponentMeta = [MyButtonMeta, MyCardMeta];
export function getAllComponentMeta() {
  return allComponentMeta;
}
export function getComponentMeta(name: string) {
  return allComponentMeta.find((m) => m.name === name);
}
