const GRAPH_PHOTO_ENDPOINT = 'https://graph.microsoft.com/v1.0/me/photo/$value';

module.exports = async function (context, req) {
  const accessToken = req.headers['x-ms-token-aad-access-token'];
  const subjectId = req.headers['x-ms-client-principal-id'] || 'unknown';

  if (!accessToken) {
    context.log.warn('Avatar proxy invoked without an AAD access token.', { subjectId });
    context.res = {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'missing_access_token' }),
    };
    return;
  }

  try {
    const response = await fetch(GRAPH_PHOTO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 404) {
      context.log.warn('No profile photo available from Microsoft Graph.', { subjectId });
      context.res = {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'not_found' }),
      };
      return;
    }

    if (response.status === 401 || response.status === 403) {
      context.log.warn('Microsoft Graph rejected avatar request.', { subjectId, status: response.status });
      context.res = {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'forbidden', status: response.status }),
      };
      return;
    }

    if (!response.ok) {
      const preview = await response.text().catch(() => '');
      context.log.error('Unexpected response from Microsoft Graph avatar endpoint.', {
        subjectId,
        status: response.status,
        preview: preview.slice(0, 256),
      });
      context.res = {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'graph_error', status: response.status }),
      };
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    context.res = {
      status: 200,
      isRaw: true,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
        'Content-Length': buffer.length,
      },
      body: buffer,
    };
  } catch (error) {
    context.log.error('Failed to proxy avatar from Microsoft Graph.', { subjectId, error });
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'proxy_failure', message: error instanceof Error ? error.message : String(error) }),
    };
  }
};
