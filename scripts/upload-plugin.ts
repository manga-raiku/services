import { octokit } from "../boot/octokit.ts"
import { OK_OWNER, OK_REPO } from "../constants.ts"
import { uploadPlugin } from "../runners/upload-plugin.ts"

const issue_number = parseInt(Deno.args[1])

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

  if (urlLine) {
    const urlValue = urlLine.split(":")[1].trim()
    console.log(await uploadPlugin(Deno.args[0], urlValue))
  } else {
    throw new Error("URL not found in issue body")
  }
  comment_body = "The script ran successfully!"
} catch (err) {
  comment_body = "There was an error running the script. Error details: " + err
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
