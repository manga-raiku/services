import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts"
import { getUserWithToken } from "../../logic/get-user-with-token.ts"
import { Package } from "npm:raiku-pgs@0.1.3"
import { uint8ToBase64, base64ToUint8 } from "https://raw.githubusercontent.com/manga-raiku/raiku-app/main/src/logic/base64.ts"
import { commitFiles } from "../../logic/commit-files.ts"
import { octokit } from "../../boot/octokit.ts"
import { OK_OWNER, OK_REPO, OK_BRANCH } from "../../constants.ts"

const router = new Router()

const decoder = new TextDecoder()

router.get("/contributors", async (ctx) => {
  const repos = await octokit.paginate(octokit.rest.repos.listForOrg, {
    org: OK_OWNER,
  });

  ctx.response.status = 200
  ctx.response.body = await Promise.all(
    repos.map(async repo => {
      const contributors = await octokit.paginate(octokit.rest.repos.listContributors, {
        owner: OK_OWNER,
        repo: repo.name,
      }).then(list => list.filter(item => item.type === 'User'));

      return { repo, contributors }
    })
  )
})

export default router
