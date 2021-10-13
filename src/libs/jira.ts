import fetch from 'node-fetch'

export const createIssue = (issue: Issue) =>
  fetch('https://survaq.atlassian.net/rest/api/2/issue/', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.JIRA_API_USER}:${process.env.JIRA_API_TOKEN}`
      ).toString('base64')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(issue)
  })

export type Issue = {
  fields: {
    project: {
      key: string
    }
    issuetype: {
      id: string
    }
    summary: string
    description: string
    assignee?: {
      id: string
    }
  }
}
