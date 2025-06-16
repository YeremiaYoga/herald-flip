import * as helper from "./helper.js";

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

async function heraldFlip_createAllThemeAudioFolder(folderName, user) {
  for (let theme of heraldFlip_audioTheme) {
    helper.heraldFLip_createFolder(
      `${folderName}/${user.name}/Audio/${theme}`
    );
  }
}

async function heraldFlip_renderViewFlipMiddleAudio() {
  let flipMiddle = document.getElementById("heraldFlip-dialogFlipMiddle");
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
      <div class="heraldFlip-searchFlipTokenContainer">
          <input type="text" id="heraldFlip-searchFlipTokenInput" class="heraldFlip-searchFlipTokenInput" placeholder="Search..." />
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
      .getElementById("heraldFlip-searchFlipTokenInput")
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
  const categoryOptions = heraldFlip_audioTheme
    .map((cat, i) => {
      const checked = i === 0 ? "checked" : "";
      return `
        <label style="margin-right: 10px;">
          <input type="radio" name="audioCategory" value="${cat}" ${checked}/> ${cat}
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
                <input type="text" id="heraldFlip-audioNameInput" class="heraldFlip-audioNameInput" name="profileName" placeholder="Enter name" style=""/>
              </div>
              <div class="form-group">
                <label for="heraldFlip-audioFileInput">Upload File:</label>
                <input type="file" id="heraldFlip-audioFileInput" name="profileFile"/>
              </div>
              <div>Theme:</div>
              <div class="form-group">
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
        if (game.user.isGM) {
          await helper.heraldFlip_uploadFileDirectly(
            userName,
            "Audio",
            file,
            name,
            folderPath
          );
        } else {
          await helper.heraldFlip_sendFileToGM(
            userName,
            "Audio",
            file,
            name,
            folderPath
          );
        }

        // await heraldFlip_addTokentoPages(
        //   name,
        //   heraldFlip_typeSelected,
        //   actorId,
        //   ext
        // );
        dialog.close();
        // setTimeout(heraldFlip_renderViewFlipMiddleToken, 500);
      });
    },
  });

  dialog.render(true);
  Hooks.once("renderDialog", async (app) => {
    // const dialogElement = app.element[0];
    // const contentElement = dialogElement.querySelector(".window-content");
    // if (contentElement) {
    //   contentElement.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
    //   contentElement.style.color = "white";
    //   contentElement.style.backgroundImage = "none";
    //   contentElement.style.backgroundSize = "cover";
    //   contentElement.style.backgroundRepeat = "no-repeat";
    //   contentElement.style.backgroundPosition = "center";
    // }
    // const buttons = dialogElement.querySelectorAll(
    //   ".dialog-buttons .dialog-button"
    // );
    // buttons.forEach((button) => {
    //   button.style.color = "white";
    //   button.style.border = "1px solid white";
    // });
  });
}

export {
  heraldFlip_createAllThemeAudioFolder,
  heraldFlip_renderViewFlipMiddleAudio,
  heraldFlip_renderViewAudioFlipBottom,
};
