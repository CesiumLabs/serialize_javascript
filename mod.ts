import { serialize, deserialize, SerializeJavaScriptOptions } from "./src/main.ts";

export type SerializeOptions = SerializeJavaScriptOptions;
export { serialize, deserialize };
export default serialize;