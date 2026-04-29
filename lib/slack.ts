/**
 * Slack Integration Module
 *
 * Flow:
 * 1. Offer signed → sendSlackInvitation() + notifyHRInviteSent()
 * 2. Candidate joins workspace (team_join event) → postWelcomeDM() + notifyHRCandidateJoined()
 *
 * Falls back to console logging when SLACK_BOT_TOKEN is not set.
 */

import crypto from 'crypto'
import { slackAPI } from '@/lib/slack-internal'

const SLACK_TEAM_ID = process.env.SLACK_TEAM_ID
const SLACK_HR_CHANNEL = process.env.SLACK_HR_CHANNEL_ID || '#hiring'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/** Onboarding resource links — override via env vars */
const ONBOARDING_LINKS = {
  handbook: process.env.ONBOARDING_HANDBOOK_URL || 'https://notion.so',
  calendar: process.env.ONBOARDING_CALENDAR_URL || 'https://calendar.google.com',
  github: process.env.ONBOARDING_GITHUB_URL || 'https://github.com',
  hrEmail: process.env.HR_EMAIL || 'hr@talentai.io',
}

// ─── Signature verification ──────────────────────────────────────────────────

/**
 * Verify that an incoming request came from Slack.
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(rawBody: string, signature: string, timestamp: string): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET
  if (!secret) {
    console.warn('[Slack] SLACK_SIGNING_SECRET not set — skipping signature verification')
    return true
  }

  // Reject requests older than 5 minutes (replay attack protection)
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10))
  if (age > 300) {
    console.warn('[Slack] Rejected stale request (age: ' + age + 's)')
    return false
  }

  const baseString = `v0:${timestamp}:${rawBody}`
  const expected = 'v0=' + crypto.createHmac('sha256', secret).update(baseString).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

// ─── Invite ──────────────────────────────────────────────────────────────────

/**
 * Send a Slack workspace invitation to the new hire.
 *
 * admin.users.invite requires a Business+ plan or Enterprise Grid.
 * For standard workspaces, the invite fails gracefully and the fallback
 * posts a manual invite request to the HR channel with all details.
 */
export async function sendSlackInvitation(params: {
  email: string
  candidateName: string
  jobTitle: string
}): Promise<{ success: boolean; note?: string }> {
  const result = await slackAPI('admin.users.invite', {
    email: params.email,
    team_id: SLACK_TEAM_ID,
    channel_ids: [SLACK_HR_CHANNEL],
    real_name: params.candidateName,
  })

  if (!result.ok) {
    // Fallback: post manual invite request to HR channel
    await slackAPI('chat.postMessage', {
      channel: SLACK_HR_CHANNEL,
      text: `Please send a Slack invite to ${params.candidateName} (${params.email})`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:envelope: *Action needed — send Slack invite*\n\nPlease invite *${params.candidateName}* to the workspace:\n• Email: \`${params.email}\`\n• Role: ${params.jobTitle}\n\n_Automated invite unavailable on this plan._`,
          },
        },
      ],
    })
    return {
      success: false,
      note: `admin.users.invite failed (${result.error}). Manual invite request posted to HR channel.`,
    }
  }

  return { success: true }
}

// ─── Welcome DM ──────────────────────────────────────────────────────────────

/**
 * Send the personalized welcome DM to a new hire.
 * Accepts either a Slack userId (from team_join event) or an email to look up.
 * Returns true if the DM was successfully sent.
 */
export async function postWelcomeDM(params: {
  userId?: string
  userEmail?: string
  welcomeMessage: string
  candidateName: string
  jobTitle: string
  startDate: string
}): Promise<boolean> {
  let userId = params.userId

  // Look up user by email if no userId provided
  if (!userId && params.userEmail) {
    const lookup = await slackAPI('users.lookupByEmail', { email: params.userEmail })
    if (!lookup.ok || !lookup.user?.id) {
      console.log(`[Slack] User not in workspace yet: ${params.userEmail}`)
      return false
    }
    userId = lookup.user.id as string
  }

  if (!userId) return false

  // Open DM channel
  const dm = await slackAPI('conversations.open', { users: userId })
  const channelId = dm?.channel?.id as string | undefined
  if (!channelId) return false

  // Post welcome message with onboarding quick links
  await slackAPI('chat.postMessage', {
    channel: channelId,
    text: params.welcomeMessage,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: params.welcomeMessage },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            '*Quick links to get you started:*',
            `• <${ONBOARDING_LINKS.handbook}|Onboarding Handbook>`,
            `• <${ONBOARDING_LINKS.calendar}|Team Calendar>`,
            `• <${ONBOARDING_LINKS.github}|GitHub Organization>`,
            `• *Questions?* Email <mailto:${ONBOARDING_LINKS.hrEmail}|${ONBOARDING_LINKS.hrEmail}>`,
          ].join('\n'),
        },
      },
    ],
  })

  console.log(`[Slack] Welcome DM sent to ${params.candidateName} (userId=${userId})`)
  return true
}

// ─── HR notifications ────────────────────────────────────────────────────────

/**
 * Notify HR when the Slack invite has been sent.
 * Called immediately after offer is signed.
 */
export async function notifyHRInviteSent(params: {
  candidateName: string
  jobTitle: string
  startDate: string
  reportingManager: string
  applicationId: string
  inviteSuccess: boolean
}): Promise<void> {
  await slackAPI('chat.postMessage', {
    channel: SLACK_HR_CHANNEL,
    text: `Slack invite ${params.inviteSuccess ? 'sent' : 'pending manual send'} — ${params.candidateName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: params.inviteSuccess
            ? 'Slack Invite Sent'
            : 'Slack Invite — Manual Action Required',
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*New Hire:*\n${params.candidateName}` },
          { type: 'mrkdwn', text: `*Role:*\n${params.jobTitle}` },
          { type: 'mrkdwn', text: `*Start Date:*\n${params.startDate}` },
          { type: 'mrkdwn', text: `*Manager:*\n${params.reportingManager}` },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: params.inviteSuccess
              ? 'Invite delivered. A welcome message will be sent automatically when they join.'
              : 'Please send the invite manually — see the message above.',
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Candidate Profile' },
            url: `${APP_URL}/admin/candidates/${params.applicationId}`,
          },
        ],
      },
    ],
  })
}

/**
 * Notify HR when the new hire has actually joined the workspace and been welcomed.
 * Called from the team_join event handler.
 */
export async function notifyHRCandidateJoined(params: {
  candidateName: string
  jobTitle: string
  startDate: string
  reportingManager: string
  applicationId: string
}): Promise<void> {
  await slackAPI('chat.postMessage', {
    channel: SLACK_HR_CHANNEL,
    text: `${params.candidateName} has joined the workspace`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'New Team Member Has Joined' },
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
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'They have received their personalized welcome message with onboarding links.',
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Candidate Profile' },
            url: `${APP_URL}/admin/candidates/${params.applicationId}`,
          },
        ],
      },
    ],
  })
}
