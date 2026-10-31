/* Login handling shared by login.html and index.html.
   Change the credentials here. (Demo only - this is not real security.) */
const USERS={admin:"admin"};
function isLoggedIn(){return sessionStorage.getItem("afs-in")==="1"}
function requireLogin(){if(!isLoggedIn())location.replace("login.html")}
function login(e){
  e.preventDefault();
  const u=document.getElementById("username").value.trim(),p=document.getElementById("password").value;
  if(USERS[u]!==undefined&&USERS[u]===p){sessionStorage.setItem("afs-in","1");location.replace("index.html")}
  else document.getElementById("loginMessage").textContent="Wrong username or password."
}
function logout(){sessionStorage.removeItem("afs-in");location.replace("login.html")}