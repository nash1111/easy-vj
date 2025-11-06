import index from "./src/index.html";

Bun.serve({
  port: 3000,
  routes: {
    "/": index,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("⚡ Lightning VJ server running at http://localhost:3000");
