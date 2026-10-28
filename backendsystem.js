function TestFunction() {
    document.getElementById("demo").innerHTML = "Bakla Joseph Rancio";
}

//figure out the login function:
function attemptLogin(event) {
  // 1. Stop the page from refreshing!
  event.preventDefault();

  const validUsername = "admin";
  const validPassword = "Ationgthebest";

  const enteredUsername = document.getElementById("username").value;
  const enteredPassword = document.getElementById("password").value;
  
  const messageElement = document.getElementById("loginMessage");

  if (enteredUsername === validUsername && enteredPassword === validPassword) {
    messageElement.style.color = "green";
    messageElement.textContent = "Login successful! Welcome back.";
    window.location.href = "landingp.html"; // Redirect to dashboard page
  } else {
    messageElement.style.color = "red";
    messageElement.textContent = "Invalid username or password. Please try again.";
  }
}