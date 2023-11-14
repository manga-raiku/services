import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts"
import { getUserWithToken } from "../../logic/get-user-with-token.ts"
import { uploadPlugin } from "../../runners/upload-plugin.ts"

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

  Object.assign(ctx.response, await uploadPlugin(username, urlPlugin))
})

export default router
