import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts"
import { octokit } from "../../constants.ts"
import { getUserWithToken } from "../../logic/get-user-with-token.ts"
import { Package } from "npm:raiku-pgs@0.1.1"
import { uint8ToBase64 } from "https://raw.githubusercontent.com/manga-raiku/raiku-app/main/src/logic/base64.ts"

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
  
    console.log(
      JSON.stringify(
        {
          sender: username,
          url: urlPlugin,
          meta: newMeta
        },
        null,
        2
      )
    )
  
    const ref = await octokit.git.getRef({
      owner: "manga-raiku",
      repo: "service-market-raiku",
      ref: `heads/main`
    })
  
    const baseTreeSha = ref.data.object.sha
    const files = [
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
  
    const createBlobs = files.map((file) =>
      octokit.git.createBlob({
        owner: "manga-raiku",
        repo: "service-market-raiku",
        content: file.content,
        encoding: file.encoding
      })
    )
  
    const blobs = await Promise.all(createBlobs)
  
    const tree = blobs.map(
      (blob, index) =>
        ({
          path: files[index].path,
          mode: "100644",
          type: "blob",
          sha: blob.data.sha
        } as const)
    )
  
    const newTree = await octokit.git.createTree({
      owner: "manga-raiku",
      repo: "service-market-raiku",
      base_tree: baseTreeSha,
      tree
    })
  
    const commit = await octokit.git.createCommit({
      owner: "manga-raiku",
      repo: "service-market-raiku",
      message: `[bot]: Send plugin \`${newMeta.id.toLowerCase()}\``,
      tree: newTree.data.sha,
      parents: [baseTreeSha]
    })
  
    await octokit.git.updateRef({
      owner: "manga-raiku",
      repo: "service-market-raiku",
      ref: `heads/main`,
      sha: commit.data.sha
    })
  
    ctx.response.status = 200
    ctx.response.body = "Uploaded plugin"
  })
  
  export default router