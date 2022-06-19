import { createApp } from "vue";
import App from "./App.vue";
import { hello } from "@zk-tron/core";

console.log(hello);

createApp(App).mount("#app");
