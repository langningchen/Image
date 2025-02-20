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
        if (request.method == 'POST' && new URL(request.url).pathname == '/upload') {
            const Image: string = await request.text();
            let ImageID: string = '';
            for (let i = 0; i < 32; i++) {
                ImageID += String.fromCharCode(Math.floor(Math.random() * 26) + 97);
            }
            const ImageData = Image.replace(/^data:image\/\w+;base64,/, '');
            return new Response(await fetch(new URL('https://api.github.com/repos/' + env.GithubOwner + '/' + env.GithubRepo + '/contents/' + ImageID + '.jpeg'), {
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
            }).then((Response) => {
                return Response.json();
            }).then((Response: any) => {
                if (Response['content'] == null || Response['content']['name'] !== ImageID + '.jpeg') {
                    console.log(Response);
                    return '';
                }
                return ImageID;
            }).catch((Error) => {
                console.log(Error);
                return '';
            }));
        }
        else if (request.method == 'GET') {
            const ImageID = new URL(request.url).pathname.substring(1);
            if (ImageID == '') { return new Response('', { status: 404, }); }
            return await fetch(new URL('https://api.github.com/repos/' + env.GithubOwner + '/' + env.GithubRepo + '/contents/' + ImageID + '.jpeg?1=1'), {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + env.GithubPAT,
                    'Accept': 'application/vnd.github.v3.raw',
                    'User-Agent': 'langningchen-image',
                },
            }).then(async (res) => {
                return new Response(await res.blob(), { headers: { 'Content-Type': 'image/jpeg', }, });
            }).catch((Error) => {
                return new Response(String(Error), { status: 404, });
            });
        }
        return new Response('404');
    },
};
