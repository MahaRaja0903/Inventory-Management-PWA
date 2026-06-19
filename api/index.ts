import serverBundle from "../dist/server.cjs";
const app = serverBundle.default || serverBundle;
export default app;