import { octokit } from "../boot/octokit.ts"
import { OK_OWNER, OK_REPO } from "../constants.ts"
import { uploadPlugin } from "../runners/upload-plugin.ts"

console.log(Deno.args[0])

const { id: issue_number, user } = JSON.parse(Deno.args[0])

let comment_body: string
let is_success: boolean
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

  if (urlLine) {
    const urlValue = urlLine.slice(0, urlLine.indexOf("\n") >>> 0)

    console.log(await uploadPlugin(user, urlValue))
  } else {
    throw new Error("URL not found in issue body")
  }
  comment_body = "The script ran successfully!"
  is_success = true
} catch (err) {
  comment_body = `There was an error running the script.\nError details: \n\`\`\`${err}\`\`\``
  is_success = false
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

if (is_success) {
  await octokit.rest.issues.update({
    owner: OK_OWNER,
    repo: OK_REPO,
    issue_number: issue_number,
    state: "closed"
  })
}
