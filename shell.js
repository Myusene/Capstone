// shell.js - adds the app bar and the navigation (bottom tabs on phones,
// side rail on larger screens) to every page. It does not touch your data code.
(function () {
  if (document.getElementById("loginMessage")) { document.body.classList.add("login"); return; }

  var I = function (d) { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; };
  var NAV = [
    ["landingp.html", "Dashboard", I('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>')],
    ["inventory.html", "Inventory", I('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>')],
    ["product.html", "Product", I('<path d="M5 8h14l-1.5 11a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7z"/><path d="M4 8h16M14 8l1-5"/>')],
    ["receipt.html", "Receipts", I('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>')],
    ["sales.html", "Sales", I('<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>')]
  ];

  var page = location.pathname.split("/").pop() || "index.html";
  if (page === "add_product.html") page = "inventory.html";

  var bar = document.createElement("header");
  bar.className = "appbar";
  bar.innerHTML =
    '<div class="appbar-row"><a class="brand" href="landingp.html"><span class="logo">' +
    I('<path d="M12 6l8 4-8 4-8-4z"/><path d="M4 14l8 4 8-4"/>') +
    '</span>AFS: Inventory</a><span class="grow"></span>' +
    '<button class="icon-btn" aria-label="Notifications" onclick="location.href=\'inventory.html\'">' +
    I('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>') + '</button>' +
    '<button class="avatar" aria-label="Log out" title="Log out" onclick="if(confirm(\'Log out?\'))logout()">JA</button></div>' +
    '<div class="appbar-sub"><span>Ationg\u2019s \u00b7 Fruit Shake</span><span class="saved">All changes saved</span></div>';

  var nav = document.createElement("nav");
  nav.className = "tabs";
  nav.setAttribute("aria-label", "Main");
  nav.innerHTML = NAV.map(function (n) {
    return '<a href="' + n[0] + '"' + (n[0] === page ? ' class="on" aria-current="page"' : "") + ">" + n[2] + "<span>" + n[1] + "</span></a>";
  }).join("");

  document.body.prepend(bar);
  document.body.appendChild(nav);

  // pages without a <main> get one, so every page has the same layout
  if (!document.querySelector("main")) {
    var main = document.createElement("main");
    Array.from(document.body.children).forEach(function (el) {
      if (el !== bar && el !== nav && !/^(SCRIPT|DIALOG)$/.test(el.tagName)) main.appendChild(el);
    });
    bar.after(main);
  }
})();
