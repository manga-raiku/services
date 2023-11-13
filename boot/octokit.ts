import { Octokit } from "npm:@octokit/rest@20.0.2"
import { GITHUB_TOKEN } from "../constants.ts"

export const octokit = new Octokit({
  auth: GITHUB_TOKEN
})
