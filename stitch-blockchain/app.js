
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
  function emailPasswordAuth(email, password) {
    console.log ("email:" + email , "password:" + password);
    console.log(stitchClient);
    return stitchClient.login(email, password)
           .then(() => {
						 console.log("in promise");
						 assets_shared = [ "assets_range" , "credit_score"];
						stitchClient.executeFunction('populateUserInfo',assets_shared, "credit_card", "2099-01-01T00:00:00.000" );
            debugger;
            $("#login-status")[0].innerText = "Logged in... Submitting to blockchain...";
            setTimeout(function() {
              $("#login-status")[0].innerText = "Block Submitted.";
            }, 5000);
            setTimeout(function() {
              $("#login-status")[0].innerText = "";
              console.log("moving to identified");
              showForm("identified");
								}, 10000);

            setTimeout(function() {
              $("#login-status")[0].innerText = "";
              console.log("moving to post-login");
              showForm("post-login");
								}, 12000);

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
  // Remove text from login boxes
  //emailEl.value = "";
  //passwordEl.value = "";
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

const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");
const statusMessage = document.getElementById("auth-type-identifier");
var stitchClient;

  const clientPromise = stitch.StitchClientFactory.create('stitch-blockchain-hpfqm');
  clientPromise.then(client => {
    const db = client.service('mongodb', 'mongodb-atlas').db('transactions');
    stitchClient = client;
    //if (stitchClient.authedId()) {
    //  stitchClient.logout();
    //}
  }).catch(err => console.log(err));
