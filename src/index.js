const { context, getOctokit } = require("@actions/github");
const { info, getInput, setOutput, setFailed } = require("@actions/core");
const parseCommitMessage = require("./parseCommitMessage");
const generateChangelog = require("./generateChangelog");

const {
  repo: { owner, repo },
} = context;

async function run() {
  const token = getInput("token");
  const octokit = getOctokit(token);

  // Find the two most recent tags
  const { data: tags } = await octokit.repos.listTags({
    owner,
    repo,
    per_page: 2,
  });

  if (tags.length !== 2) {
    setFailed("Couldn't find previous tag");
    return;
  }

  // Find the commits between two tags
  const result = await octokit.repos.compareCommits({
    owner,
    repo,
    base: tags[1].commit.sha,
    head: tags[0].commit.sha,
  });

  const fetchUserFunc = async function (pullNumber) {
    const pr = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return {
      username: pr.data.user.login,
      userUrl: pr.data.user.html_url,
    };
  };

  // Parse every commit, getting the type, turning PR numbers into links, etc
  const commitObjects = result.data.commits
    .map(async (commit) => {
      return await parseCommitMessage(commit.commit.message, `https://github.com/${owner}/${repo}`, fetchUserFunc);
    })
    .filter((m) => m !== false);

  // And generate the changelog
  if (commitObjects.length === 0) {
    setOutput("changelog", "");
    setOutput("changes", "");
    return;
  }

  const excludeString = getInput("exclude") || "";
  const excludeTypes = excludeString.split(",");
  const log = generateChangelog(tags[0].name, commitObjects, excludeTypes);

  info(log.changelog);
  setOutput("changelog", log.changelog);
  setOutput("changes", log.changes);
}

run();
