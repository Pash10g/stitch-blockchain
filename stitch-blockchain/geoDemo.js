const stitch = require("mongodb-stitch");
var stitchClient;

function handleLogin(email, password) {
  console.log("button clicked");
  emailPasswordAuth(email, password);
    }


function emailPasswordAuth(email, password) {
  console.log ("email:" + email , "password:" + password);
  return stitchClient.login(email, password)
           .then(() => {
             console.log("in promise");
             assets_shared = [ "DOB" , "credit_score"];
            stitchClient.executeFunction('populateUserInfo',assets_shared, "credit_card", "2099-01-01T00:00:00.000" );
          }).catch(err => {
            console.log("in error promise");
          });
    return ret;
}


const clientPromise = stitch.StitchClientFactory.create('stitch-blockchain-hpfqm');
clientPromise.then(client => {
   const transactions = client.service('mongodb', 'mongodb-atlas').db('transactions');
   // Login once
  // while(true)
   //{
     client.login().then(() => {
    stitchClient = client;
    console.log("waiting for active logins....")
     transactions.collection("logins_4_chain").findOne({}).then( docs => {

          setTimeout(handleLogin("user2@emeaexample.com","user234"), 3000);

      }).catch(err => console.log(err));
 }).catch(err => console.log(err));
 //}
 });
