import * as helper from "./helper.js";
import * as audio from "./audio.js";
import * as art from "./art.js";

let heraldFlip_folderName = `Herald's-Flip`;
let heraldFlip_typeSelected = "Token";
let heraldFlip_linkTokenStamp = "https://rolladvantage.com/tokenstamp/";
let heraldFlip_filterToken = [];

let heraldFlip_socket;
Hooks.once("socketlib.ready", () => {
  heraldFlip_socket = socketlib.registerModule("herald-flip");
  heraldFlip_socket.register("createFolderPlayer", async (user) => {
    helper.heraldFLip_createFolder(heraldFlip_folderName);
    await heraldFlip_createFolderPlayer(user);
    await helper.heraldFlip_createFolderJournal(user);
    await helper.heraldFlip_createFolderPlaylist(user);
  });

  heraldFlip_socket.register("saveFileHeraldFlip", async (data) => {
    if (!game.user.isGM) return;

    const { userName, fileType, fileName, base64, folderPath } = data;

    try {
      const blob = await (await fetch(base64)).blob();

      const file = new File([blob], fileName, { type: blob.type });
      await helper.heraldFlip_uploadFileDirectly(
        userName,
        fileType,
        file,
        fileName,
        folderPath
      );
    } catch (err) {
      console.error("Error saving file:", err);
      ui.notifications.error("Error saving file:");
    }
  });
});

async function heraldFlip_renderAccessButton() {
  const user = game.user;
  const existingBar = document.getElementById(
    "heraldFLip-accessButtonContainer"
  );
  if (existingBar) {
    existingBar.remove();
  }

  fetch("/modules/herald-flip/templates/heraldFLip-accessButton.html")
    .then((response) => response.text())
    .then((html) => {
      const div = document.createElement("div");
      div.innerHTML = html;
      const flip = div.firstChild;
      flip.id = "heraldFLip-accessButtonContainer";

      const accessButton = document.createElement("button");
      accessButton.id = "heraldFLip-accessButton";
      accessButton.classList.add("heraldFLip-accessButton");
      accessButton.innerHTML =
        '<i class="fa-solid fa-id-badge" style="margin-left:2px;"></i>';
      accessButton.addEventListener("click", async function () {
        heraldFlip_socket.executeAsGM("createFolderPlayer", user);
        await heraldFlip_showDialogFlip();
      });

      flip.appendChild(accessButton);
      document.body.appendChild(flip);
    })
    .catch((err) => {
      console.error("fail to render: ", err);
    });
}

async function heraldFlip_createFolderPlayer(user) {
  helper.heraldFLip_createFolder(`${heraldFlip_folderName}/${user.name}`);
  helper.heraldFLip_createFolder(`${heraldFlip_folderName}/${user.name}/Token`);
  helper.heraldFLip_createFolder(`${heraldFlip_folderName}/${user.name}/Art`);
  helper.heraldFLip_createFolder(`${heraldFlip_folderName}/${user.name}/Audio`);
  audio.heraldFlip_createAllThemeAudioFolder(heraldFlip_folderName, user);
}

async function heraldFlip_showDialogFlip() {
  const user = game.user;
  let dialogContent = `
    <div id="heraldFlip-dialogFlipContainer" class="heraldFlip-dialogFlipContainer" style="padding:10px;">
      <div id="heraldFlip-dialogFLipTop" class="heraldFlip-dialogFLipTop">
        <div id="heraldFlip-typeContainer" class="heraldFlip-typeContainer">
          <button id="heraldFlip-typeSelectButton" class="heraldFlip-typeSelectButton" data-name="Token">Token</button>
        </div>
        <div id="heraldFlip-typeContainer" class="heraldFlip-typeContainer">
          <button id="heraldFlip-typeSelectButton" class="heraldFlip-typeSelectButton" data-name="Audio">Audio/Music</button>
        </div>
        <div id="heraldFlip-typeContainer" class="heraldFlip-typeContainer">
          <button id="heraldFlip-typeSelectButton" class="heraldFlip-typeSelectButton" data-name="Art">Art</button>
        </div>
      </div>
      <div id="heraldFlip-dialogFlipMiddle" class="heraldFlip-dialogFlipMiddle">
      </div>
      <div id="heraldFlip-dialogFlipBottom" class="heraldFLip-dialogFlipBottom">
      </div>
    </div>`;

  const dialog = new Dialog({
    title: "Herald's Flip",
    content: dialogContent,
    buttons: {},
    default: "add",
  });

  dialog.render(true);
  Hooks.once("renderDialog", async (app) => {
    if (app instanceof Dialog && app.title === "Herald's Flip") {
      const width = 500;
      const height = 500;

      app.setPosition({
        left: (window.innerWidth - width) / 2,
        top: (window.innerHeight - height) / 2,
        width: width,
        height: height,
        scale: 1.0,
      });
    }

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

    const typeButton = document.querySelectorAll(
      ".heraldFlip-typeSelectButton"
    );
    typeButton.forEach((button) => {
      if (button.dataset.name === heraldFlip_typeSelected) {
        button.classList.add("active");
      }

      button.addEventListener("click", async () => {
        heraldFlip_typeSelected = button.getAttribute("data-name");

        typeButton.forEach((b) => b.classList.remove("active"));

        button.classList.add("active");
        await heraldFlip_renderFlipMiddle();
      });
    });
    await heraldFlip_renderFlipMiddle();
  });
}

async function heraldFlip_renderFlipMiddle() {
  if (heraldFlip_typeSelected == "Audio") {
    await audio.heraldFlip_renderViewFlipMiddleAudio();
    await audio.heraldFlip_renderViewAudioFlipBottom();
  } else if (heraldFlip_typeSelected == "Art") {
    await art.heraldFlip_renderViewFlipMiddleArt();
    await art.heraldFlip_renderViewArtFlipBottom();
  } else {
    await heraldFlip_renderViewFlipMiddleToken();
    await heraldFlip_renderViewTokenFlipBottom();
  }
}

async function heraldFlip_renderViewFlipMiddleToken() {
  let flipMiddle = document.getElementById("heraldFlip-dialogFlipMiddle");
  const user = game.user;
  const folders = game.folders.filter((f) => f.type === "JournalEntry");
  const heraldFlipFolder = folders.find((f) => f.name === "Herald's Flip");

  const playerFolder = folders.find(
    (f) => f.name === user.name && f.folder?.id === heraldFlipFolder?.id
  );
  const flipJournal = game.journal.find(
    (j) => j.folder?.id === playerFolder?.id && j.name === "Token"
  );
  let pages = [];
  if (flipJournal) {
    pages = flipJournal.pages.contents;
  }
  let arrToken = "";

  let searchValue =
    document
      .getElementById("heraldFlip-searchFlipTokenInput")
      ?.value?.toLowerCase() ?? "";

  for (const page of pages) {
    const data = await helper.heraldFlip_extractDataFromPage(page);

    if (!data.profileName.toLowerCase().includes(searchValue)) {
      continue;
    }
    if (
      heraldFlip_filterToken.length > 0 &&
      !heraldFlip_filterToken.includes(data.actorId)
    )
      continue;
    arrToken += `
    <div class="heraldFlip-flipTokenContainer">
      <div class="heraldFlip-flipTokenLeft">
        <div class="heraldFlip-flipTokenImageContainer">
          <img src="${data.imageUrl}" alt="" class="heraldFlip-flipTokenImage" />
        </div>
      </div>
      <div class="heraldFlip-flipDataMiddle">
        <div class="heraldFlip-flipTokenName">${data.profileName}</div>
        <div class="heraldFlip-flipTokenActorName">${data.actorName} / ${data.actorId}</div>
        <div class="heraldFlip-buttonWithTooltip" data-page-id="${page.id}">
          <div class="heraldFlip-flipTokenTransform">Transform</div>
          <span class="heraldFlip-transformHelpIcon">?</span>
          <div class="heraldFlip-transformTooltip">
            Transform your character token to the image profile that is set. <br/>
            Future tokens and character sheet will not change.
          </div>
        </div>

        <div class="heraldFlip-buttonWithTooltip" data-page-id="${page.id}">
          <div class="heraldFlip-flipTokenActorChange" data-page-id="${page.id}">Actor Change</div>
          <span class="heraldFlip-actorChangeHelpIcon heraldFlip-helpIcon">?</span>
          <div class="heraldFlip-actorChangeTooltip heraldFlip-tooltip">
            Change your character art fully to the image profile. <br/>
            Any future tokens place alongside character sheet will be change
          </div>
        </div>
      </div>
     <div class="heraldFlip-flipDataRight">
        <div class="heraldFlip-flipTokenAddonButton heraldFlip-flipTokenOpsiContainer">
          <i class="fa-solid fa-hurricane"></i>
          <span class="heraldFlip-flipTokenOpsiTooltip">Addon</span>
        </div>
        <div class="heraldFlip-flipTokenEditButton heraldFlip-flipTokenOpsiContainer">
          <i class="fa-solid fa-pen-to-square"></i>
          <span class="heraldFlip-flipTokenOpsiTooltip">Edit</span>
        </div>
        <div class="heraldFlip-flipTokenDeleteButton heraldFlip-flipTokenOpsiContainer">
          <i class="fa-solid fa-trash"></i>
          <span class="heraldFlip-flipTokenOpsiTooltip">Delete</span>
        </div>
      </div>

    </div>
  `;
  }

  if (flipMiddle) {
    flipMiddle.innerHTML = arrToken;
    flipMiddle
      .querySelectorAll(".heraldFlip-flipTokenTransform")
      .forEach((btn, index) => {
        btn.addEventListener("click", async () => {
          const data = await helper.heraldFlip_extractDataFromPage(
            pages[index]
          );

          const useCurrent = await new Promise((resolve) => {
            const dialog = new Dialog({
              title: "Choose Target",
              content: `
              <p>Which actor should receive the update?</p>
              <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
                <button type="button" class="dialog-choice" data-choice="current">
                  Current Player Character
                  <i class="fa-solid fa-circle-question" title="Change the character that you're currently 'main-img' as. Which is currently ${user.character?.name}" style="margin-left: 5px;"></i>
                </button>
                <button type="button" class="dialog-choice" data-choice="byId">
                  By Selected Actor ID
                  <i class="fa-solid fa-circle-question" title="Change the character that have choosen when you created/edit this profile. Which is currently ${data.actorName}" style="margin-left: 5px;"></i>
                </button>
              </div>
            `,
              buttons: {}, // Empty buttons, handled manually
              render: (html) => {
                html.find(".dialog-choice").on("click", function () {
                  const choice = this.dataset.choice;
                  resolve(choice === "current");
                  dialog.close();
                });
              },
              close: () => {},
            });

            dialog.render(true);

            Hooks.once("renderDialog", (app) => {
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

              const buttons = dialogElement.querySelectorAll(".dialog-choice");
              buttons.forEach((button) => {
                button.style.color = "white";
                button.style.fontSize = "12px";
                button.style.border = "1px solid white";
                button.style.background = "transparent";
                button.style.padding = "3px 6px";
                button.style.borderRadius = "4px";
                button.style.cursor = "pointer";
              });
            });
          });

          let actor;
          if (useCurrent) {
            actor = game.user.character;
          } else {
            actor = game.actors.get(data.actorId);
          }

          if (!actor) return ui.notifications.warn("Actor not found.");

          const scene = game.scenes.active;
          const tokenDoc = scene.tokens.find((t) => t.actorId === actor.id);
          if (!tokenDoc)
            return ui.notifications.warn("Actor is not in the current scene.");

          await tokenDoc.update({ "texture.src": data.imageUrl });
          ui.notifications.info("Token appearance updated.");
        });
      });

    flipMiddle
      .querySelectorAll(".heraldFlip-flipTokenActorChange")
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const pageId = btn.getAttribute("data-page-id");
          const page = game.journal.reduce(
            (acc, j) => acc || j.pages.get(pageId),
            null
          );
          if (!page) return;

          const data = await helper.heraldFlip_extractDataFromPage(page);
          const newImageUrl = data.imageUrl;

          const useCurrent = await new Promise((resolve) => {
            const dialog = new Dialog({
              title: "Choose Target",
              content: `
      <p>Which actor should receive the update?</p>
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
        <button type="button" class="heraldFlip-dialogChoice" data-choice="current">
          Current Player Character
          <i class="fa-solid fa-circle-question" title="Change the character that you're currently 'main-img' as. Which is currently ${data.actorName}" style="margin-left: 5px;"></i>
        </button>
        <button type="button" class="heraldFlip-dialogChoice" data-choice="byId">
          By Selected Actor ID
          <i class="fa-solid fa-circle-question" title="Change the character that was selected when creating or editing this profile." style="margin-left: 5px;"></i>
        </button>
      </div>
    `,
              buttons: {},
              render: (html) => {
                html.find(".heraldFlip-dialogChoice").on("click", function () {
                  const choice = this.dataset.choice;
                  resolve(choice === "current");
                  dialog.close();
                });
              },
              close: () => {},
            });

            dialog.render(true);

            Hooks.once("renderDialog", (app) => {
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
                ".heraldFlip-dialogChoice"
              );
              buttons.forEach((button) => {
                button.style.color = "white";
                button.style.fontSize = "12px";
                button.style.border = "1px solid white";
                button.style.background = "transparent";
                button.style.padding = "3px 6px";
                button.style.borderRadius = "4px";
                button.style.cursor = "pointer";
              });
            });
          });

          let actor;
          if (useCurrent) {
            actor = game.user.character;
          } else {
            actor = game.actors.get(data.actorId);
          }

          if (!actor) return ui.notifications.warn("Actor not found.");

          await actor.update({
            img: newImageUrl,
            prototypeToken: {
              texture: { src: newImageUrl },
            },
          });

          for (const token of actor.getActiveTokens()) {
            await token.document.update({
              texture: { src: newImageUrl },
            });
          }

          ui.notifications.info(`Actor image updated to ${data.imageName}`);
        });
      });

    flipMiddle
      .querySelectorAll(".heraldFlip-flipTokenEditButton")
      .forEach((btn, index) => {
        btn.addEventListener("click", async () => {
          const pageToEdit = pages[index];
          await heraldFlip_editTokenFlip(pageToEdit);
        });
      });

    flipMiddle
      .querySelectorAll(".heraldFlip-flipTokenDeleteButton")
      .forEach((btn, index) => {
        btn.addEventListener("click", async () => {
          const confirm = await Dialog.confirm({
            title: "Confirm Deletion",
            content: `<p>Are you sure you want to delete this token Profile?</p>`,
            yes: () => true,
            no: () => false,
            defaultYes: false,
          });

          if (confirm) {
            const pageToDelete = pages[index];
            await pageToDelete.delete();

            await heraldFlip_renderViewFlipMiddleToken();
          }
        });
      });
  }
}

async function heraldFlip_editTokenFlip(page) {
  const content = page.text.content;

  const extractValue = (label) => {
    const regex = new RegExp(`<strong>${label} :<\\/strong>\\s*(.*?)<\\/p>`);
    const match = content.match(regex);
    return match ? match[1] : "";
  };

  const currentName = extractValue("Profile Name");
  const currentActorId = extractValue("ActorId");
  const currentActorName = extractValue("Actor Name");

  const dialog = new Dialog({
    title: "Edit Token Profile",
    content: `
      <form>
        <div class="form-group">
          <label for="heraldFlip-editProfileNameInput">Profile Name:</label>
          <input type="text" id="heraldFlip-editProfileNameInput" class="heraldFlip-editProfileNameInput" name="profileName" value="${currentName}" style="color:white !important" />
        </div>
        <div>Select a Character:</div>
          <input type="text" id="heraldFlip-actorSearchInput" placeholder="Search character..." style="width: 100%; margin-bottom: 8px; padding: 4px; color: white; border: 1px solid #555;" />
        <div class="form-group">
          <div class="heraldFlip-gridActorTokenFlip">
            ${game.actors
              .filter(
                (actor) =>
                  actor.ownership[game.user.id] >=
                  CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
              )
              .map(
                (actor) => `
                <div class="heraldFlip-selectActorTokenFlip ${
                  actor.id === currentActorId ? "selected" : ""
                }" data-id="${
                  actor.id
                }" data-name="${actor.name.toLowerCase()}">
                  <div class="heraldFlip-imgActorTokenFlipWrapper">
                    <img src="${actor.img}" alt="${actor.name}" />
                    <div class="heraldFlip-labelActorTokenFlip">${
                      actor.name
                    }</div>
                  </div>
                </div>
              `
              )
              .join("")}
          </div>
        </div>
      </form>
    `,
    buttons: {},
    render: (html) => {
      const confirmButton = $(
        `<button type="button" class="dialog-button">Save</button>`
      );
      const cancelButton = $(
        `<button type="button" class="dialog-button">Cancel</button>`
      );
      html
        .closest(".app")
        .find(".dialog-buttons")
        .append(confirmButton, cancelButton);

      html.find(".heraldFlip-selectActorTokenFlip").on("click", function () {
        html.find(".heraldFlip-selectActorTokenFlip").removeClass("selected");
        this.classList.add("selected");
      });

      html.find("#heraldFlip-actorSearchInput").on("input", function () {
        const search = this.value.trim().toLowerCase();
        html.find(".heraldFlip-selectActorTokenFlip").each(function () {
          const name = this.dataset.name;
          this.style.display = name.includes(search) ? "block" : "none";
        });
      });

      cancelButton.on("click", () => dialog.close());

      confirmButton.on("click", async () => {
        const name = html.find('[name="profileName"]').val()?.trim();
        const selected = html.find(
          ".heraldFlip-selectActorTokenFlip.selected"
        )[0];
        const actorId = selected?.dataset?.id;

        if (!name || !actorId) {
          ui.notifications.warn(
            "Please fill in both Profile Name and Character."
          );
          return;
        }

        const actor = game.actors.get(actorId);
        if (!actor) {
          ui.notifications.error("Selected actor not found.");
          return;
        }

        let newContent = content
          .replace(
            /(<strong>Profile Name :<\/strong>\s*)(.*?)<\/p>/,
            `$1${name}</p>`
          )
          .replace(
            /(<strong>ActorId :<\/strong>\s*)(.*?)<\/p>/,
            `$1${actor.id}</p>`
          )
          .replace(
            /(<strong>Actor Name :<\/strong>\s*)(.*?)<\/p>/,
            `$1${actor.name}</p>`
          );

        await page.update({
          name: name,
          "text.content": newContent,
        });

        dialog.close();
        await heraldFlip_renderViewFlipMiddleToken();
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

async function heraldFlip_renderViewTokenFlipBottom() {
  let flipBottom = document.getElementById("heraldFlip-dialogFlipBottom");
  const user = game.user;
  let selectedActor = user.character;
  const playerCharacters = game.actors.filter(
    (actor) =>
      actor.hasPlayerOwner && actor.isOwner && actor.type === "character"
  );
  let playerCharacterOptions = playerCharacters
    .map((actor) => {
      const isSelected = selectedActor?.id === actor.id ? "selected" : "";
      return `<option value="${actor.id}" ${isSelected} style="background-color: #121212; color: white;">
              ${actor.name}
            </option>`;
    })
    .join("");

  const folders = game.folders.filter((f) => f.type === "JournalEntry");
  const heraldFlipFolder = folders.find((f) => f.name === "Herald's Flip");

  const playerFolder = folders.find(
    (f) => f.name === user.name && f.folder?.id === heraldFlipFolder?.id
  );
  const flipJournal = game.journal.find(
    (j) => j.folder?.id === playerFolder?.id && j.name === "Token"
  );
  let pages = [];
  if (flipJournal) {
    pages = flipJournal.pages.contents;
  }
  let listFilter = "";

  const uniqueActorMap = new Map();

  for (const page of pages) {
    const data = await helper.heraldFlip_extractDataFromPage(page);
    const actor = game.actors.get(data.actorId);
    if (actor && !uniqueActorMap.has(data.actorId)) {
      uniqueActorMap.set(data.actorId, { page, data, actor });
    }
  }

  listFilter = [...uniqueActorMap.values()]
    .map(({ page, data, actor }) => {
      return `
    <label class="heraldFlip-filterTokenProfile" title="${data.actorName}" style="display: flex; align-items: center; cursor: pointer; margin: 0 10px;">
     <input 
        type="checkbox" 
        class="heraldFlip-tokenFilterCheckbox" 
        value="${page.id}" 
        data-actor-id="${actor.id}"
        style="margin-bottom: 5px;" 
        />
      <img 
        src="${actor.img}" 
        alt="${data.actorName}" 
        style="width: 25px; height: 25px; border-radius: 50%; border: 1px solid white; margin-bottom: 5px;"
      />
    </label>
  `;
    })
    .join("");

  if (flipBottom) {
    flipBottom.innerHTML = `
    <div id="heraldFlip-dialogFlipBottomTop" class="heraldFlip-dialogFlipBottomTop">
      <div style="display: flex;align-items: center;  justify-content: space-between; width: 100%; background-color:#121212;">
        <select id="heraldFlip-tokenChangeSelected" style="flex: 1;color: white !important;" >
        ${playerCharacterOptions}
        </select>
      </div>
      <div id="heraldFlip-tokenStampLink" class="heraldFlip-tokenStampLink " style="cursor:pointer;">
        <img src="/modules/herald-flip/assets/images/tokenstamp_icon.png" alt="" style="width:30px; border:none;" />
        <span class="heraldFlip-tokenStampTooltip">Token Stamp</span>
      </div>
    </div>
    <div id="heraldFlip-dialogFlipBottomBot" class="heraldFlip-dialogFlipBottomBot">
      <div class="heraldFlip-searchFlipTokenContainer">
          <input type="text" id="heraldFlip-searchFlipTokenInput" class="heraldFlip-searchFlipTokenInput" placeholder="Search..." />
      </div>
      <div class="heraldFlip-filterTokenFlipWrapper">
        <div id="heraldFlip-filterTokenFlip" class="heraldFlip-filterTokenFlip">
          <i class="fa-solid fa-filter"></i>
        </div>
      </div>
      <div class="heraldFlip-addAssetFlipWrapper">
        <div id="heraldFlip-addAssetTokenFlip" class="heraldFlip-addAssetFlip">
          <i class="fa-solid fa-plus"></i>
        </div>
        <span class="heraldFlip-addAseetFlipTooltip">Add Profile</span>
      </div>
     <div id="heraldFlip-filterTokenFlipContainer" class="heraldFlip-filterTokenFlipContainer" style="display:none;">
        <input type="text" id="heraldFlip-filterTokenSearchInput" placeholder="Search filter..." style="width: 100%; padding: 4px; margin-bottom: 5px; background-color: #121212; color: white; border: 1px solid #888;" />
        <div class="heraldFlip-filterTokenFlipMenu">
          ${listFilter}
        </div>
      </div>
    </div>
    `;

    document
      .getElementById("heraldFlip-filterTokenSearchInput")
      ?.addEventListener("input", (event) => {
        const query = event.target.value.toLowerCase();
        const filterItems = document.querySelectorAll(
          ".heraldFlip-filterTokenProfile"
        );

        filterItems.forEach((item) => {
          const title = item.getAttribute("title")?.toLowerCase() || "";
          item.style.display = title.includes(query) ? "flex" : "none";
        });
      });

    document
      .querySelectorAll(".heraldFlip-tokenFilterCheckbox")
      .forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
          const checked = [
            ...document.querySelectorAll(
              ".heraldFlip-tokenFilterCheckbox:checked"
            ),
          ];
          heraldFlip_filterToken = checked.map((cb) => cb.dataset.actorId);

          heraldFlip_renderViewFlipMiddleToken();
        });
      });

    document
      .getElementById("heraldFlip-filterTokenFlip")
      ?.addEventListener("click", () => {
        const filterMenu = document.getElementById(
          "heraldFlip-filterTokenFlipContainer"
        );
        if (filterMenu) {
          filterMenu.style.display =
            filterMenu.style.display === "none" || !filterMenu.style.display
              ? "block"
              : "none";
        }
      });

    document
      .getElementById("heraldFlip-tokenChangeSelected")
      ?.addEventListener("change", async (event) => {
        const selectedId = event.target.value;
        const actor = game.actors.get(selectedId);
        if (!actor) return;

        await game.user.update({ character: selectedId });
      });

    document
      .getElementById("heraldFlip-tokenStampLink")
      ?.addEventListener("click", () => {
        window.open(heraldFlip_linkTokenStamp, "_blank");
      });

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
      .getElementById("heraldFlip-addAssetTokenFlip")
      ?.addEventListener("click", async () => {
        await heraldFlip_addAssetTokenFlip();
      });
  }
}

async function heraldFlip_addAssetTokenFlip() {
  let dialog = new Dialog({
    title: "Upload Assets",
    content: `
            <form>
              <div class="form-group">
                <label for="heraldFlip-profileNameInput">Profile Name:</label>
                <input type="text" id="heraldFlip-profileNameInput" class="heraldFlip-profileNameInput" name="profileName" placeholder="Enter name" style="color:white !important;"/>
              </div>
              <div class="form-group">
                <label for="heraldFlip-profileFileInput">Upload File:</label>
                <input type="file" id="heraldFlip-profileFileInput" name="profileFile"/>
              </div>
              <div>Select a Character:</div>
                <input type="text" id="heraldFlip-actorSearchInput" placeholder="Search character..." style="width: 100%; margin-bottom: 8px; padding: 4px; color: white; border: 1px solid #555;" />
                <div class="form-group">
                
                  <div class="heraldFlip-gridActorTokenFlip">
                    ${game.actors
                      .filter(
                        (actor) =>
                          actor.ownership[game.user.id] >=
                          CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
                      )
                      .map(
                        (actor) => `
                          <div class="heraldFlip-selectActorTokenFlip" data-id="${
                            actor.id
                          }" data-name="${actor.name.toLowerCase()}">
                            <div class="heraldFlip-imgActorTokenFlipWrapper">
                              <img src="${actor.img}" alt="${actor.name}" />
                              <div class="heraldFlip-labelActorTokenFlip">${
                                actor.name
                              }</div>
                            </div>
                          </div>
                        `
                      )
                      .join("")}
                  </div>
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

      html.find(".heraldFlip-selectActorTokenFlip").on("click", function () {
        html.find(".heraldFlip-selectActorTokenFlip").removeClass("selected");
        this.classList.add("selected");
      });

      html.find("#heraldFlip-actorSearchInput").on("input", function () {
        const search = this.value.trim().toLowerCase();
        html.find(".heraldFlip-selectActorTokenFlip").each(function () {
          const name = this.dataset.name;
          this.style.display = name.includes(search) ? "block" : "none";
        });
      });
      cancelButton.on("click", () => dialog.close());
      confirmButton.on("click", async () => {
        const name = html.find('[name="profileName"]').val();
        const file = html.find('[name="profileFile"]')[0]?.files[0];
        const selected = html.find(
          ".heraldFlip-selectActorTokenFlip.selected"
        )[0];
        const actorId = selected?.dataset?.id;
        const ext = file?.name?.split(".").pop().toLowerCase();
        const userName = game.user.name;

        let missingFields = [];
        if (!name) missingFields.push("Profile Name");
        if (!file) missingFields.push("File");
        if (!selected) missingFields.push("Character");

        if (missingFields.length > 0) {
          ui.notifications.warn("Please fill: " + missingFields.join(", "));
          return;
        }
        let folderPath = `Herald's-Flip/${userName}/Token`;
        if (game.user.isGM) {
          await helper.heraldFlip_uploadFileDirectly(
            userName,
            heraldFlip_typeSelected,
            file,
            name,
            folderPath
          );
        } else {
          await heraldFlip_sendFileToGM(
            userName,
            heraldFlip_typeSelected,
            file,
            name,
            folderPath
          );
        }

        await heraldFlip_addTokentoPages(
          name,
          heraldFlip_typeSelected,
          actorId,
          ext
        );
        dialog.close();
        setTimeout(heraldFlip_renderViewFlipMiddleToken, 500);
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

    setTimeout(() => {
      document
        .querySelectorAll(".heraldFlip-selectActorTokenFlip")
        .forEach((box) => {
          box.addEventListener("click", () => {
            document
              .querySelectorAll(".heraldFlip-selectActorTokenFlip")
              .forEach((b) => b.classList.remove("selected"));
            box.classList.add("selected");
          });
        });
    }, 100);
  });
}
async function heraldFlip_addTokentoPages(name, type, actorid, ext) {
  const user = game.user;
  const folders = game.folders.filter((f) => f.type === "JournalEntry");
  const heraldFlipFolder = folders.find((f) => f.name === "Herald's Flip");

  const playerFolder = folders.find(
    (f) => f.name === user.name && f.folder?.id === heraldFlipFolder?.id
  );
  const flipJournal = game.journal.find(
    (j) => j.folder?.id === playerFolder?.id && j.name === type
  );

  const actor = game.actors.get(actorid);
  const actorName = actor?.name || "Unknown";
  const pageData = {
    name: name,
    type: "text",
    text: {
      content: `
        <img src="Herald%27s-Flip/${user.name}/Token/${name}.${ext}" alt="" width="100" height="100" />
        <p><strong>Profile Name :</strong> ${name}</p>
        <p><strong>Type :</strong> ${type}</p>
        <p><strong>ActorId :</strong> ${actorid}</p>
        <p><strong>Actor Name :</strong> ${actorName}</p>
        <p><strong>Image Name :</strong> ${name}</p>
        <p><strong>Image Ext :</strong> ${ext}</p>
        <p><strong>Size :</strong> 1</p>
        <p><strong>Effect :</strong> </p>
        <p><strong>Items :</strong> </p>
        <p><strong>Message :</strong> </p>
      `,
      format: 1,
    },
  };

  if (flipJournal) {
    await flipJournal.createEmbeddedDocuments("JournalEntryPage", [pageData]);
  }
}

async function heraldFlip_sendFileToGM(
  userName,
  fileType,
  file,
  name,
  folderPath
) {
  const base64File = await helper.heraldFlip_fileToBase64(file);
  const ext = file.name.split(".").pop();
  const finalName = name.endsWith(`.${ext}`) ? name : `${name}.${ext}`;
  await heraldFlip_socket.executeAsGM("saveFileHeraldFlip", {
    userName,
    fileType,
    fileName: finalName,
    base64: base64File,
    folderPath,
  });
}

export { heraldFlip_renderAccessButton, heraldFlip_sendFileToGM };
