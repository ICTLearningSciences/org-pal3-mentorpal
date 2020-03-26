# Encrypted .env.enc files by stage

The lrs service requires enviroment config, and that .env must be encrypted for storage in the repo.

We use [dotenvenc](https://www.npmjs.com/package/dotenvenc) to handle encryption/decription of the `.env` files.

## Creating or Editing the .env.enc File

To create or edit the `env/lrs/<stage>/.env.enc` file for a stage:

- delete the current `env/lrs/<stage>/.env.enc` file (if exists)
- edit the shared `.env` config for the stage in 1password and then copy the updated values to `env/lrs/<stage>/.env`

 ```
 **NOTE** VERY IMPORTANT to keep the 1password copy of the file up to date. Otherwise team members will be stomping out each others' changes.
 ```

- put the password with no newline in `env/lrs/<stage>/.password` in the folder
- run `make env/lrs/<stage>/.env.enc` from the command line

## Server Side use of the .env.enc File

On the server, the single environment variable `ENV_PASSWORD` must be set to the same password that was used to encrypt the `.env.enc` file.

## Getting Access to the Current .env.enc File

The current .env config and password are kept in 1password. Ask for access if you need it and don't have.