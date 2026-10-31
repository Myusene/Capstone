# AFS: Inventory
Inventory system for Ationg's Fruit Shake Shop (mobile-style web app, no build step).

## Run it
1. Open this folder in VS Code.
2. Start a server on port 8080, either:
   - Terminal: `python -m http.server 8080` (or `npx http-server -p 8080`), or
   - Install the "Live Server" extension and set its port to 8080.
3. Press F5 ("Launch Chrome against localhost"), or open http://localhost:8080.

Login: admin / admin

## Files
- `index.html` - page shell
- `css/style.css` - all styling (colors are variables at the top)
- `js/app.js` - data, screens and actions
- `.vscode/launch.json` - Chrome debug launcher

## Where to change things
- Sample products/recipes: `seed()` in `js/app.js`
- Login credentials: `login()` in `js/app.js`
- Screens: the `if(tab=="dash" ...)` blocks inside `render()`
- Data is stored in the browser (localStorage key `afs-v1`). Clear it to reset to sample data.
