/**
 * Created this file as a helper to validate the inputs I was using
 *
 * Error: Non-base58 character
 *
 * To use:
 * 1. go to https://reinproject.org/bitcoin-signature-tool/#sign
 * 2. copy address, signature and message and paste them here.
 * 3. run the script using `node scripts/validateSignature.js`
 * 4. if you see true in the console, the message has been signed properly
 */

const bitcoinMessage = require("bitcoinjs-message");

const address = "1HZwkjkeaoZfTSaJxDw6aKkxp45agDiEzN",
  signature =
    "G1kU8B8PsQ9n+3qXG4F2vkdJ+t9nmQ7RLbXBKwOwA6z2BxTaSxk/zy0y2o3npwTq6mByzvhrkyNgz5ZRok5jSCQ=",
  message = "1HZwkjkeaoZfTSaJxDw6aKkxp45agDiEzN:1638090052:starRegistry";

console.log(bitcoinMessage.verify(message, address, signature));
