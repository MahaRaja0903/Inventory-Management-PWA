import app from "./dist/server.cjs";
console.log("App loaded successfully. Type of app is:", typeof app, "isFunction:", typeof app === "function" || (app && typeof app.default === "function"));
if (app && app.default) {
  console.log("App default type is:", typeof app.default);
}
