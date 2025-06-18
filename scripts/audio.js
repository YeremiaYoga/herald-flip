import * as helper from "./helper.js";
import * as flip from "./heraldFlip.js";
let heraldFlip_audioTheme = [
  "Chill",
  "Tense",
  "Happy",
  "Mysterious",
  "Whimsical",
  "Mystic",
  "Melancholy",
  "Romantic",
  "Sad",
  "Reunion",
  "Battle",
  "Boss",
  "Heroic",
  "Hopeless",
];
let heraldFlip_audioSocket;
Hooks.once("socketlib.ready", () => {
  heraldFlip_audioSocket = socketlib.registerModule("herald-flip");

  heraldFlip_audioSocket.register(
    "saveAudioToPlaylist",
    async ({ name, filePath, category, userName }) => {
      await heraldFlip_addAudioToPlaylist(name, filePath, category, userName);
    }
  );
});

async function heraldFlip_createAllThemeAudioFolder(folderName, user) {
  for (let theme of heraldFlip_audioTheme) {
    helper.heraldFLip_createFolder(`${folderName}/${user.name}/Audio/${theme}`);
  }
}

async function heraldFlip_renderViewFlipMiddleAudio() {
  let flipMiddle = document.getElementById("heraldFlip-dialogFlipMiddle");
  const user = game.user;
  const folders = game.folders.filter((f) => f.type === "JournalEntry");
  const heraldFlipFolder = folders.find((f) => f.name === "Herald Flip");

  const playerFolder = folders.find(
    (f) => f.name === user.name && f.folder?.id === heraldFlipFolder?.id
  );
  const flipJournal = game.journal.find(
    (j) => j.folder?.id === playerFolder?.id && j.name === "Audio"
  );
  let pages = [];
  if (flipJournal) {
    pages = flipJournal.pages.contents;
  }

  let arrAudio = "";
  let searchValue =
    document
      .getElementById("heraldFlip-searchFlipAudioInput")
      ?.value?.toLowerCase() ?? "";
  if (flipMiddle) {
    flipMiddle.innerHTML = `
      `;
  }
}

async function heraldFlip_renderViewAudioFlipBottom() {
  let flipBottom = document.getElementById("heraldFlip-dialogFlipBottom");
  const user = game.user;
  let selectedActor = user.character;

  if (flipBottom) {
    flipBottom.innerHTML = `
    <div id="heraldFlip-dialogFlipBottomTop" class="heraldFlip-dialogFlipBottomTop">
   
    </div>
    <div id="heraldFlip-dialogFlipBottomBot" class="heraldFlip-dialogFlipBottomBot">
      <div class="heraldFlip-searchFlipAudioContainer">
          <input type="text" id="heraldFlip-searchFlipAudioInput" class="heraldFlip-searchFlipAudioInput" placeholder="Search..." />
      </div>
      <div class="heraldFlip-addAssetFlipWrapper">
        <div id="heraldFlip-addAssetAudioFlip" class="heraldFlip-addAssetFlip">
          <i class="fa-solid fa-plus"></i>
        </div>
        <span class="heraldFlip-addAseetFlipTooltip">Add Audio</span>
      </div>
     
    </div>
    `;

    let searchTimeout;
    document
      .getElementById("heraldFlip-searchFlipAudioInput")
      ?.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          heraldFlip_renderViewFlipMiddleToken();
        }, 500);
      });
    document
      .getElementById("heraldFlip-addAssetAudioFlip")
      ?.addEventListener("click", async () => {
        await heraldFlip_addAssetAudioFlip();
      });
  }
}

async function heraldFlip_addAssetAudioFlip() {
  const limitedThemes = heraldFlip_audioTheme; // Kalau semua kategori
  const categoryOptions = limitedThemes
    .map((cat, i) => {
      const checked = i === 0 ? "checked" : "";
      return `
      <label style="margin: 5px; display: inline-block; width: 18%;">
        <input type="radio" name="audioCategory" value="${cat}" /> ${cat}
      </label>
    `;
    })
    .join("");
  let dialog = new Dialog({
    title: "Upload Assets",
    content: `
            <form>
              <div class="form-group">
                <label for="heraldFlip-audioNameInput">Audio/Music Name:</label>
                <input type="text" id="heraldFlip-audioNameInput" class="heraldFlip-audioNameInput" name="profileName" placeholder="Enter name" style="color:white !important;"/>
              </div>
              <div class="form-group">
                <label for="heraldFlip-audioFileInput">Upload File:</label>
                <input type="file" id="heraldFlip-audioFileInput" name="profileFile"/>
              </div>
              <div>Theme:</div>
              <div class="heraldFlip-audioThemeCategoryContainer">
                ${categoryOptions}
              </div>
            </form>
          `,
    buttons: {},
    render: (html) => {
      const confirmButton = $(
        `<button type="button" class="dialog-button">Confirm</button>`
      );
      const cancelButton = $(
        `<button type="button" class="dialog-button">Cancel</button>`
      );
      html
        .closest(".app")
        .find(".dialog-buttons")
        .append(confirmButton, cancelButton);

      cancelButton.on("click", () => dialog.close());
      confirmButton.on("click", async () => {
        const name = html.find('[name="profileName"]').val();
        const file = html.find('[name="profileFile"]')[0]?.files[0];
        const category = html.find('[name="audioCategory"]:checked').val();

        const ext = file?.name?.split(".").pop().toLowerCase();
        const userName = game.user.name;

        let missingFields = [];
        if (!name) missingFields.push("Profile Name");
        if (!file) missingFields.push("File");
        if (!category) missingFields.push("Category");

        if (missingFields.length > 0) {
          ui.notifications.warn("Please fill: " + missingFields.join(", "));
          return;
        }

        let folderPath = `Herald's-Flip/${userName}/Audio/${category}`;
        let filePath = `${folderPath}/${name}.${ext}`;
        if (game.user.isGM) {
          await helper.heraldFlip_uploadFileDirectly(
            userName,
            "Audio",
            file,
            name,
            folderPath
          );
        } else {
          await flip.heraldFlip_sendFileToGM(
            userName,
            "Audio",
            file,
            name,
            folderPath
          );
        }

        await heraldFlip_addAudiotoPages(name, "Audio", category, ext);

        await heraldFlip_audioSocket.executeAsGM("saveAudioToPlaylist", {
          name,
          filePath,
          category,
          userName,
        });

        dialog.close();
        // setTimeout(heraldFlip_renderViewFlipMiddleToken, 500);
      });
    },
  });

  dialog.render(true);
  Hooks.once("renderDialog", async (app) => {
    const dialogElement = app.element[0];
    const contentElement = dialogElement.querySelector(".window-content");
    if (contentElement) {
      contentElement.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
      contentElement.style.color = "white";
      contentElement.style.backgroundImage = "none";
      contentElement.style.backgroundSize = "cover";
      contentElement.style.backgroundRepeat = "no-repeat";
      contentElement.style.backgroundPosition = "center";
    }
    const buttons = dialogElement.querySelectorAll(
      ".dialog-buttons .dialog-button"
    );
    buttons.forEach((button) => {
      button.style.color = "white";
      button.style.border = "1px solid white";
    });
  });
}

async function heraldFlip_addAudioToPlaylist(
  audioName,
  filePath,
  category,
  userName
) {
  const heraldFlipFolder = game.folders.find(
    (f) => f.name === "Herald Flip" && f.type === "Playlist" && !f.folder
  );
  if (!heraldFlipFolder)
    return ui.notifications.error("Herald Flip folder not found.");
  const themeFolder = game.folders.find(
    (f) =>
      f.name === category &&
      f.folder?.id === heraldFlipFolder.id &&
      f.type === "Playlist"
  );
  if (!themeFolder)
    return ui.notifications.error(`Theme folder "${category}" not found.`);
  const userPlaylist = game.playlists.find(
    (p) => p.name === userName && p.folder?.id === themeFolder.id
  );
  if (!userPlaylist)
    return ui.notifications.error(`Playlist for user "${userName}" not found.`);

  await PlaylistSound.create(
    {
      name: audioName,
      path: filePath,
      volume: 0.8,
    },
    { parent: userPlaylist }
  );
}

async function heraldFlip_addAudiotoPages(name, type, theme, ext) {
  const user = game.user;
  const folders = game.folders.filter((f) => f.type === "JournalEntry");
  const heraldFlipFolder = folders.find((f) => f.name === "Herald Flip");

  const playerFolder = folders.find(
    (f) => f.name === user.name && f.folder?.id === heraldFlipFolder?.id
  );
  const flipJournal = game.journal.find(
    (j) => j.folder?.id === playerFolder?.id && j.name === type
  );

  const pageData = {
    name: name,
    type: "text",
    text: {
      content: `
        <p><strong>Profile Name :</strong> ${name}</p>
        <p><strong>Type :</strong> ${type}</p>
        <p><strong>Theme :</strong> ${theme}</p>
        <p><strong>Audio Name :</strong> ${name}</p>
        <p><strong>Audio Ext :</strong> ${ext}</p>
        <p><strong>Message :</strong> </p>
      `,
      format: 1,
    },
  };

  if (flipJournal) {
    await flipJournal.createEmbeddedDocuments("JournalEntryPage", [pageData]);
  }
}

export {
  heraldFlip_createAllThemeAudioFolder,
  heraldFlip_renderViewFlipMiddleAudio,
  heraldFlip_renderViewAudioFlipBottom,
};
