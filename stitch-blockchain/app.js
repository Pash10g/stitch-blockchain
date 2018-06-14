
  function handleLogin() {
    $(".fa-spinner").removeClass("waiting");
    $("#login-status")[0].innerText = "";
    getLoginFormInfo()
      .then(user => emailPasswordAuth(user.email, user.password))
      .catch(err => {
        debugger;
        console.error(err);
        $(".fa-spinner").addClass("waiting");
      });
    }

  function handleSaveSettings() {
    $(".fa-spinner").removeClass("waiting");
    // Share settings with blockchain
    var assets_shared = [ "assets_range" , "credit_score"];
    stitchClient.executeFunction('populateUserInfo',assets_shared, "credit_card", "2099-01-01T00:00:00.000", "assets_share" );
    $("#share-status")[0].innerText = "Privacy Settings Shared... Submitting to blockchain...";
    setTimeout(function() {
      $("#share-status")[0].innerText = "Block Submitted.";
    }, 7000);
    setTimeout(function() {
      $("#share-status")[0].innerText = "";
      console.log("moving to shared");
      window.location = '#popup1';
      $(".fa-spinner").addClass("waiting");
    }, 12000);
  }

  function emailPasswordAuth(email, password) {
    // Perfom the email/password login
    console.log(stitchClient);
    return stitchClient.login(email, password)
           .then(() => {
						 assets_shared = [];
						stitchClient.executeFunction('populateUserInfo',assets_shared, "credit_card", "2099-01-01T00:00:00.000", "login" );
            $("#login-status")[0].innerText = "Logged in... Submitting to blockchain...";
            setTimeout(function() {
              $("#login-status")[0].innerText = "Block Submitted.";
            }, 7000);
            setTimeout(function() {
              $("#login-status")[0].innerText = "";
              console.log("moving to identified");
              $(".fa-spinner").addClass("waiting");
              showForm("identified");
            }, 12000);

           setTimeout(function() {
              $("#login-status")[0].innerText = "";
              console.log("moving to post-login");
              showForm("post-login");
            }, 15000);

            }).catch(err => {
							$(".fa-spinner").addClass("waiting");
             	console.error(err);
              $("#login-status")[0].innerText = "Error: " + err.message;
         });
	return ret;
}


/* UI Management Functions */
function getLoginFormInfo() {
  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  // Parse out input text
  const email = emailEl.value;
  const password = passwordEl.value;
  return new Promise(resolve => resolve({ email: email, password: password }));
}



function showForm(id) {
	$(".screen").hide();
	$("." + id).fadeIn(300);
}

window.onload = function() {
  initAnimation();
   showForm("login-screen");
    $(".provider-logo").click((selected) => {
      var prevState = selected.currentTarget.parentNode.children[1].style.opacity;
      if (prevState == 1) {
          selected.currentTarget.parentNode.children[1].style.opacity = 0;
          selected.currentTarget.style.filter = "grayscale(100%)";
      } else {
        selected.currentTarget.parentNode.children[1].style.opacity = 1;
        selected.currentTarget.style.filter = "grayscale(0%)";
      }
    });

    $(".submit-settings-button").click(() => {
      $(".fa-spinner").addClass("waiting");
      showForm("login-screen");
    })
}

// Get UI objects
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");
const statusMessage = document.getElementById("auth-type-identifier");
var stitchClient;


// Connect to stitch
  const clientPromise = stitch.StitchClientFactory.create('stitch-blockchain-hpfqm');
  clientPromise.then(client => {
    const db = client.service('mongodb', 'mongodb-atlas').db('transactions');
    stitchClient = client;
    //if (stitchClient.authedId()) {
    //  stitchClient.logout();
    //}
  }).catch(err => console.log(err));
