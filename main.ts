import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts"
import { getQuery } from "https://deno.land/x/oak@v12.6.1/helpers.ts"
import { getUserWithToken } from "./logic/get-user-with-token.ts"
import { Octokit } from "npm:@octokit/rest@20.0.2"
import type { execPackageMjs } from "npm:raiku-pgs@0.1.1/thread"
import { uint8ToBase64 } from "https://raw.githubusercontent.com/manga-raiku/raiku-app/main/src/logic/base64.ts"

import pingUpdate from "./routes/v1/ping-update"
import sendPlugin from "./routes/v1/send-plugin"

Object.assign(self, {
  document: {
    documentElement: { dataset: {} }
  }
})

const app = new Application()

app.use(pingUpdate.routes())
app.use(pingUpdate.allowedMethods())

app.use(sendPlugin.routes())
app.use(sendPlugin.allowedMethods())

app.listen({ port: 8080 })
