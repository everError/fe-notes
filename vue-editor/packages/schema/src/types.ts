export interface PropMeta {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "enum";
  default: any;
  options?: any[];
}

export interface ComponentMeta {
  name: string;
  props: PropMeta[];
  slots: string[];
}
