export interface PublishToWordPressParams {
  wordpressUrl: string
  apiKey: string
  title: string
  content: string
  slug: string
  status?: 'draft' | 'publish' | 'pending' | 'private'
}

export interface PublishResult {
  success: boolean
  postId?: number
  postUrl?: string
  error?: string
}

export async function publishToWordPress(
  params: PublishToWordPressParams
): Promise<PublishResult> {
  const {
    wordpressUrl,
    apiKey,
    title,
    content,
    slug,
    status = 'draft',
  } = params

  // Normalize the WordPress URL (remove trailing slash)
  const baseUrl = wordpressUrl.replace(/\/+$/, '')
  const endpoint = `${baseUrl}/wp-json/wp/v2/posts`

  // The apiKey is expected to be a WordPress application password
  // Format: "username:application_password"
  const authHeader = `Basic ${Buffer.from(apiKey).toString('base64')}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        title,
        content,
        slug,
        status,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return {
        success: false,
        error: `WordPress API error (${response.status}): ${errorBody}`,
      }
    }

    const data = await response.json()

    return {
      success: true,
      postId: data.id,
      postUrl: data.link,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error publishing to WordPress',
    }
  }
}

export interface PublishViaWebhookParams {
  webhookUrl: string
  article: Record<string, unknown>
}

export async function publishViaWebhook(
  params: PublishViaWebhookParams
): Promise<PublishResult> {
  const { webhookUrl, article } = params

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(article),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return {
        success: false,
        error: `Webhook error (${response.status}): ${errorBody}`,
      }
    }

    const data = await response.json().catch(() => ({}))

    return {
      success: true,
      postId: data.id || data.postId,
      postUrl: data.url || data.postUrl || data.link,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending to webhook',
    }
  }
}
