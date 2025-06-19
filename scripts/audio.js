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

  heraldFlip_audioSocket.register(
    "deleteAudioFromPlaylist",
    async ({ name, theme, userName }) => {
      await heraldFlip_deleteAudiofromPlaylist(name, theme, userName);
    }
  );

  heraldFlip_audioSocket.register(
    "renameAudioInPlaylist",
    async ({ oldName, newName, theme, userName }) => {
      await heraldFlip_renameAudioInPlaylist({
        oldName,
        newName,
        theme,
        userName,
      });
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
  for (const page of pages) {
    const data = await helper.heraldFlip_extractDataFromPage(page);

    if (!data.profileName.toLowerCase().includes(searchValue)) {
      continue;
    }
    arrAudio += `
    <div class="heraldFlip-flipAudioContainer">
      <div class="heraldFlip-flipAudioLeft">
      </div>
      <div class="heraldFlip-flipDataMiddle">
        <div class="heraldFlip-flipAudioName">${data.profileName}</div>
        <div class="heraldFlip-flipAudioTheme">${data.theme}</div>
      </div>
     <div class="heraldFlip-flipDataRight">
        <div class="heraldFlip-flipAudioEditButton heraldFlip-flipAudioOpsiContainer">
          <i class="fa-solid fa-pen-to-square"></i>
          <span class="heraldFlip-flipAudioOpsiTooltip">Edit</span>
        </div>
        <div class="heraldFlip-flipAudioDeleteButton heraldFlip-flipAudioOpsiContainer">
          <i class="fa-solid fa-trash"></i>
          <span class="heraldFlip-flipAudioOpsiTooltip">Delete</span>
        </div>
      </div>

    </div>
  `;
  }

  if (flipMiddle) {
    flipMiddle.innerHTML = arrAudio;

    flipMiddle
      .querySelectorAll(".heraldFlip-flipAudioEditButton")
      .forEach((btn, index) => {
        btn.addEventListener("click", async () => {
          const pageToEdit = pages[index];
          const data = await helper.heraldFlip_extractDataFromPage(pageToEdit);
          const currentContent = pageToEdit.text.content;
          const editDialog = new Dialog({
            title: "Edit Audio Profile Name",
            content: `
          <form>
            <div class="form-group">
              <label for="editAudioName">New Profile Name:</label>
              <input type="text" name="editAudioName" value="${data.profileName}" style="color:white; width:100%;" />
            </div>
          </form>
        `,
            buttons: {
              confirm: {
                label: "Save",
                callback: async (html) => {
                  const newName = html
                    .find('[name="editAudioName"]')
                    .val()
                    .trim();
                  if (!newName || newName === data.profileName) return;

                  const newContent = currentContent.replace(
                    /(<strong>Profile Name :<\/strong>\s*)(.*?)<\/p>/,
                    `$1${newName}</p>`
                  );

                  await pageToEdit.update({
                    name: newName,
                    "text.content": newContent,
                  });

                  await heraldFlip_audioSocket.executeAsGM(
                    "renameAudioInPlaylist",
                    {
                      oldName: data.profileName,
                      newName: newName,
                      theme: "Battle",
                      userName: game.user.name,
                    }
                  );

                  ui.notifications.info(`Audio name updated to "${newName}".`);
                  await heraldFlip_renderViewFlipMiddleAudio();
                },
              },
              cancel: {
                label: "Cancel",
              },
            },
            default: "confirm",
          });

          editDialog.render(true);
          Hooks.once("renderDialog", async (app) => {
            const dialogElement = app.element[0];

            const contentElement =
              dialogElement.querySelector(".window-content");
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
        });
      });

    flipMiddle
      .querySelectorAll(".heraldFlip-flipAudioDeleteButton")
      .forEach((btn, index) => {
        btn.addEventListener("click", async () => {
          const confirm = await Dialog.confirm({
            title: "Confirm Deletion",
            content: `<p>Are you sure you want to delete this audio Profile?</p>`,
            yes: () => true,
            no: () => false,
            defaultYes: false,
          });

          if (confirm) {
            const pageToDelete = pages[index];
            const data = await helper.heraldFlip_extractDataFromPage(
              pageToDelete
            );
            await heraldFlip_audioSocket.executeAsGM(
              "deleteAudioFromPlaylist",
              {
                name: data.profileName,
                theme: data.theme,
                userName: game.user.name,
              }
            );

            await pageToDelete.delete();
            await heraldFlip_renderViewFlipMiddleAudio();
          }
        });
      });
  }
}

async function heraldFlip_renameAudioInPlaylist({
  oldName,
  newName,
  theme,
  userName,
}) {
  const heraldFlipFolder = game.folders.find(
    (f) => f.name === "Herald Flip" && f.type === "Playlist" && !f.folder
  );
  if (!heraldFlipFolder) {
    ui.notifications.error("Herald Flip folder not found.");
    return;
  }

  const themeFolder = game.folders.find(
    (f) =>
      f.name === theme &&
      f.folder?.id === heraldFlipFolder.id &&
      f.type === "Playlist"
  );
  if (!themeFolder) {
    ui.notifications.error(`Theme folder "${theme}" not found.`);
    return;
  }

  const userPlaylist = game.playlists.find(
    (p) => p.name === userName && p.folder?.id === themeFolder.id
  );
  if (!userPlaylist) {
    ui.notifications.error(`Playlist for user "${userName}" not found.`);
    return;
  }

  const targetSound = userPlaylist.sounds.find((s) => s.name === oldName);
  if (!targetSound) {
    ui.notifications.warn(`Audio "${oldName}" not found in playlist.`);
    return;
  }

  await targetSound.update({ name: newName });
  ui.notifications.info(
    `Audio "${oldName}" renamed to "${newName}" in playlist.`
  );
}

async function heraldFlip_deleteAudiofromPlaylist(audioName, theme, userName) {
  const heraldFlipFolder = game.folders.find(
    (f) => f.name === "Herald Flip" && f.type === "Playlist" && !f.folder
  );
  if (!heraldFlipFolder) return;

  const themeFolder = game.folders.find(
    (f) =>
      f.name === theme &&
      f.folder?.id === heraldFlipFolder.id &&
      f.type === "Playlist"
  );
  if (!themeFolder) return;

  const playlist = game.playlists.find(
    (p) => p.name === userName && p.folder?.id === themeFolder.id
  );
  if (!playlist) return;

  const sound = playlist.sounds.find((s) => s.name === audioName);
  if (sound) await sound.delete();
}

async function heraldFlip_renderViewAudioFlipBottom() {
  let flipBottom = document.getElementById("heraldFlip-dialogFlipBottom");
  const user = game.user;
  let selectedActor = user.character;

  if (flipBottom) {
    const includeMp3 = game.settings.get("herald-flip", "audioIncludeMp3");
    flipBottom.innerHTML = `
   <div id="heraldFlip-dialogFlipBottomTop" class="heraldFlip-dialogFlipBottomTop">
      ${
        game.user.isGM
          ? `<label class="heraldFlip-toggleMp3IncludeContainer" style="margin-left: auto; display: flex; align-items: center;">
              <input type="checkbox" id="heraldFlip-toggleMp3" ${
                includeMp3 ? "checked" : ""
              } />
              <span class="heraldFlip-sliderIncludeMp3"></span>
              <span style="margin-left: 5px;">MP3</span>
            </label>`
          : ""
      }
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

    if (game.user.isGM) {
      document
        .getElementById("heraldFlip-toggleMp3")
        ?.addEventListener("change", async (e) => {
          await game.settings.set(
            "herald-flip",
            "audioIncludeMp3",
            e.target.checked
          );
          ui.notifications.info(
            `MP3 support has been ${e.target.checked ? "enabled" : "disabled"}.`
          );
        });
    }

    let searchTimeout;
    document
      .getElementById("heraldFlip-searchFlipAudioInput")
      ?.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          heraldFlip_renderViewFlipMiddleAudio();
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
  const limitedThemes = heraldFlip_audioTheme;
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

        const includeMp3 = game.settings.get("herald-flip", "audioIncludeMp3");
        if (includeMp3 == false && ext == "mp3") {
          return;
        }
        await heraldFlip_addAudiotoPages(name, "Audio", category, ext);

        await heraldFlip_audioSocket.executeAsGM("saveAudioToPlaylist", {
          name,
          filePath,
          category,
          userName,
        });

        dialog.close();
        setTimeout(heraldFlip_renderViewFlipMiddleAudio, 500);
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
