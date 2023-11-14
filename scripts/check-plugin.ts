import { Package } from "npm:raiku-pgs@0.1.1/plugin"
import { octokit } from "../boot/octokit.ts"
import { join } from "node:path"
import { OK_OWNER, OK_REPO } from "../constants.ts"

console.log(Deno.args[0])

const { id: issue_number, user } = JSON.parse(Deno.args[0])

let comment_body: string
try {
  if (Number.isNaN(issue_number)) {
    throw new Error("ID issue invalid")
  }

  const issue = await octokit.issues.get({
    owner: OK_OWNER,
    repo: OK_REPO,
    issue_number: issue_number
  })

  // Parse the issue body
  const issueBody = issue.data.body

  const urlLine = issueBody
    ?.slice(issueBody?.indexOf("<!-- #request-upload-plugin -->") + 31)
    .replace(/^[\s\r\n]+/g, "")

  if (!urlLine) {
    throw new Error("URL not found in issue body")
  }

  const urlValue = urlLine.slice(0, urlLine.indexOf("\n") >>> 0)

  // fetch plugin
  let newMeta: Package
  try {
    newMeta = await fetch(join(urlValue, "package.mjs")).then((res) => {
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
    throw `Can't fetch plugin: ${err}`
  }

  const { favicon } = newMeta
  // deno-lint-ignore no-explicit-any
  delete (newMeta as unknown as any).favicon
  comment_body = `
URL Plugin: [${urlValue}](${urlValue})
Sender: @${user}

\`\`\`json
${JSON.stringify(newMeta, null, 2)}
\`\`\`

Icon: ![](${favicon})
`
} catch (err) {
  comment_body = `There was an error running the script.\nError details: \n\`\`\`${err}\`\`\``
}

console.log({
  owner: OK_OWNER,
  repo: OK_REPO,
  issue_number: issue_number,
  body: comment_body
})

await octokit.rest.issues.createComment({
  owner: OK_OWNER,
  repo: OK_REPO,
  issue_number: issue_number,
  body: comment_body
})
