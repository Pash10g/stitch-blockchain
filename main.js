const HmacSHA256 = require("crypto-js/hmac-sha256");
const stitch = require("mongodb-stitch");
const Base64 = require('crypto-js/enc-base64');
const chalk = require('chalk');
const MongoClient = require('mongodb').MongoClient
var atlasConn;

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
    console.log(chalk.blue("BLOCK PRODUCED: " + this.hash));
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
    constructor() {
        this.chain = [];
        // Set the default consistency
        this.difficulty = 3;
        this.currentBlocksData=[];

    }





    approveAndPrduce(transactions,client) {
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
              this.startPrduce(transactions,client);
          }
        ).catch(err => {
         console.error(err)
        });

    }

   handleChangeStreams (transactions,client) {

        // Confiugre change pipeline
        const pipeline = [
               { $match: {'fullDocument.owner_id'  : {  "$ne" : client.authedId() },
               "operationType" : "insert" } }
             ];
        // Get collection and set a change stream
         var db = atlasConn.db('transactions');
         const changeStream = db.collection('pending_blocks').watch(pipeline);



   // Using the changestream to receive all the notifications for currently waiting blocks
   var handleBlockNotification = (function(change) {

    /*     if (err)
         {
           console.error(err);
           return;
         }*/


          // If the notification is about someone else block we need to approve it
          console.log("Stream received!!! The received notification is about historical block: " + change.fullDocument.index + " which was produced by: " + change.fullDocument.owner_id);

          if (this.verifyBlock(change.fullDocument,transactions,client))
          {
            console.log(chalk.green("Approved block: " + change.fullDocument.index + " which was produced by: " + change.fullDocument.owner_id));
          }
          else {
            console.log("Rejected block: " + change.fullDocument.index + " which was produced by: " + change.fullDocument.owner_id);
          }

        //changeStream.next().then((next,err) => {handleBlockNotification(err,next);}).catch(err => {console.error(err);});
       }).bind(this);
      // Listen on changes
       changeStream.on("change",handleBlockNotification);


        // Listen for incoming logins
         const logins_4_chain_pipe = [
              { $match: { "operationType" : { "$in" : ["insert","update"] }, "fullDocument.blockchain_data.consumed" : false } }
            ];
            const logins_4_chainColl = db.collection('logins_4_chain');


            const logins_4_chainStream = logins_4_chainColl.watch(logins_4_chain_pipe,{fullDocument : "updateLookup" });
            var handleProfileNotification = (async function(change) {
            console.log("Stream received!!! The received notification ip: " + change.fullDocument.blockchain_data.ip + " which was produced by country: " + change.fullDocument.blockchain_data.country_name + " loginTime: " + change.fullDocument.blockchain_data.loginTime);
             var docs =  await transactions.collection('profiles').find({"user_id" : change.fullDocument.user_id},{_id : 0}).execute().catch((err) => { console.log(err); });/*.then(docs => {*/
            if (docs.length > 0)
            {
              change.fullDocument.blockchain_data.shared_info=docs[0];
              console.log("Added the following shared_info :" + JSON.stringify(docs[0]) );
            }

            // Handle incoming login verification and classification of data shared with the block
            var handleFindAndModify =  (function(err, doc){

                if (doc.lastErrorObject.n > 0)
                {
                  if (this.verifyProfile(change.fullDocument))
                  {
                    this.currentBlocksData.push(change.fullDocument.blockchain_data);
                    console.log(chalk.green("Approved and pushed profile: " + change.fullDocument.user_id + " with loginTime: " + change.fullDocument.blockchain_data.loginTime));
                  }
                  else {
                    console.log("Rejected profile: " + change.fullDocument.user_id  );
                  }
                }
                else {
                    console.log(chalk.red("Profile: " + change.fullDocument.user_id + " is already placed in a pending block "));
                }
            }).bind(this);

             // Update consumed login
             logins_4_chainColl.findOneAndUpdate({_id: change.fullDocument._id, "blockchain_data.consumed" : false } ,{"$push" : { "blockchain_data.blocks_ids" : this.getLatestBlock().index + 1}, $set: { "blockchain_data.consumed": true }}, { returnOriginal: false, upsert: false},
             handleFindAndModify);

          }).bind(this);

          logins_4_chainStream.on("change",handleProfileNotification);
    }

    startPrduce(transactions,client){
      // Start producing the block and create a changeStream definition to listen to blocks which produced by other nodes.
      this.handleChangeStreams(transactions,client);

      // Start from a new block
      var block_id = this.getLatestBlock().index + 1;
       console.log("Waiting for incoming logins...");
      var waitForLogin = (function()
        { if(this.currentBlocksData.length > 0) { clearInterval(timeout);
          var newBlock = new Block(block_id,new Date(), client.authedId(),this.currentBlocksData);
          this.addBlock(newBlock,transactions,client);
   } }).bind(this);
      var timeout = setInterval(waitForLogin, 500);

   }

   verifyProfile(doc)
   {
     return true;
   }


    returnPromise(func, arg) {
        return new Promise(func.bind(this, arg));
    }

    getLatestBlock(transactions,resolve) {
     return this.chain[this.chain.length - 1];
    }

    addBlock(newBlock,transactions,client) {
      // wait that there are logins to be pushed

      // Adding a new block
      console.log(chalk.yellow("Start Producing Block: " + newBlock.index + "..."));
        newBlock.previousHash = this.getLatestBlock().hash;
        // Working on producing the correct hash.
        newBlock.produceBlock(this.difficulty);



        try {
          // Write blocks to the database
          var coll = transactions.collection("pending_blocks");
          coll.insertOne(newBlock).then(() =>
          {
            console.log("Waiting for incoming logins...");
            this.chain.push(newBlock);
            var block_id = newBlock.index + 1;
            var waitForLogin = (function()
            {  if(this.currentBlocksData.length > 0) { clearInterval(timeout);
                this.addBlock(new Block(block_id,new Date(), client.authedId(),this.currentBlocksData),transactions,client);
              } }).bind(this);
            var timeout = setInterval(waitForLogin, 500);

             console.log("Finished producing block #n: " + newBlock.index  + " HASH: " + newBlock.hash  )  ;
             this.currentBlocksData=[];
           }

          ).catch(err => {
            transactions.collection('blockchain').find({}).execute().then(docs => {
                if (docs.length > 0)
                {
                  this.chain=docs[0].chain;
                  var block_id = this.getLatestBlock().index + this.difficulty - 1;
                  this.addBlock(new Block(block_id,new Date(), client.authedId(),this.currentBlocksData),transactions,client);
                  console.log(chalk.yellow("Block #n: " + newBlock.index  + " was produced by another node : " + this.getLatestBlock().owner_id +" Moving to the next one: " + block_id ))  ;
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
                console.log("Expected HASH to be: " + tempBlock.calculateHash() + " but it is: " + block.hash);
                return false;
            }
            // Once approved push approval to the store
            block.approvals.push(client.authedId());
            transactions.collection('pending_blocks').updateOne({index: block.index},{$set: {"approvals" : block.approvals}}).then(()=>{
            transactions.collection('pending_blocks').updateOne({index: block.index},{$set: { "approvedByMajority" : true} })}).catch(err => {/*console.error(err);*/});
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
       let producer = { producer_id:  client.authedId(), owner_id: client.authedId(), signInDate : new Date(), active : true};
       const assets = client.service('mongodb', 'mongodb-atlas').db('assets');
       nodes = assets.collection('nodes');
       nodes.updateOne({owner_id: client.authedId()}, {$set: producer}, {upsert:true}).then(() => {

       // Connect directly to the Atlas instance for changeStream
        var uri = "mongodb://blockadmin:block123@blockchaindb-shard-00-00-vjsde.mongodb.net:27017,blockchaindb-shard-00-01-vjsde.mongodb.net:27017,blockchaindb-shard-00-02-vjsde.mongodb.net:27017/transactions?ssl=true&replicaSet=BlockchainDB-shard-0&authSource=admin";
        MongoClient.connect(uri, function(err, db) {
          console.log("#########################################");
          console.log("####  Node: " + client.authedId() + " is up and starting to produce at : " + new Date());
          console.log("#########################################");
          if (err)
          {
            console.error("connect error: " + err);
            return;
          }

          // Initiate the chain
           MongoDBChain = new Blockchain();
           // Start producing and approving blocks
            atlasConn = db;
           MongoDBChain.approveAndPrduce(transactions,client,db);
         });
     });


   }).catch(err => {
         console.error(err);
      });
    });

}

main();
