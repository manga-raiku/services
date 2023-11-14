import { uploadPlugin } from "../runners/upload-plugin.ts";

console.log(await uploadPlugin(Deno.args[0], Deno.args[1]))
