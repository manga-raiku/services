import { octokit } from "../boot/octokit"

export async function commitFiles(
  owner: string,
  repo: string,
  message: string,
  files: {
    path: string
    encoding: "base64" | "utf-8"
    content: string
  }[]
) {
  const ref = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/main`
  })

  const baseTreeSha = ref.data.object.sha

  const createBlobs = files.map((file) =>
    octokit.git.createBlob({
      owner,
      repo,
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
    owner,
    repo,
    base_tree: baseTreeSha,
    tree
  })

  const commit = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: newTree.data.sha,
    parents: [baseTreeSha]
  })

  return commit
}
