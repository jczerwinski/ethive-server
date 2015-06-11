# Ethive Server
This is the repository for ethive's HTTP API server. It is intended to be used by for development, testing, and deployment of this server.

## Getting Started
1. Make sure you have `git`, `node`, `npm`, and `mongodb` installed.
2. Clone the repository:

        git clone git@github.com:jczerwinski/ethive-server.git

3. Dive in: `cd ethive-server`
4. Install dependencies: `npm i`
5. Depending on what you want to do, run a script from `package.json`:
    1. `npm run serve` to start the server in development mode -- it will reload on code changes.
    2. `npm run test` to run the tests.

## Deployment
Deployment works like this:
1. A `git push` is made to the `master` branch of the GitHub repo.
2. GitHub notifies Codeship's continuous integration servce of the change.
3. Codeship grabs, builds, and tests the repo.
4. If Codeship completes without error, it deploys the new code to Modulus.
5. Pass or fail, Codeship then sends out some notifications as to the status of the build.

## Architecture
There are three basic layers to the stack:
1. The HTTP API. Lives in `/app/api`. Handles HTTP requests. Designed for the benefit of [ethive-webapp](https://github.com/jczerwinski/ethive-webapp).
2. Business Models. Live in `/app/models`. Handles validation, persistence, retrieval, and other such business logic. Pretty tightly coupled to Mongoose and mongodb at the moment, but that's okay.
3. mongodb. Lives on your local 

## FAQ
### Why do models have both _id and id fields?
_ids are permanent, immutable, database-globally unique MongoDB ObjectIds. ids are User or Staff generated Strings, designed to be used as human-readable, URL compatible identifiers. Having both allows for us to change hde human-readable `id` without needing to update references to the object throughought the database.