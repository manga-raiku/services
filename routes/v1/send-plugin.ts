import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts"
import { OK_BRANCH, OK_OWNER, OK_REPO } from "../../constants.ts"
import { getUserWithToken } from "../../logic/get-user-with-token.ts"
import { Package } from "npm:raiku-pgs@0.1.1"
import { uint8ToBase64 } from "https://raw.githubusercontent.com/manga-raiku/raiku-app/main/src/logic/base64.ts"
import { commitFiles } from "../../logic/commit-files.ts"
import { octokit } from "../../boot/octokit.ts"

const router = new Router()

router.post("/send-plugin", async (ctx) => {
  const token = ctx.request.headers.get("Authorization")

  const { fields } = await (
    await ctx.request.body({
      type: "form-data"
    })
  ).value.read()

  const urlPlugin = fields["url-plugin"]
  console.log("Token: %s", token)

  let username: string
  try {
    if (!token) throw new Error("Required token")
    // checking this token
    username = await getUserWithToken(token)
  } catch {
    ctx.response.status = 401
    ctx.response.body = "Bad credentials"

    return
  }

  if (!urlPlugin) {
    ctx.response.status = 404
    ctx.response.body = "Required url-plugin"
    return
  }

  console.log({ username, urlPlugin })

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
    ctx.response.status = 406
    ctx.response.body = `Can't fetch plugin:<pre><code>${err}</code></pre>`
    return
  }

  // check newMeta.id exists?
  try {
    await octokit.rest.repos.getContent({
      owner: OK_OWNER,
      repo: OK_REPO,
      branch: OK_BRANCH,
      path: `plugins/${newMeta.id.toLowerCase()}/index`
    })

    ctx.response.status = 403
    ctx.response.body = `Plugin id \`${newMeta.id}\` already exists on market`
    return
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
      path: `plugins/${newMeta.id.toLowerCase()}/index`,
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

  ctx.response.status = 200
  ctx.response.body = "Uploaded plugin"
})

export default router
