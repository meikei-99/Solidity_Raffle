# NextJS Raffle

## Smart contract whereby account users can enter a lottery (raffle) by paying certain amount of entrance fee

### Here are some features of this smart contract:

- allows user to enter raffle using two main chains, which are goerli network (chainId of 5) or localhost (chainId of 31337)
- allows user to enter raffle with entrance fee of 0.01 ETH (goerli network) or 0.02 ETH (localhost)
- whoever win the raffle will receive the ETH available in the smart contract

### Website Preview

<img src="./public/raffle-FCC.png" alt="demo" title="Optional title" width="600px" height="400px">

<a href="https://spring-snowflake-3208.on.fleek.co" target="_blank">Click here for live website.</a>

### Key learning points:

- use Chainlink Automation to automate winners selection
- use Chainlink VRF to select random winners
- use Web3 Providers from Moralis
- use Web3UIKit components
- deploy decentralized app using Fleek
- work with Next.js
