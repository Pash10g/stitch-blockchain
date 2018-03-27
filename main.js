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
    this.approvedByMajority = false;
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


     startPrduce(transactions,client,atlasConn)
    {
    //  var block_id = this.returnPromise(this.getLatestBlock,transactions).then(block => {block_id = block.index + 1;
         const pipeline = [
      { $match: {'fullDocument.owner_id'  : {  "$ne" : client.authedId() } } }

    ];
      var db = atlasConn.db('transactions');
      const changeStream = db.collection('pending_blocks').watch(pipeline);



    var block_id = this.getLatestBlock().index + 1;
      this.addBlock(new Block(block_id,"20/07/2017", client.authedId(),{ transactions: [block_id] }),transactions,client,changeStream);


    }

    createAndPrduce(transactions,client,atlasConn) {

          transactions.collection('validChain').find({}).execute().then(docs => {
              if (docs.length > 0)
              {
                console.log("Got initial chian");
                this.chain=docs[0].chain;

              }
              else {
                console.log("Created Genesis block");
                var genesisBlock=new Block(0, new Date(),client.authedId(), "Genesis block", "000000000000000000000000000");
                transactions.collection('blockchain').insertOne(genesisBlock);
                transactions.collection('pending_blocks').insertOne(genesisBlock);
                this.chain.push(genesisBlock);

              }
              this.startPrduce(transactions,client,atlasConn);
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

    addBlock(newBlock,transactions,client,changeStream) {
      console.log("Start Producing Block: " + newBlock.index + "...");
        newBlock.previousHash = this.getLatestBlock().hash;
        newBlock.mineBlock(this.difficulty);

        changeStream.next(function(err, next) {

              console.log("Found doc for :" + next.fullDocument.index);
              // Since changeStream has an implicit seession,
              // we need to close the changeStream for unit testing purposes
              //changeStream.close();
              //client.close();
              if ((next.fullDocument.index == newBlock.index))
              {
                if (client.authedId() == next.fullDocument.owner_id){

                     console.log("The received notification was about block: " + next.fullDocument.index + " which was mined by us: " + next.fullDocument.owner_id);
                }
              }
              else {
                   console.log("The received notification is about historical block: " + next.fullDocument.index + " which was mined by: " + next.fullDocument.owner_id);
                   console.log("About toi validate block " + JSON.stringify(next));
                   this.verifyBlock(next.fullDocument,transactions,client);
              }

    });

        try {
          var coll = transactions.collection("pending_blocks");
          coll.insertOne(newBlock).then(() =>
          {
            this.chain.push(newBlock);
            var block_id = newBlock.index + 1;
            setTimeout(this.addBlock.bind(this),100,new Block(block_id,new Date(), client.authedId(),{ transactions: [block_id] }),transactions,client,changeStream);
             console.log("Finished producing block #n: " + newBlock.index  + " HASH: " + newBlock.hash  )  ;
           }
          ).catch(err => {

            transactions.collection('validChain').find({}).execute().then(docs => {
                if (docs.length > 0)
                {
                  this.chain=docs[0].chain;
                  var block_id = this.getLatestBlock().index + 2;
                  setTimeout(this.addBlock.bind(this),100,new Block(block_id,new Date(), client.authedId(),{ transactions: [block_id] }),transactions,client,changeStream);
                  console.log("Block #n: " + newBlock.index  + " was mined by another node : " + this.getLatestBlock().owner_id +" Moving to the next one: " + block_id )  ;
                }
              });
        });
      }
      catch (e) {
      // handle write error
      console.error(e.message)
    }
  }



    verifyBlock(block,transactions,client) {
           console.log("Verify block");
            tempBlock = new Block(block.index,block.timesamp, block.owner_id,block.data);

            if (block.hash !== tempBlock.calculateHash()) {
                return false;
            }
            block.approvals.push(client.authedId());
            transactions.collection('pending_blocks').updateOne({index: block.index},{$set: block}).then(()=>{
            return true;});
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


    var uri = "mongodb://blockadmin:block123@blockchaindb-shard-00-00-vjsde.mongodb.net:27017,blockchaindb-shard-00-01-vjsde.mongodb.net:27017,blockchaindb-shard-00-02-vjsde.mongodb.net:27017/transactions?ssl=true&replicaSet=BlockchainDB-shard-0&authSource=admin";
    MongoClient.connect(uri, function(err, db) {
      console.log("#########################################");
      console.log("####  Node: " + client.authedId() + " is up and starting to produce at : " + new Date());
      console.log("#########################################");
       MongoDBCoin = new Blockchain(transactions);
       MongoDBCoin.createAndPrduce(transactions,client,db);
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
