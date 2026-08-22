/**********************************************************************
Image: A very simple online image hosting service
Copyright (C) 2025  langningchen

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
**********************************************************************/

const IMAGE_ID_PATTERN = /^[a-z]{32}$/;
const IMAGE_PATH_PATTERN = /^[a-z]{32}\.jpeg$/;
const ACCESS_KEY_PREFIX = 'image:';
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const GITHUB_API_VERSION = '2022-11-28';
const KV_CONCURRENCY = 25;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

interface Env {
    GithubOwner: string;
    GithubRepo: string;
    GithubPAT: string;
    IMAGE_ACCESS: KVNamespace;
}

interface AccessMetadata {
    lastAccessedAt: number;
}

interface GithubContentResponse {
    sha?: string;
    content?: {
        name?: string;
    };
}

interface GithubTreeResponse {
    truncated?: boolean;
    tree?: Array<{
        path?: string;
        type?: string;
    }>;
}

function githubHeaders(env: Env, accept = 'application/vnd.github+json'): HeadersInit {
    return {
        'Authorization': `Bearer ${env.GithubPAT}`,
        'Accept': accept,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
        'User-Agent': 'langningchen-image',
    };
}

function githubApiUrl(env: Env, path: string): URL {
    return new URL(
        `https://api.github.com/repos/${encodeURIComponent(env.GithubOwner)}/${encodeURIComponent(env.GithubRepo)}${path}`,
    );
}

function accessKey(imageId: string): string {
    return `${ACCESS_KEY_PREFIX}${imageId}`;
}

async function recordAccess(env: Env, imageId: string, timestamp = Date.now()): Promise<void> {
    await env.IMAGE_ACCESS.put(accessKey(imageId), String(timestamp), {
        metadata: { lastAccessedAt: timestamp } satisfies AccessMetadata,
    });
}

function imageResponseHeaders(imageId: string): HeadersInit {
    return {
        'Content-Type': 'image/jpeg',
        // Deliberately keep the original long-lived cache. Only requests that
        // actually reach this Worker renew the seven-day inactivity timer.
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': `"${imageId}"`,
        'Last-Modified': new Date().toUTCString(),
        'Accept-Ranges': 'bytes',
        'X-Content-Type-Options': 'nosniff',
        ...corsHeaders,
    };
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
    const image = await request.text();
    let imageId = '';
    for (let i = 0; i < 32; i++) {
        imageId += String.fromCharCode(Math.floor(Math.random() * 26) + 97);
    }

    const imageData = image.replace(/^data:image\/[^;]+;base64,/, '');
    if (!imageData) {
        return new Response('Invalid image data', {
            status: 400,
            headers: corsHeaders,
        });
    }

    try {
        const response = await fetch(githubApiUrl(env, `/contents/${imageId}.jpeg`), {
            method: 'PUT',
            headers: {
                ...githubHeaders(env),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Upload from ${request.headers.get('CF-Connecting-IP')} ${request.cf?.country}/${request.cf?.city}`,
                content: imageData,
            }),
        });

        if (!response.ok) {
            console.error('GitHub API error:', response.status, await response.text());
            return new Response('Upload failed', {
                status: 500,
                headers: corsHeaders,
            });
        }

        const jsonResponse = await response.json() as GithubContentResponse;
        if (jsonResponse.content?.name !== `${imageId}.jpeg`) {
            console.error('Unexpected upload response:', jsonResponse);
            return new Response('Upload failed', {
                status: 500,
                headers: corsHeaders,
            });
        }

        try {
            await recordAccess(env, imageId);
        } catch (error) {
            // The daily reconciliation initializes missing records, so do not make a
            // successful GitHub upload look like a failure if KV is temporarily down.
            console.error('Could not initialize image access time:', imageId, error);
        }

        return new Response(imageId, {
            headers: {
                'Content-Type': 'text/plain',
                ...corsHeaders,
            },
        });
    } catch (error) {
        console.error('Upload error:', error);
        return new Response('Upload failed', {
            status: 500,
            headers: corsHeaders,
        });
    }
}

async function handleImageRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const imageId = url.pathname.substring(1);
    if (!IMAGE_ID_PATTERN.test(imageId)) {
        return new Response('Image not found', { status: 404, headers: corsHeaders });
    }

    const headers = imageResponseHeaders(imageId);
    if (request.headers.get('If-None-Match') === `"${imageId}"`) {
        return new Response(null, { status: 304, headers });
    }

    try {
        const githubResponse = await fetch(githubApiUrl(env, `/contents/${imageId}.jpeg`), {
            method: 'GET',
            headers: githubHeaders(env, 'application/vnd.github.raw+json'),
        });

        if (!githubResponse.ok) {
            return new Response('Image not found', { status: 404, headers: corsHeaders });
        }

        // `?search` is used only by the uploader's local gallery preview and must
        // not extend the lifetime of an image.
        if (!url.searchParams.has('search')) {
            ctx.waitUntil(recordAccess(env, imageId).catch((error) => {
                console.error('Could not record image access:', imageId, error);
            }));
        }

        return new Response(githubResponse.body, { headers });
    } catch (error) {
        console.error('Image fetch error:', imageId, error);
        return new Response('Image not found', { status: 404, headers: corsHeaders });
    }
}

async function listCurrentImageIds(env: Env): Promise<Set<string>> {
    const response = await fetch(githubApiUrl(env, '/git/trees/HEAD?recursive=1'), {
        headers: githubHeaders(env),
    });

    if (!response.ok) {
        throw new Error(`Could not list target repository tree: ${response.status} ${await response.text()}`);
    }

    const treeResponse = await response.json() as GithubTreeResponse;
    if (treeResponse.truncated) {
        throw new Error('Target repository tree is truncated; cleanup stopped to avoid using incomplete data.');
    }

    const imageIds = new Set<string>();
    for (const item of treeResponse.tree ?? []) {
        if (item.type === 'blob' && item.path && IMAGE_PATH_PATTERN.test(item.path)) {
            imageIds.add(item.path.slice(0, -'.jpeg'.length));
        }
    }
    return imageIds;
}

async function listAccessTimes(env: Env): Promise<Map<string, number>> {
    const accessTimes = new Map<string, number>();
    let cursor: string | undefined;

    do {
        const page = await env.IMAGE_ACCESS.list<AccessMetadata>({
            prefix: ACCESS_KEY_PREFIX,
            cursor,
            limit: 1000,
        });

        for (const key of page.keys) {
            const imageId = key.name.slice(ACCESS_KEY_PREFIX.length);
            if (!IMAGE_ID_PATTERN.test(imageId)) {
                continue;
            }

            let timestamp = key.metadata?.lastAccessedAt;
            if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
                timestamp = Number(await env.IMAGE_ACCESS.get(key.name));
            }

            if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
                accessTimes.set(imageId, timestamp);
            }
        }

        cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);

    return accessTimes;
}

async function deleteImageFromGithub(env: Env, imageId: string): Promise<void> {
    const contentUrl = githubApiUrl(env, `/contents/${imageId}.jpeg`);
    const metadataResponse = await fetch(contentUrl, { headers: githubHeaders(env) });

    if (metadataResponse.status === 404) {
        return;
    }
    if (!metadataResponse.ok) {
        throw new Error(`Could not read ${imageId}.jpeg before deletion: ${metadataResponse.status}`);
    }

    const metadata = await metadataResponse.json() as GithubContentResponse;
    if (!metadata.sha) {
        throw new Error(`GitHub did not return a SHA for ${imageId}.jpeg`);
    }

    const deleteResponse = await fetch(contentUrl, {
        method: 'DELETE',
        headers: {
            ...githubHeaders(env),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: `Delete ${imageId}.jpeg after 7 days without access`,
            sha: metadata.sha,
        }),
    });

    if (!deleteResponse.ok && deleteResponse.status !== 404) {
        throw new Error(`Could not delete ${imageId}.jpeg: ${deleteResponse.status} ${await deleteResponse.text()}`);
    }
}

async function cleanupInactiveImages(env: Env, now: number): Promise<void> {
    const currentImageIds = await listCurrentImageIds(env);
    const accessTimes = await listAccessTimes(env);
    const cutoff = now - RETENTION_MS;

    // Give images uploaded before this feature a full seven days from the first
    // cleanup run instead of deleting them without a known last-access time.
    const missingIds = [...currentImageIds].filter((imageId) => !accessTimes.has(imageId));
    for (let index = 0; index < missingIds.length; index += KV_CONCURRENCY) {
        await Promise.all(missingIds.slice(index, index + KV_CONCURRENCY).map((imageId) => (
            recordAccess(env, imageId, now)
        )));
    }

    const staleIds = [...accessTimes]
        .filter(([imageId, lastAccessedAt]) => currentImageIds.has(imageId) && lastAccessedAt <= cutoff)
        .map(([imageId]) => imageId);

    let deletedCount = 0;
    // GitHub's Contents API creates one commit per deletion. Keep these calls
    // serial so parallel commits do not race while updating the same branch.
    for (const imageId of staleIds) {
        try {
            // Re-read immediately before deletion to reduce the chance that a
            // concurrent real view loses a just-renewed image.
            const latestAccess = Number(await env.IMAGE_ACCESS.get(accessKey(imageId)));
            if (!Number.isFinite(latestAccess) || latestAccess > cutoff) {
                continue;
            }

            await deleteImageFromGithub(env, imageId);
            await env.IMAGE_ACCESS.delete(accessKey(imageId));
            deletedCount += 1;
        } catch (error) {
            console.error('Scheduled image deletion failed:', imageId, error);
        }
    }

    const orphanedIds = [...accessTimes.keys()].filter((imageId) => !currentImageIds.has(imageId));
    for (let index = 0; index < orphanedIds.length; index += KV_CONCURRENCY) {
        await Promise.all(orphanedIds.slice(index, index + KV_CONCURRENCY).map((imageId) => (
            env.IMAGE_ACCESS.delete(accessKey(imageId))
        )));
    }

    console.log('Image cleanup complete', {
        tracked: accessTimes.size + missingIds.length,
        initialized: missingIds.length,
        deleted: deletedCount,
        orphanedMetadataRemoved: orphanedIds.length,
    });
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders,
            });
        }

        const url = new URL(request.url);
        if (request.method === 'POST' && url.pathname === '/upload') {
            return handleUpload(request, env);
        }
        if (request.method === 'GET') {
            return handleImageRequest(request, env, ctx);
        }
        return new Response('404', { status: 404 });
    },

    async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
        ctx.waitUntil(cleanupInactiveImages(env, controller.scheduledTime).catch((error) => {
            console.error('Scheduled cleanup failed:', error);
            throw error;
        }));
    },
} satisfies ExportedHandler<Env>;
