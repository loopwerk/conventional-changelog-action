const { parser, toConventionalChangelogFormat } = require("@conventional-commits/parser");

const PR_REGEX = /#([1-9]\d*)/;

async function parseCommitMessage(message, repoUrl, fetchUserFunc) {
  let cAst;

  try {
    const ast = parser(message);
    cAst = toConventionalChangelogFormat(ast);
  } catch (error) {
    // Not a valid commit
    cAst = {
      subject: message.split("\n")[0],
      type: "other",
    };
  }

  const found = cAst.subject.match(PR_REGEX);
  if (found) {
    const pullNumber = found[1];
    const { username, userUrl } = await fetchUserFunc(pullNumber);
    cAst.subject = cAst.subject.replace(PR_REGEX, () => `[#${pullNumber}](${repoUrl}/pull/${pullNumber}) by [${username}](${userUrl})`);
  }

  return cAst;
}

module.exports = parseCommitMessage;
