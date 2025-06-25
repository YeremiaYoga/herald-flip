import * as helper from "./helper.js";
import * as flip from "./heraldFlip.js";

async function heraldFlip_renderViewFlipMiddleArt() {
  let flipMiddle = document.getElementById("heraldFlip-dialogFlipMiddle");
  const user = game.user;
  const folders = game.folders.filter((f) => f.type === "JournalEntry");
  const heraldFlipFolder = folders.find((f) => f.name === "Herald's Flip");

  const playerFolder = folders.find(
    (f) => f.name === user.name && f.folder?.id === heraldFlipFolder?.id
  );
  const flipJournal = game.journal.find(
    (j) => j.folder?.id === playerFolder?.id && j.name === "Art"
  );
  let pages = [];
  if (flipJournal) {
    pages = flipJournal.pages.contents;
  }

  let arrArt = "";
  let searchValue =
    document
      .getElementById("heraldFlip-searchFlipArtInput")
      ?.value?.toLowerCase() ?? "";

  for (const page of pages) {
    const data = await helper.heraldFlip_extractDataFromPage(page);

    if (!data.profileName.toLowerCase().includes(searchValue)) {
      continue;
    }
    arrArt += `
          <div class="heraldFlip-flipArtItem">
            <div class="heraldFlip-flipArtTop">
              <div class="heraldFlip-flipArtImageContainer">
                <img src="${data.imageUrl}" alt="" class="heraldFlip-flipArtImage"/>
              </div>
            </div>
            <div class="heraldFlip-flipAudioMiddle">
                 <div class="heraldFlip-artProfileName">${data.profileName}</div>
            </div>
            <div class="heraldFlip-flipAudioBottom">
             
            </div>
          </div>
        `;
  }
  if (flipMiddle) {
    flipMiddle.innerHTML = `
    <div class="heraldFlip-flipArtContainer">
      ${arrArt}
    </div>
       `;
  }
}

async function heraldFlip_renderViewArtFlipBottom() {
  let flipBottom = document.getElementById("heraldFlip-dialogFlipBottom");
  const user = game.user;

  if (flipBottom) {
    flipBottom.innerHTML = `
     <div id="heraldFlip-dialogFlipBottomTop" class="heraldFlip-dialogFlipBottomTop">
  
      </div>
  
      <div id="heraldFlip-dialogFlipBottomBot" class="heraldFlip-dialogFlipBottomBot">
        <div class="heraldFlip-searchFlipArtContainer">
            <input type="text" id="heraldFlip-searchFlipArtInput" class="heraldFlip-searchFlipArtInput" placeholder="Search..." />
        </div>
        <div class="heraldFlip-addAssetFlipWrapper">
          <div id="heraldFlip-addAssetArtFlip" class="heraldFlip-addAssetFlip">
            <i class="fa-solid fa-plus"></i>
          </div>
          <span class="heraldFlip-addAseetFlipTooltip">Add Art</span>
        </div>
       
      </div>
      `;

    let searchTimeout;
    document
      .getElementById("heraldFlip-searchFlipArtInput")
      ?.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          heraldFlip_renderViewFlipMiddleArt();
        }, 500);
      });
    document
      .getElementById("heraldFlip-addAssetArtFlip")
      ?.addEventListener("click", async () => {
        await heraldFlip_addAssetArtFlip();
      });
  }
}

async function heraldFlip_addAssetArtFlip() {
  let dialog = new Dialog({
    title: "Upload Art Asset",
    content: `
      <form>
        <div class="form-group">
          <label for="heraldFlip-artNameInput">Art Name:</label>
          <input type="text" id="heraldFlip-artNameInput" class="heraldFlip-artNameInput" name="profileName" placeholder="Enter name" style="color:white !important;"/>
        </div>
        <div class="form-group">
          <label for="heraldFlip-artFileInput">Upload File:</label>
          <input type="file" id="heraldFlip-artFileInput" name="profileFile"/>
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
        const ext = file?.name?.split(".").pop().toLowerCase();
        const userName = game.user.name;

        let missingFields = [];
        if (!name) missingFields.push("Art Name");
        if (!file) missingFields.push("File");

        if (missingFields.length > 0) {
          ui.notifications.warn("Please fill: " + missingFields.join(", "));
          return;
        }

        let folderPath = `Herald's-Flip/${userName}/Art`;

        if (game.user.isGM) {
          await helper.heraldFlip_uploadFileDirectly(
            userName,
            "Art",
            file,
            name,
            folderPath
          );
        } else {
          await flip.heraldFlip_sendFileToGM(
            userName,
            "Art",
            file,
            name,
            folderPath
          );
        }

        await heraldFlip_addArttoPages(name, "Art", ext);

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

async function heraldFlip_addArttoPages(name, type, ext) {
  const user = game.user;
  const folders = game.folders.filter((f) => f.type === "JournalEntry");
  const heraldFlipFolder = folders.find((f) => f.name === "Herald's Flip");

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
        <img src="Herald%27s-Flip/${user.name}/Art/${name}.${ext}" alt="" width="100" height="100" />
        <p><strong>Profile Name :</strong> ${name}</p>
        <p><strong>Type :</strong> ${type}</p>
        <p><strong>Image Name :</strong> ${name}</p>
        <p><strong>Image Ext :</strong> ${ext}</p>
        <p><strong>Size :</strong> 1</p>
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
  heraldFlip_renderViewFlipMiddleArt,
  heraldFlip_renderViewArtFlipBottom,
};
