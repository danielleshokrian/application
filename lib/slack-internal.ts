const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN

export async function slackAPI(method: string, body: Record<string, unknown>) {
  if (!SLACK_BOT_TOKEN) {
    console.log(`[Slack MOCK] ${method}:`, JSON.stringify(body, null, 2))
    return { ok: true, mock: true }
  }

  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.ok) console.warn(`[Slack] ${method} error: ${data.error}`)
  return data
}
