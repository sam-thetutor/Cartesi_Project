# Cartesi Typescript SQLite - Backend

The project is a Backend application running Typescript + SQLite to run with the respective frontend project. It is managed using npm as the package manager. The goal of the project is to create a template that streamlines the process of kickstarting new projects. The template incorporates the latest version of React and integrates with Ethers, allowing for seamless interaction with the underlying blockchain. For testing purposes, a pre-deployed demo on the Sepolia Network is available for users to explore before starting their own development.

[Live Demo](https://doiim.github.io/cartesi-ts-react-sqlite/)

## How this project is structured

![Cartesi project structure](https://github.com/doiim/cartesi-react-bootstrap/assets/13040410/2ab19829-997b-4964-82ca-b038f3fe2dd2)

A `Sunodo` template machine that runs a `Typescript` node service along with `viem` to convert values from/to Hex strings. We could have switched to `Ethers` but the idea was to reduce the amount to code, and the `Sunodo` template used already have support to `viem`. The database runs `SQLite` with WASM support due to the nature of the Risc-V Node has no native support to `SQLite` bindings.

This project is part of a `React SQLite` app template. If you want to run the frontend app together, follow intructions [here](https://github.com/doiim/cartesi-ts-react-sqlite/tree/master).

## Running Backend Locally using Sunodo

Before run this app it would be required to run the backend service for it. To run a local backend service for this app it is required [Sunodo](https://docs.sunodo.io/guide/introduction/what-is-sunodo).

1. [Install Sunodo](https://docs.sunodo.io/guide/introduction/installing)
2. Build project and after that run the Sunodo environment

```sh
sunodo build
sunodo run
```

This will run an [anvil](https://book.getfoundry.sh/reference/anvil/) node as a local blockchain, the GraphQL service and Inspect Service.

## Deploy to Production/Testnet using Sunodo

1. Install sunodo on the machine using the NPM version of it. For this tutorial we installed the 0.10.4.

```
npm install -g @sunodo/cli@0.10.4
```

2. Run `sunodo doctor` to check if all is set for build if anything is wrong some merror message will appear.
3. Make a copy of `testnet.example.env` as `testnet.env` and fill with your own data. The example file is pre-filled with `sepolia` deploy.

```sh
cp testnet.example.env testnet.env
```

4. Run sunodo build to build app locally.

```
sunodo build
```

5. Source the env file. This will add env variable to local environment.

```sh
source testnet.env
```

6. Download Testnet deploy script.

```sh
wget https://raw.githubusercontent.com/lynoferraz/sunodo-deploy-wo/main/testnet-deploy.yml
```

7. Run the following commands to deploy `Authority` and `Dapp` contract. Take note of the transaction hash that generated the Dapp contract cause you will be required to fill app `block genesis`. You just need to access the transaction hash on etherscan and get the block referent to it.

```
docker compose -f testnet-deploy.yml run authority-deployer
docker compose -f testnet-deploy.yml run dapp-deployer
```

8. Create a copy of the `sunodo.example.env` as `.sunodo.env` and replace all information between [] on your file according to the desired deploy. Here you will be required to fill the block copied above.

```sh
cp sunodo.example.env .sunodo.env
```

9. Get the installation folder where `sunodo` is installed. Take note of the path for the next step.

```sh
sunodo_path=$(npm prefix -g @sunodo/cli)/lib/node_modules/@sunodo/cli/dist
```

10. Check the value stored on variable using `echo` command. Ths output should be something like `/usr/local/lib/node_modules/@sunodo/cli/dist`.

```sh
echo $sunodo_path
```

11. Start the required services that will assist your validator.

```sh
SUNODO_BIN_PATH=$sunodo_path docker compose -f $sunodo_path/node/docker-compose-validator.yaml -f $sunodo_path/node/docker-compose-database.yaml -f $sunodo_path/node/docker-compose-explorer.yaml -f $sunodo_path/node/docker-compose-anvil.yaml -f $sunodo_path/node/docker-compose-proxy.yaml -f $sunodo_path/node/docker-compose-prompt.yaml -f $sunodo_path/node/docker-compose-snapshot-volume.yaml -f $sunodo_path/node/docker-compose-envfile.yaml --project-directory . up -d anvil database
```

12. Store on `container` environment variable the name of the container where the validator will remain.

```sh
container=$(SUNODO_BIN_PATH=$sunodo_path docker compose -f $sunodo_path/node/docker-compose-validator.yaml -f $sunodo_path/node/docker-compose-anvil.yaml -f $sunodo_path/node/docker-compose-proxy.yaml -f $sunodo_path/node/docker-compose-prompt.yaml -f $sunodo_path/node/docker-compose-snapshot-volume.yaml -f $sunodo_path/node/docker-compose-envfile.yaml --project-directory . ps | grep anvil | awk '{print $1}')
```

13. Copy files from previously deployed app to the docker machine.

```sh
docker cp .deployments/$NETWORK/rollups.json ${container}:/usr/share/sunodo/$NETWORK.json
docker cp .deployments/$NETWORK/dapp.json ${container}:/usr/share/sunodo/dapp-$NETWORK.json
```

14. Start the remaining services required.

```sh
SUNODO_BIN_PATH=$sunodo_path docker compose -f $sunodo_path/node/docker-compose-validator.yaml -f $sunodo_path/node/docker-compose-anvil.yaml -f $sunodo_path/node/docker-compose-proxy.yaml -f $sunodo_path/node/docker-compose-prompt.yaml -f $sunodo_path/node/docker-compose-snapshot-volume.yaml -f $sunodo_path/node/docker-compose-envfile.yaml --project-directory . up -d
```

#### Verification

To check if services are running correctly just run:

```sh
SUNODO_BIN_PATH=$sunodo_path docker compose -f $sunodo_path/node/docker-compose-validator.yaml -f $sunodo_path/node/docker-compose-anvil.yaml -f $sunodo_path/node/docker-compose-proxy.yaml -f $sunodo_path/node/docker-compose-prompt.yaml -f $sunodo_path/node/docker-compose-snapshot-volume.yaml -f $sunodo_path/node/docker-compose-envfile.yaml --project-directory . ps
```

To check the logs generated and monitor it in realtime:

```sh
verifier=$(SUNODO_BIN_PATH=$sunodo_path docker compose -f $sunodo_path/node/docker-compose-validator.yaml -f $sunodo_path/node/docker-compose-anvil.yaml -f $sunodo_path/node/docker-compose-proxy.yaml -f $sunodo_path/node/docker-compose-prompt.yaml -f $sunodo_path/node/docker-compose-snapshot-volume.yaml -f $sunodo_path/node/docker-compose-envfile.yaml --project-directory . ps | grep verifier | awk '{print $1}')
docker container logs $verifier -f
```

### Stopping Verifier Service

```sh
SUNODO_BIN_PATH=$sunodo_path docker compose -f $sunodo_path/node/docker-compose-validator.yaml -f $sunodo_path/node/docker-compose-anvil.yaml -f $sunodo_path/node/docker-compose-proxy.yaml -f $sunodo_path/node/docker-compose-prompt.yaml -f $sunodo_path/node/docker-compose-snapshot-volume.yaml -f $sunodo_path/node/docker-compose-envfile.yaml --project-directory . down -v
```

### Troubleshooting

1. In case `sunodo doctor` show the following message `Your system does not support riscv64 architecture`. The reason is that yout Docker BuildX isn't configured for deploy Risc-V architecture. Proceed with the following:

```sh
sudo apt install docker-buildx-plugin qemu-user-static binfmt-support
export DOCKER_BUILDKIT=1
```

## Learn More

This project is meant to run on [Cartesi Machine](https://docs.cartesi.io/), the tool used to run and deploy the backend to public networks was [Sunodo](https://docs.sunodo.io/guide/introduction/what-is-sunodo).

This project is based on the following repositories from Cartesi team:

- [Sunodo Typescript template project](https://github.com/sunodo/sunodo-templates/tree/main/typescript)
- [Backend SQLite Image](https://github.com/cartesi/rollups-examples/tree/main/sqlite)
- [Front-end Echo Example](https://github.com/cartesi/rollups-examples/tree/main/frontend-echo)
- [Sunodo Deploy Testnets Tutorial from Cartesi team](https://github.com/lynoferraz/sunodo-deploy-wo)
