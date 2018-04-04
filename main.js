const HmacSHA256 = require("crypto-js/hmac-sha256");
const stitch = require("mongodb-stitch");
const Base64 = require('crypto-js/enc-base64');
const chalk = require('chalk');
const MongoClient = require('mongodb').MongoClient


/*
This class represents a block.

 */

class Block {
  constructor(blockId, timestamp,authedId, data, previousHash = '',nonce = 0) {
    this.index = blockId;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.owner_id = authedId;
    this.data = data;
    this.nonce = nonce;
    this.approvals = [];
    this.approvedByMajority = false;
    this.hash = this.calculateHash();
  }

 // Calculate HmacSHA256 of the blocks data
  calculateHash() {
      return Base64.stringify(HmacSHA256( this.previousHash + this.timesamp + this.data + this.nonce.toString(), this.index.toString()));
  }

 // perform a prof of work and produce a block.
  produceBlock(difficulty) {
    while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
        this.nonce++;
        this.hash = this.calculateHash();
    }
    // Once produced the current node can approve the block.
    this.approvals.push(this.owner_id);
    console.log("BLOCK PRODUCED: " + this.hash);
  }
}

/*
This class represents a chain. A prerequesite is to have the following view of a valid chain in db transactions:
db.createView("blockchain","pending_blocks",[		{
					"$match" : {
						"index" : 0
					}
				},
				{
					"$graphLookup" : {
						"from" : "pending_blocks",
						"startWith" : "$previousHash",
						"connectFromField" : "hash",
						"connectToField" : "previousHash",
            "restrictSearchWithMatch" : { approvedByMajority : true },
						"as" : "chain"
					}
				},
				{
					"$unwind" : "$chain"
				},
				{
					"$sort" : {
						"chain.index" : 1
					}
				},
				{
					"$group" : {
						"_id" : "$_id",
						"chain" : {
							"$push" : "$chain"
						}
					}
				},
				{
					"$project" : {
						"chain" : 1,
						"_id" : 0
					}
				}
			]);
 */


class Blockchain{
    constructor(transactions) {
        this.chain = [];
        // Set the default consistency
        this.difficulty = 3;

    }





    approveAndPrduce(transactions,client,atlasConn) {
          // Retrieve the latest chain from the valid chain view.
          transactions.collection('blockchain').find({}).execute().then(docs => {
              if (docs.length > 0)
              {
                console.log("Got initial chian");
                this.chain=docs[0].chain;

              }
              else {
                // If no chain received then create the initial Genesis block
                console.log("Created Genesis block");
                var genesisBlock=new Block(0, new Date(),client.authedId(), "Genesis block", "000000000000000000000000000");
                transactions.collection('pending_blocks').insertOne(genesisBlock);
                this.chain.push(genesisBlock);

              }
              // Start producing new blocks
              this.startPrduce(transactions,client,atlasConn);
          }
        ).catch(err => {
          console.error(err)
        });

    }

    startPrduce(transactions,client,atlasConn){
      // Start producing the block and create a changeStream definition to listen to blocks which produced by other nodes.
        const pipeline = [
             { $match: {'fullDocument.owner_id'  : {  "$ne" : client.authedId() }, "operationType" : "insert" } }
           ];
     var db = atlasConn.db('transactions');
     const changeStream = db.collection('pending_blocks').watch(pipeline);

     // Using the changestream to receive all the notifications for currently waiting blocks
     var handleBlockNotification = (function(change) {

      /*     if (err)
           {
             console.error(err);
             return;
           }*/

           if ((change.fullDocument.index == newBlock.index))
           {
             if (client.authedId() == change.fullDocument.owner_id){
                 // If the notification is about our block no need to verify
                  console.log("The received notification was about block: " + change.fullDocument.index + " which was mined by us: " + change.fullDocument.owner_id);
             }
           }
           else {
                // If the notification is about someone else block we need to approve it
                console.log("Stream received!!! The received notification is about historical block: " + change.fullDocument.index + " which was produced by: " + change.fullDocument.owner_id);

                if (this.verifyBlock(change.fullDocument,transactions,client))
                {
                  console.log(chalk.green("Approved block: " + change.fullDocument.index + " which was produced by: " + change.fullDocument.owner_id));
                }
                else {
                  console.log("Rejected block: " + change.fullDocument.index + " which was produced by: " + change.fullDocument.owner_id);
                }
           }
          //changeStream.next().then((next,err) => {handleBlockNotification(err,next);}).catch(err => {console.error(err);});
         }).bind(this);

     changeStream.on("change",handleBlockNotification);

     // Start from a new block
     var block_id = this.getLatestBlock().index + 1;
     var newBlock = new Block(block_id,new Date(), client.authedId(),{ transactions: [ { payment :  block_id, ammont : block_id + 1 }  ] });

     this.addBlock(newBlock,transactions,client,changeStream);



   }

    returnPromise(func, arg) {
        return new Promise(func.bind(this, arg));
    }

    getLatestBlock(transactions,resolve) {
     return this.chain[this.chain.length - 1];
    }

    addBlock(newBlock,transactions,client,changeStream) {

      // Adding a new block
      console.log("Start Producing Block: " + newBlock.index + "...");
        newBlock.previousHash = this.getLatestBlock().hash;
        // Working on producing the correct hash.
        newBlock.produceBlock(this.difficulty);


        try {
          // Write blocks to the database
          var coll = transactions.collection("pending_blocks");
          coll.insertOne(newBlock).then(() =>
          {
            this.chain.push(newBlock);
            var block_id = newBlock.index + 1;
            setTimeout(this.addBlock.bind(this),100,new Block(block_id,new Date(), client.authedId(),{ transactions: [block_id] }),transactions,client,changeStream);
             console.log("Finished producing block #n: " + newBlock.index  + " HASH: " + newBlock.hash  )  ;
           }
          ).catch(err => {

            transactions.collection('blockchain').find({}).execute().then(docs => {
                if (docs.length > 0)
                {
                  this.chain=docs[0].chain;
                  var block_id = this.getLatestBlock().index + this.difficulty;
                  setTimeout(this.addBlock.bind(this),100,new Block(block_id,new Date(), client.authedId(),{ transactions: [block_id] }),transactions,client,changeStream);
                  console.log("Block #n: " + newBlock.index  + " was produced by another node : " + this.getLatestBlock().owner_id +" Moving to the next one: " + block_id )  ;
                }
              }).catch(err => {console.error(err);});
        });
      }
      catch (e) {
      // handle write error
      console.error(e.message)
    }
  }



    verifyBlock(block,transactions,client) {
            console.log(chalk.green("Verify block"));
            // Verify that the receive hash is authentic
            var tempBlock = new Block(block.index,block.timesamp, block.owner_id,block.data,block.previousHash, block.nonce);
            if (block.hash != tempBlock.calculateHash()) {
                console.log("Expected has to be: " + tempBlock.calculateHash() + " but it is: " + block.hash);
                return false;
            }
            // Once approved push approval to the store
            block.approvals.push(client.authedId());
            transactions.collection('pending_blocks').updateOne({index: block.index},{$set: {"approvals" : block.approvals}}).then(()=>{
            return true;}).catch(err => {console.error(err);});
            return true;
          }

    }

// main function

function main() {
  // Create Stitch class
  const clientPromise = stitch.StitchClientFactory.create('stitch-blockchain-hpfqm');

  clientPromise.then(client => {
     const transactions = client.service('mongodb', 'mongodb-atlas').db('transactions');
     // Login once
     client.login().then(() => {
       // Update connected node info and status
       let miner = { miner_id:  client.authedId(), owner_id: client.authedId(), signInDate : new Date(), active : true};
       const assets = client.service('mongodb', 'mongodb-atlas').db('assets');
       nodes = assets.collection('nodes');
       nodes.updateOne({owner_id: client.authedId()}, {$set: miner}, {upsert:true}).then(() => {

       // Connect directly to the Atlas instance for changeStream
        var uri = "mongodb://blockadmin:block123@blockchaindb-shard-00-00-vjsde.mongodb.net:27017,blockchaindb-shard-00-01-vjsde.mongodb.net:27017,blockchaindb-shard-00-02-vjsde.mongodb.net:27017/transactions?ssl=true&replicaSet=BlockchainDB-shard-0&authSource=admin";
        MongoClient.connect(uri, function(err, db) {
          console.log("#########################################");
          console.log("####  Node: " + client.authedId() + " is up and starting to produce at : " + new Date());
          console.log("#########################################");
          // Initiate the chain
           MongoDBCoin = new Blockchain(transactions);
           // Start producing and approving blocks
           MongoDBCoin.approveAndPrduce(transactions,client,db);
         });
     });


   }).catch(err => {
         console.error(err);
      });
    });

}

main();
