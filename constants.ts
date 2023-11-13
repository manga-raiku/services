import { load } from "https://deno.land/std@0.206.0/dotenv/mod.ts"

const env = await load()

export const GITHUB_TOKEN= Deno.env.get("GITHUB_TOKEN") ?? env["GITHUB_TOKEN"]!
export const OK_OWNER = Deno.env.get("OK_OWNER") ?? env["OK_OWNER"]!
export const OK_REPO = Deno.env.get("OK_REPO") ?? env["OK_REPO"]!
export const OK_BRANCH = Deno.env.get("OK_BRANCH") ?? env["OK_BRANCH"]!
