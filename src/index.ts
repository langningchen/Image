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

export default {
    async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
        // Add CORS headers for all responses
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, { 
                status: 204,
                headers: corsHeaders
            });
        }
        if (request.method == 'POST' && new URL(request.url).pathname == '/upload') {
            const Image: string = await request.text();
            let ImageID: string = '';
            for (let i = 0; i < 32; i++) {
                ImageID += String.fromCharCode(Math.floor(Math.random() * 26) + 97);
            }
            const ImageData = Image.replace(/^data:image\/\w+;base64,/, '');
            
            // Validate base64 data
            if (!ImageData || ImageData.length === 0) {
                return new Response('Invalid image data', { 
                    status: 400,
                    headers: corsHeaders
                });
            }
            
            try {
                const response = await fetch(new URL('https://api.github.com/repos/' + env.GithubOwner + '/' + env.GithubRepo + '/contents/' + ImageID + '.jpeg'), {
                    method: 'PUT',
                    headers: {
                        'Authorization': 'Bearer ' + env.GithubPAT,
                        'Content-Type': 'application/json',
                        'User-Agent': 'langningchen-image',
                    },
                    body: JSON.stringify({
                        message: `Upload from ${request.headers.get('CF-Connecting-IP')} ${request.cf?.country}/${request.cf?.city}`,
                        content: ImageData
                    })
                });
                
                if (!response.ok) {
                    console.error('GitHub API error:', response.status, await response.text());
                    return new Response('Upload failed', { 
                        status: 500,
                        headers: corsHeaders
                    });
                }
                
                const jsonResponse = await response.json();
                if (jsonResponse['content'] == null || jsonResponse['content']['name'] !== ImageID + '.jpeg') {
                    console.log('Unexpected response:', jsonResponse);
                    return new Response('Upload failed', { 
                        status: 500,
                        headers: corsHeaders
                    });
                }
                
                return new Response(ImageID, { 
                    headers: { 
                        'Content-Type': 'text/plain',
                        ...corsHeaders
                    }
                });
            } catch (error) {
                console.error('Upload error:', error);
                return new Response('Upload failed', { 
                    status: 500,
                    headers: corsHeaders
                });
            }
        }
        else if (request.method == 'GET') {
            const ImageID = new URL(request.url).pathname.substring(1);
            if (ImageID == '') { 
                // Return 404 for root path - static assets are served by Cloudflare Workers automatically
                return new Response('', { status: 404, }); 
            }
            
            // Check if client has cached version using ETag
            const clientETag = request.headers.get('If-None-Match');
            const imageETag = `"${ImageID}"`;
            
            if (clientETag === imageETag) {
                return new Response(null, { status: 304 });
            }
            
            return await fetch(new URL('https://api.github.com/repos/' + env.GithubOwner + '/' + env.GithubRepo + '/contents/' + ImageID + '.jpeg?1=1'), {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + env.GithubPAT,
                    'Accept': 'application/vnd.github.v3.raw',
                    'User-Agent': 'langningchen-image',
                },
            }).then(async (res) => {
                if (!res.ok) {
                    return new Response('Image not found', { status: 404 });
                }
                
                return new Response(await res.blob(), { 
                    headers: { 
                        'Content-Type': 'image/jpeg',
                        'Cache-Control': 'public, max-age=31536000, immutable',
                        'ETag': imageETag,
                        'Last-Modified': new Date().toUTCString(),
                        'Accept-Ranges': 'bytes',
                        'X-Content-Type-Options': 'nosniff',
                        ...corsHeaders
                    }, 
                });
            }).catch((Error) => {
                return new Response(String(Error), { status: 404, });
            });
        }
        return new Response('404');
    },
};
