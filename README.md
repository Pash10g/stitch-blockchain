# stitch-blockchain
Demo for MongoDB stitch as a store for blockchains

# Introduction 

Revolutionary Blockchain technology meets MongoDB’s empowering backend service and Database for modern applications to create next generation solutions. 
Using Stitch platform will allow us to design and build the next decentralize, trusted and fraud free applications utilizing its newest features.

# Overview

* In this workshop you will get to see live coding and build a hands-on application that is build with Stitch implementing a decentralized blockchain application. You will be able to use newest Stitch features such as Advanced Javascript functions and event driven notifications (Change Streams).

* The nodes will use the anonymous Stitch authentication consuming only public information. Each node is allowed to edit only its information while the node consensus will be enforced by Stitch functions. Notifications will be the main component that notifies subscribers and pushes the processes forward until completion.

* End peers (example wallets) may use a variety of authentication mechanisms available by Stitch to keep their data private and encrypted.

# Configuring and running
1. Setup an Atlas cluster and stitch. See the following [documentation](https://docs.mongodb.com/stitch/getting-started/).
2. [Import](https://docs.mongodb.com/stitch/import-export/create-stitch-app/) the stitch skelaton app from this repo: stitch-blockchain.tar.gz.
3. Create the following view in your cluster under database `transactions`:
```
db.createView("blockchain","pending_blocks",[{}]);
```
4. Create a mongodb readOnly user on all databases.
5. Start the producing nodes and provide the prompted MongoDB credentials created in 5:
```
node main.js
```
