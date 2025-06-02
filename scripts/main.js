import * as herald from "./heraldFlip.js";

Hooks.on("ready", () => {
  setTimeout(async () => {
    herald.heraldFlip_renderAccessButton();
  }, 1000);
});
