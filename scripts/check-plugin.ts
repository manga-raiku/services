import { Package } from "npm:raiku-pgs@0.1.1/plugin"
import { octokit } from "../boot/octokit.ts"
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

  // Assuming the value of 'id: url' is on its own line like 'url: https://example.com/'
  const urlLine = issueBody?.split("\n").find((line) => line.startsWith("url:"))

  if (!urlLine) {
    throw new Error("URL not found in issue body")
  }

  const urlValue = urlLine.split(":")[1].trim()

  // fetch plugin
  let newMeta: Package
  try {
    newMeta = await fetch(`${urlValue}/package.mjs`).then((res) => {
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
    throw {
      status: 406,
      body: `Can't fetch plugin: ${err}`
    }
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
