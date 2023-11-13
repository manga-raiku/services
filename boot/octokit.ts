import { Octokit } from "npm:@octokit/rest@20.0.2"

export const octokit = new Octokit({
  auth: Deno.env.get("GITHUB_TOKEN")
})
