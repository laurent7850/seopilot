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

  // Normalize the WordPress URL
  let baseUrl = wordpressUrl.trim().replace(/\/+$/, '')
  // Strip any userinfo (user@) that might have been accidentally included
  baseUrl = baseUrl.replace(/^(https?:\/\/)?[^@]+@/, '$1')
  // Ensure protocol is present
  if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`
  }
  // Validate URL
  try {
    const parsed = new URL(baseUrl)
    if (!parsed.hostname.includes('.')) {
      throw new Error('invalid hostname')
    }
  } catch {
    return {
      success: false,
      error: `URL WordPress invalide: "${wordpressUrl}". Verifiez l'URL dans les parametres du site (ex: https://votresite.com).`,
    }
  }
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
  webhookSecret?: string
  article: Record<string, unknown>
}

export async function publishViaWebhook(
  params: PublishViaWebhookParams
): Promise<PublishResult> {
  const { webhookUrl, webhookSecret, article } = params

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (webhookSecret) {
    // Support both Bearer token and X-Api-Key header
    headers['Authorization'] = `Bearer ${webhookSecret}`
    headers['X-Api-Key'] = webhookSecret
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
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
      postId: data.id || data.postId || data.post?.id,
      postUrl: data.url || data.postUrl || data.link || data.postUrl,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending to webhook',
    }
  }
}
