const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // Verify the shared secret
    const auth = request.headers.get('Authorization')
    if (!auth || auth !== `Bearer ${env.UPLOAD_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const filename = formData.get('filename')
    const folder = (formData.get('folder') ?? 'cards').replace(/[^a-z0-9/_-]/gi, '')

    if (!file || !filename) {
      return new Response('Missing file or filename', { status: 400 })
    }

    const key = `${folder}/${filename}`

    await env.BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=2592000', // 30 days
      },
    })

    return new Response(JSON.stringify({ path: key }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  },
}
