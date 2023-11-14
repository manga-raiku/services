import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts"
import { getUserWithToken } from "../../logic/get-user-with-token.ts"
import { Package } from "npm:raiku-pgs@0.1.3"
import { uint8ToBase64 , base64ToUint8 } from "https://raw.githubusercontent.com/manga-raiku/raiku-app/main/src/logic/base64.ts"
import { commitFiles } from "../../logic/commit-files.ts"
import { octokit } from "../../boot/octokit.ts"
import { OK_OWNER, OK_REPO, OK_BRANCH } from "../../constants.ts"

const router = new Router()

const decoder = new TextDecoder()

router.get("/list-plugin", async (ctx) => {
  const { data: list } = await octokit.rest.repos.getContent({
    owner: OK_OWNER,
    repo: OK_REPO,
    ref: OK_BRANCH,
    path: `plugins`
  })

  ctx.response.status = 200
  ctx.response.body = await Promise.all(
    list.map(async (item) => {
      if (item.type !== "dir") return

      const {data:file} = await octokit.rest.repos.getContent({
        owner: OK_OWNER,
        repo: OK_REPO,
        ref: OK_BRANCH,
        path: item.path + "/index.json"
      })
      
      const content = decoder.decode(base64ToUint8(file.content))
      const packageJson = JSON.parse(content)
      packageJson.favicon = `https://raw.githubusercontent.com/${OK_OWNER}/${OK_REPO}/${OK_BRANCH}/${item.path}/favicon`

      return packageJson
    })
  )
})

export default router
