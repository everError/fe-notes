import { MyButtonMeta } from "./components/MyButton/MyButton.meta";
import { MyCardMeta } from "./components/MyCard/MyCard.meta";
import { BaseCardMeta } from "./components/BaseCard/BaseCard.meta";

export { componentMap } from "./componentMap";

export const allComponentMeta = [MyButtonMeta, MyCardMeta, BaseCardMeta];
export function getAllComponentMeta() {
  return allComponentMeta;
}
export function getComponentMeta(name: string) {
  return allComponentMeta.find((m) => m.name === name);
}
