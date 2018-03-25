const HmacSHA256 = require("crypto-js/hmac-sha256");
const stitch = require("mongodb-stitch");
const Base64 = require('crypto-js/enc-base64');

const MongoClient = require('mongodb').MongoClient

class Block {
  constructor(blockId, timestamp,authedId, data, previousHash = '') {
    this.index = blockId;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.owner_id = authedId;
    this.data = data;
    this.nonce = 0;
    this.approvals = [];
    this.hash = this.calculateHash();
  }

  calculateHash() {
      return Base64.stringify(HmacSHA256( this.previousHash + this.timesamp + this.data + this.nonce.toString(), this.index.toString()));
  }

  mineBlock(difficulty) {
    while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
        this.nonce++;
        this.hash = this.calculateHash();
    }
    this.approvals.push(this.owner_id);
    console.log("BLOCK MINED: " + this.hash);
  }
}


class Blockchain{
    constructor(transactions) {
        this.chain = [this.createGenesisBlock(transactions)];
        this.difficulty = 4;
    }

    createGenesisBlock(transactions) {

          transactions.collection('blockchain').find({index: 0}).limit(1).execute().then(docs => {
              console.log(JSON.stringify(docs));
              if (docs.length > 0)
              {
                console.log("Got Genesis block");
                console.log(docs[0]);
                return new  Block(docs[0].index,docs[0].timestamp,docs[0].owner_id,docs[0].data,docs[0].previousHash);
              }
              else {
                console.log("Created Genesis block")
                transactions.collection('blockchain').insertOne(new Block(0, "01/01/2017",this.authedId, "Genesis block", "000000000000000000000000000"));
                return new Block(0, "01/01/2017",client.authedId(), "Genesis block", "000000000000000000000000000");
              }
          }
        ).catch(err => {
          console.error(err)
        });

    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addBlock(newBlock,transactions) {
        newBlock.previousHash = this.getLatestBlock().hash;
        newBlock.mineBlock(this.difficulty);
        transactions.collection('blockchain').insertOne(newBlock);
        this.chain.push(newBlock);
    }

    getLatestChain()
    {

      var uri = 'mongodb://blockadmin:block123@blockchaindb-shard-00-00-7yqx5.mongodb.net:27017,blockchaindb-shard-00-01-7yqx5.mongodb.net:27017,blockchaindb-shard-00-02-7yqx5.mongodb.net:27017/transactions?ssl=true&replicaSet=BlockchainDB-shard-0&authSource=admin';

      MongoClient.connect(uri, function(err, conn) {
         const db = conn.db("transactions");
         const chainColl = db.collection("blockchain");

        chainColl.aggregate([{$graphLookup:
        { from: "blockchain" , startWith: "$previousHash", "connectFromField" : "hash", connectToField: "previousHash",  as: "chain"}},{ $project : { "chain" : 1, _id : 0}}]).toArray(function(err, docs) {
            console.log("Got chain block")
            console.log(JSON.stringify(docs[0]))
            return this.chain;
          });
    });

   }

    isChainValid(transactions) {
        this.chain = this.getLatestChain();
        for (let i = 1; i < this.chain.length; i++){
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }

        return true;
    }
    /* transactions.collection('pending_blocks').aggregate({$graphLookup: { from: "pending_blocks" , startWith: "$previousHash", connect

    }}).limit(100).execute().then(docs => {
        console.log(docs[0])
        return docs[0];
    }*/
}



const clientPromise = stitch.StitchClientFactory.create('stitch-blockchain-wgaty');

clientPromise.then(client => {
   const transactions = client.service('mongodb', 'mongodb-atlas').db('transactions');
   client.login().then(() => {
   let miner = { miner_id:  client.authedId(), owner_id: client.authedId(), signInDate : "20/07/2017"};
   const assets = client.service('mongodb', 'mongodb-atlas').db('assets');
   nodes = assets.collection('nodes');
   nodes.updateOne({owner_id: client.authedId()}, {$set: miner}, {upsert:true});

  MongoDBCoin = new Blockchain(transactions);
  console.log('Mining block 1...');
   MongoDBCoin.addBlock(new Block(1,"20/07/2017", client.authedId(),{ amount: 4 }),transactions);
   console.log('Mining block 2...');
   MongoDBCoin.addBlock(new Block(2, "20/07/2017", client.authedId(),{ amount: 8}),transactions);
/*
   console.log('Mining block 2...');
   MongoDBCoin.addBlock(new Block(2, "20/07/2017", client.authedId(),{ amount: 8}),transactions);
  // console.log('Blockchain valid? ' + MongoDBCoin.isChainValid(transactions));

   console.log('Changing a block...');
   MongoDBCoin.chain[1].data = { amount: 100 };
   // savjeeCoin.chain[1].hash = savjeeCoin.chain[1].calculateHash();

  // console.log("Blockchain valid? " + MongoDBCoin.isChainValid(transactions));
  */
});
});
