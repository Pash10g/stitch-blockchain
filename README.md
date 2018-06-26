# stitch-blockchain
Demo for MongoDB stitch as a store for blockchains

# Introduction

Revolutionary Blockchain technology meets MongoDB’s empowering backend service and Database for modern applications to create next generation solutions.
Using Stitch platform will allow us to design and build the next decentralize, trusted and fraud free applications utilizing its newest features.

# Overview

* In this workshop you will get to see live coding and build a hands-on application that is build with Stitch implementing a decentralized blockchain application. You will be able to use newest Stitch features such as Advanced Javascript functions and event driven notifications (Change Streams).

* The nodes will use the anonymous Stitch authentication consuming only public information. Each node is allowed to edit only its information while the node consensus will be enforced by Stitch functions. Notifications will be the main component that notifies subscribers and pushes the processes forward until completion.

* End peers (example bank accounts) may use a variety of authentication mechanisms available by Stitch to keep their data private and encrypted.

# Prerequistes for the demo
1. You should have a 3.6+ Atlas cluster running with a new stitch app in place.
2. We are using the following 3rd party service for the demo
- https://ipstack.com/ - For IP information gathering. Please obtain your access key.
- https://www.mapbox.com/ - For map visualization on the frontend app. Please obtain your access token

# Configuring and running
1. Setup an Atlas cluster and stitch. See the following [documentation](https://docs.mongodb.com/stitch/getting-started/).
2. [Import](https://docs.mongodb.com/stitch/import-export/create-stitch-app/) the stitch skelaton app from this repo: stitch-blockchain.zip.
3. Create the following view and index in your cluster under database `transactions`:
```
db.createView("blockchain","pending_blocks",
			[	{
					"$match" : {
						"index" : 0,
						"approvedByMajority" : true
					}
				},
				{
					"$graphLookup" : {
						"from" : "pending_blocks",
						"startWith" : "$previousHash",
						"connectFromField" : "hash",
						"connectToField" : "previousHash",
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

db.pending_blocks.createIndex({index : 1},{unique : true});

```
4. Create a mongodb readWrite user on databases: `transactions`,`assets`. Verify that the cluster name in the imported application is associated with your cluster name.
5. Edit the `main.js` file with the MongoDB credentials created in step 1 and the correct connection string for your Atlas cluster/ Stitch appId. Run the production of the blocks with:
```
npm install
node main.js
```
Spin as many nodes as you see fit. Remember they are scalable.
6. Create a stitch email/password credentials through Authentication tab. Make sure the the following that in the values tab you place `ipstack_access_token` value to the `ipstack` access token you have.
7. Edit the dummy `stitch-blockchain/app.js` application  with your stitch <appId>, edit `stitch-blockchain/mobileendpoint.html` and replace <accessToken> with your mapbox token.
8. Open the application `stitch-blockchain/mobileendppoint.html` and input the credentials created in step 6. The blockchain should now work.
