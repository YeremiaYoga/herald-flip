import * as herald from "./heraldFlip.js";

Hooks.on("ready", () => {
  setTimeout(async () => {
    herald.heraldFlip_renderAccessButton();
  }, 1000);
});

Hooks.once("init", () => {
  game.settings.register("herald-flip", "audioIncludeMp3", {
    name: "Include Audio Ext Mp3",
    hint: "Allow .mp3 files to be included for audio assets.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
});
