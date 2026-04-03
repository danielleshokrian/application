/**
 * Slack Integration Module
 *
 * Uses Slack Web API to:
 * 1. Send workspace invitations to new hires
 * 2. Post personalized welcome messages via SlackBot
 * 3. Notify HR team channel on successful onboarding
 *
 * Production: Uses @slack/web-api package.
 * Here we use raw fetch to the Slack API to minimize dependencies.
 */

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_HR_CHANNEL = process.env.SLACK_HR_CHANNEL_ID || '#hiring'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function slackAPI(method: string, body: Record<string, unknown>) {
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
  return await res.json()
}

/**
 * Send a Slack workspace invitation to the candidate.
 * Note: admin.users.invite requires a Slack Enterprise Grid or admin token.
 * For standard workspaces, use admin.inviteUserToWorkspace or the invite flow.
 */
export async function sendSlackInvitation(params: {
  email: string
  candidateName: string
  jobTitle: string
}): Promise<{ success: boolean; note?: string }> {
  // Standard Slack invite (requires admin token on non-Grid workspaces)
  const result = await slackAPI('admin.users.invite', {
    email: params.email,
    team_id: process.env.SLACK_TEAM_ID,
    channel_ids: [SLACK_HR_CHANNEL],
    real_name: params.candidateName,
  })

  if (!result.ok) {
    // Fallback: post to HR channel with manual invite instructions
    await slackAPI('chat.postMessage', {
      channel: SLACK_HR_CHANNEL,
      text: `📨 Please send a Slack invite to *${params.candidateName}* (${params.email}) for the *${params.jobTitle}* role. Their onboarding is ready.`,
    })
    return {
      success: false,
      note: `Admin invite failed (${result.error}). Manual invite notification sent to HR channel.`,
    }
  }

  return { success: true }
}

/**
 * Post a personalized welcome message to the new hire's DM.
 * Called via the app_home_opened or team_join event.
 * In production: triggered by the team_join webhook event.
 */
export async function postWelcomeMessage(params: {
  userEmail: string
  welcomeMessage: string
}): Promise<void> {
  // Look up user by email
  const userResult = await slackAPI('users.lookupByEmail', {
    email: params.userEmail,
  })

  if (!userResult.ok || !userResult.user) {
    console.log(`[Slack] Could not find user by email ${params.userEmail}`)
    return
  }

  const userId = userResult.user.id

  // Open DM channel
  const dmResult = await slackAPI('conversations.open', { users: userId })
  const channelId = dmResult?.channel?.id

  if (!channelId) return

  // Post personalized welcome
  await slackAPI('chat.postMessage', {
    channel: channelId,
    text: params.welcomeMessage,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: params.welcomeMessage },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Quick links to get started:*\n• <https://notion.so|📚 Onboarding Handbook>\n• <https://calendar.google.com|📅 Team Calendar>\n• <https://figma.com|🎨 Design System (if applicable)>\n• <https://github.com|💻 GitHub Organization>',
        },
      },
    ],
  })
}

/**
 * Notify the HR channel that a new hire has joined and is onboarded.
 */
export async function notifyHRTeam(params: {
  candidateName: string
  jobTitle: string
  startDate: string
  reportingManager: string
  applicationId: string
}): Promise<void> {
  await slackAPI('chat.postMessage', {
    channel: SLACK_HR_CHANNEL,
    text: `🎉 New team member onboarded!`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🎉 New Team Member Onboarded!' },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Name:*\n${params.candidateName}` },
          { type: 'mrkdwn', text: `*Role:*\n${params.jobTitle}` },
          { type: 'mrkdwn', text: `*Start Date:*\n${params.startDate}` },
          { type: 'mrkdwn', text: `*Manager:*\n${params.reportingManager}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Profile' },
            url: `${APP_URL}/admin/candidates/${params.applicationId}`,
          },
        ],
      },
    ],
  })
}
