import { uint8ToBase64 } from "https://raw.githubusercontent.com/manga-raiku/raiku-app/main/src/logic/base64.ts"
import { Package } from "npm:raiku-pgs@0.1.1/plugin"
import { octokit } from "../boot/octokit.ts"
import { OK_OWNER, OK_REPO, OK_BRANCH } from "../constants.ts"
import { commitFiles } from "../logic/commit-files.ts"

export async function uploadPlugin(username: string, urlPlugin: string) {
  // fetch plugin
  let newMeta: Package
  try {
    newMeta = await fetch(`${urlPlugin}/package.mjs`).then((res) => {
      if (res.status !== 200 && res.status !== 201)
        throw new Error("Failure load plugin")
      return import("npm:raiku-pgs@0.1.1/thread").then(
        async ({ execPackageMjs }) =>
          execPackageMjs(await res.text(), true, {
            mode: "spa",
            extension: false,
            native: false,
            standalone: false,
            version: "0.0.0"
          })
      )
    })
  } catch (err) {
    return {
      status: 406,
      body: `Can't fetch plugin: ${err}`
    }
  }

  // check newMeta.id exists?
  try {
    await octokit.rest.repos.getContent({
      owner: OK_OWNER,
      repo: OK_REPO,
      branch: OK_BRANCH,
      path: `plugins/${newMeta.id.toLowerCase()}/index.json`
    })

    return {
      status: 40,
      body: `Plugin id \`${newMeta.id}\` already exists on market`
    }
    // deno-lint-ignore no-empty
  } catch {}

  const files: {
    path: string
    encoding: "base64" | "utf-8"
    content: string
  }[] = [
    {
      path: `plugins/${newMeta.id.toLowerCase()}/favicon`,
      encoding: "base64",
      content: await fetch(newMeta.favicon)
        .then((res) => res.arrayBuffer())
        .then((buffer) => {
          return uint8ToBase64(new Uint8Array(buffer))
        })
    },
    {
      path: `plugins/${newMeta.id.toLowerCase()}/index.json`,
      encoding: "utf-8",
      content: JSON.stringify(
        {
          sender: username,
          url: urlPlugin,
          meta: { ...newMeta, favicon: undefined }
        },
        null,
        2
      )
    }
  ]

  await commitFiles(
    OK_OWNER,
    OK_REPO,
    OK_BRANCH,
    `[bot]: Send plugin \`${newMeta.id.toLowerCase()}\``,
    files
  )

  return {
    status: 200,
    body: "Uploaded plugin"
  }
}
