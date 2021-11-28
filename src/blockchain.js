/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *
 */

const SHA256 = require("crypto-js/sha256");
const { Block } = require("./block.js");
const bitcoinMessage = require("bitcoinjs-message");

const FIVE_MINUTES_UTC = 30_000;

class Blockchain {
  /**
   * Constructor of the class, you will need to setup your chain array and the height
   * of your chain (the length of your chain array).
   * Also everytime you create a Blockchain class you will need to initialized the chain creating
   * the Genesis Block.
   * The methods in this class will always return a Promise to allow client applications or
   * other backends to call asynchronous functions.
   */
  constructor() {
    this.chain = [];
    this.height = -1;
    this.initializeChain();
  }

  /**
   * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
   * You should use the `addBlock(block)` to create the Genesis Block
   * Passing as a data `{data: 'Genesis Block'}`
   */
  async initializeChain() {
    if (this.height === -1) {
      const block = new Block({ data: "Genesis Block" });
      await this._addBlock(block);
    }
  }

  /**
   * Utility method that return a Promise that will resolve with the height of the chain
   */
  getChainHeight() {
    return new Promise((res) => {
      res(this.height);
    });
  }

  /**
   * _addBlock(block) will store a block in the chain
   * @param {*} block
   * The method will return a Promise that will resolve with the block added
   * or reject if an error happen during the execution.
   * You will need to check for the height to assign the `previousBlockHash`,
   * assign the `timestamp` and the correct `height`...At the end you need to
   * create the `block hash` and push the block into the chain array. Don't for get
   * to update the `this.height`
   * Note: the symbol `_` in the method name indicates in the javascript convention
   * that this method is a private method.
   */
  _addBlock(block) {
    const self = this;
    return new Promise(async (res) => {
      // genesis block
      if (self.height === -1) {
        block.height = 1;
        this.height = 1;
      } else {
        block.height = ++this.height;
        block.previousBlockHash = this.chain[this.chain.length - 1].hash;
      }
      block.time = new Date().getTime().toString().slice(0, -3);
      block.hash = SHA256(JSON.stringify(block)).toString();
      this.chain.push(block);
      res(block);
    });
  }

  /**
   * The requestMessageOwnershipVerification(address) method
   * will allow you to request a message that you will use to
   * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
   * This is the first step before submit your Block.
   * The method return a Promise that will resolve with the message to be signed
   * @param {*} address
   */
  requestMessageOwnershipVerification(address) {
    return new Promise((res) => {
      res(
        `${address}:${new Date()
          .getTime()
          .toString()
          .slice(0, -3)}:starRegistry`
      );
    });
  }

  /**
   * The submitStar(address, message, signature, star) method
   * will allow users to register a new Block with the star object
   * into the chain. This method will resolve with the Block added or
   * reject with an error.
   * Algorithm steps:
   * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
   * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
   * 3. Check if the time elapsed is less than 5 minutes
   * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
   * 5. Create the block and add it to the chain
   * 6. Resolve with the block added.
   * @param {*} address
   * @param {*} message
   * @param {*} signature
   * @param {*} star
   */

  submitStar(address, message, signature, star) {
    const self = this;
    return new Promise(async (res, rej) => {
      const messageTimeStamp = parseInt(message.split(":")[1]);
      const currentTime = parseInt(
        new Date().getTime().toString().slice(0, -3)
      );

      if (
        currentTime - messageTimeStamp < FIVE_MINUTES_UTC &&
        bitcoinMessage.verify(message, address, signature)
      ) {
        const block = await self._addBlock(
          new Block({ data: { star, owner: address } })
        );
        res(block);
      } else {
        rej(null);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with the Block
   *  with the hash passed as a parameter.
   * Search on the chain array for the block that has the hash.
   * @param {*} hash
   */
  getBlockByHash(hash) {
    const self = this;
    return new Promise((res) => {
      const block = self.chain.find((b) => b.hash === hash);
      res(block ?? null);
    });
  }

  /**
   * This method will return a Promise that will resolve with the Block object
   * with the height equal to the parameter `height`
   * @param {*} height
   */
  getBlockByHeight(height) {
    const self = this;
    return new Promise((res) => {
      const block = self.chain.find((b) => b.height === height);
      res(block ?? null);
    });
  }

  /**
   * This method will return a Promise that will resolve with an array of Stars objects existing in the chain
   * and are belongs to the owner with the wallet address passed as parameter.
   * Remember the star should be returned decoded.
   * @param {*} address
   */
  getStarsByWalletAddress(address) {
    const self = this;
    return new Promise(async (res) => {
      const stars = [];
      for (const block of self.chain) {
        const { data } = await block.getBData();

        // handling the genesis block
        if (typeof data === "string") continue;

        const { owner, star } = data;
        if (owner === address) stars.push(star);
      }

      res(stars);
    });
  }

  /**
   * This method will return a Promise that will resolve with the list of errors when validating the chain.
   * Steps to validate:
   * 1. You should validate each block using `validateBlock`
   * 2. Each Block should check the with the previousBlockHash
   */
  validateChain() {
    const self = this;
    return new Promise(async (res) => {
      const errorLog = [];
      for (let i = 0; i < self.chain.length; i++) {
        const currentBlock = self.chain[i];
        try {
          let valid = await currentBlock.validate();
          console.log(valid);

          if (valid) {
            // genesis block
            if (
              currentBlock.previousBlockHash === null &&
              currentBlock.height === 1
            )
              continue;
            // is the prevHash the same as the block before and is the height
            // one larger than the block before
            else if (
              currentBlock.previousBlockHash !== self.chain[i - 1].hash ||
              currentBlock.height !== self.chain[i - 1].height + 1
            ) {
              valid = false;
            }
          }
          if (!valid) errorLog.push({ hash: currentBlock.hash, valid: false });
        } catch (e) {
          errorLog.push({ hash: currentBlock.hash, valid: false });
        }
      }

      res(errorLog);
    });
  }
}

module.exports.Blockchain = Blockchain;
