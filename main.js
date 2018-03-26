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
        this.chain = [];
        this.difficulty = 3;

    }


     startMining(transactions,client)
    {
    //  var block_id = this.returnPromise(this.getLatestBlock,transactions).then(block => {block_id = block.index + 1;
    var block_id = this.getLatestBlock().index + 1;
      this.addBlock(new Block(block_id,"20/07/2017", client.authedId(),{ transactions: [block_id] }),transactions,client);


    }

    createAndMine(transactions,client) {

          transactions.collection('blockchain').find({index: 0}).limit(1).execute().then(docs => {
              console.log(JSON.stringify(docs));
              if (docs.length > 0)
              {
                console.log("Got Genesis block");
                var genesisBlock=docs[0];
                console.log(genesisBlock);

              }
              else {
                console.log("Created Genesis block");
                var genesisBlock=new Block(0, new Date(),client.authedId(), "Genesis block", "000000000000000000000000000");
                transactions.collection('blockchain').insertOne(genesisBlock);
                transactions.collection('pending_blocks').insertOne(genesisBlock);
                this.chain.push(genesisBlock);

              }
              this.chain.push(genesisBlock);
              console.log(transactions);
              this.startMining(transactions,client);
          }
        ).catch(err => {
          console.error(err)
        });

    }

    returnPromise(func, arg) {
        return new Promise(func.bind(this, arg));
    }

    getLatestBlock(transactions,resolve) {
/*
       console.log(transactions);
        var chain = this.getLatestChain(transactions).then(doc => {
            return doc[0].chain[0];
        }).catch(err => {
        console.error(err)
      });
      resolve(true);
      */
     return this.chain[this.chain.length - 1];

    }

    addBlock(newBlock,transactions,client) {
      console.log("Start Mining Block: " + newBlock.index + "...");
        newBlock.previousHash = this.getLatestBlock().hash;
        newBlock.mineBlock(this.difficulty);
        console.log("insert Block into db:",newBlock)
        try {
          var coll = transactions.collection("pending_blocks");
          coll.insertOne(newBlock).then(() =>
          {  this.chain.push(newBlock);
             var block_id = newBlock.index + 1;
             this.addBlock(new Block(block_id,new Date(), client.authedId(),{ transactions: [block_id] }),transactions,client);
             console.log("Finished Mining block #n: " + newBlock.index  + " HASH: " + newBlock.hash  )  ;
           }
          ).catch(err => {
          console.error(err)
        });
      }
        catch (e) {
        // handle write error
        console.log(e.message);
        return e.message;
      }
    }

    getLatestChain(transactions)
    {
           return transactions.collection('validChain').find({}).execute();
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



const clientPromise = stitch.StitchClientFactory.create('stitch-blockchain-hpfqm');

clientPromise.then(client => {
   const transactions = client.service('mongodb', 'mongodb-atlas').db('transactions');
   client.login().then(() => {
   let miner = { miner_id:  client.authedId(), owner_id: client.authedId(), signInDate : new Date(), active : true};
   const assets = client.service('mongodb', 'mongodb-atlas').db('assets');
   nodes = assets.collection('nodes');
   nodes.updateOne({owner_id: client.authedId()}, {$set: miner}, {upsert:true});

  MongoDBCoin = new Blockchain(transactions);
  transactions.collection("pending_blocks").deleteMany({}).then(() => {MongoDBCoin.createAndMine(transactions,client);}).catch(err => {
  console.error(err)
});

});

/*  console.log('Mining block 1...');

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
