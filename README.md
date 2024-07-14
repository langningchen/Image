# Image

## Introduction

A very simple online image hosting service

## Usage

1. Clone this repository
2. [Create a new GitHub Personal Access Token](https://github.com/settings/tokens/new) with the `repo` scope
3. [Create a private repository](https://github.com/new?name=Image-Data&description=Store%20data%20for%20Image&visibility=private) to store your files
4. Make sure you have `npm` and `wrangler` installed and configured
5. Run `npm install` to install dependencies
6.  Run `wrangler deploy` to publish your project
7.  Run `wrangler secret put GithubPAT`, `wrangler secret put GithubOwner` and `wrangler secret put GithubRepo` to store your GitHub Personal Access Token, GitHub Owner and GitHub Repository
8.  Your image hosting service is now live! 🎉

## License

This project is licensed under the terms of the GNU General Public License v3.0.