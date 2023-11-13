import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts"
import { octokit } from "../../constants.ts"
import { getUserWithToken } from "../../logic/get-user-with-token.ts"
import { Package } from "npm:raiku-pgs@0.1.1"
import { uint8ToBase64 } from "https://raw.githubusercontent.com/manga-raiku/raiku-app/main/src/logic/base64.ts"

const router = new Router()

router.post("/ping-update", async (ctx) => {
  const token = ctx.request.headers.get("Authorization")

  const { fields } = await (
    await ctx.request.body({
      type: "form-data"
    })
  ).value.read()

  const packageId = fields["package-id"]

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
  console.log(
    "[log]: User github %s ping update plugin id %s",
    username,
    packageId
  )

  if (!packageId) {
    ctx.response.status = 404
    ctx.response.body = "Required package-id"
    return
  }

  let content: string, fav: string
  try {
    ;[content, fav] = await Promise.all([
      octokit.rest.repos
        .getContent({
          owner: "manga-raiku",
          repo: "service-market-raiku",
          path: `plugins/${packageId.toLowerCase()}/index`
        })
        .then((res) => res.data.content),
      octokit.rest.repos
        .getContent({
          owner: "manga-raiku",
          repo: "service-market-raiku",
          path: `plugins/${packageId.toLowerCase()}/favicon`
        })
        .then((res) => res.data.content)
    ])
  } catch {
    // not found
    ctx.response.status = 404
    ctx.response.body = "Plugin not exists on market"
    return
  }

  const { sender, url, meta } = JSON.parse(atob(content))

  if (sender !== username) {
    ctx.response.status = 401
    ctx.response.body = "You can't ping update plugin"
    return
  }

  let newMeta: Package, newFav: string
  try {
    newMeta = await fetch(`${url}/package.mjs`).then((res) => {
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
    newFav = await fetch(newMeta.favicon)
      .then((res) => res.arrayBuffer())
      .then((buffer) => uint8ToBase64(new Uint8Array(buffer)))
  } catch (err) {
    console.error(err)
    ctx.response.status = 406
    ctx.response.body = `Can't fetch plugin:<pre><code>${err}</code></pre>`
    return
  }

  if (meta.version === newMeta.version) {
    ctx.response.status = 201
    ctx.response.body = "Plugin is latest version"
    return
  }

  await commitFiles(
    "manga-raiku",
    "service-market-raiku",
    `[bot]: Update plugin \`${packageId}\``,
    [
      {
        path: `plugins/${packageId.toLowerCase()}/index`,
        encoding: "utf-8",
        content: JSON.stringify(
          {
            sender: username,
            url,
            meta: newMeta
          },
          null,
          2
        )
      },
      ...(fav !== newFav
        ? [
            {
              path: `plugins/${packageId.toLowerCase()}/favicon`,
              encoding: "base64",
              content: newFav
            }
          ]
        : [])
    ]
  )

  ctx.response.status = 200
  ctx.response.body = "Updated plugin"
})

export default router