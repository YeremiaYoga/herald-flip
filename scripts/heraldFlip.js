import * as helper from "./helper.js";
import * as audio from "./audio.js";
import * as art from "./art.js";

let heraldFlip_folderName = `Herald's-Flip`;
let heraldFlip_typeSelected = "Token";
let heraldFlip_linkTokenStamp = "https://rolladvantage.com/tokenstamp/";

let heraldFlip_socket;
Hooks.once("socketlib.ready", () => {
  heraldFlip_socket = socketlib.registerModule("herald-flip");
  heraldFlip_socket.register("createFolderPlayer", async (user) => {
    helper.heraldFLip_createFolder(heraldFlip_folderName);
    await heraldFlip_createFolderPlayer(user);
    await helper.heraldFlip_createFolderJournal(user);
  });

  heraldFlip_socket.register("saveFileHeraldFlip", async (data) => {
    if (!game.user.isGM) return;

    const { userName, fileType, fileName, base64 } = data;

    try {
      const blob = await (await fetch(base64)).blob();

      const file = new File([blob], fileName, { type: blob.type });
      console.log(fileType);
      await heraldFlip_uploadFileDirectly(userName, fileType, file, fileName);
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
    title: "Herald Flip",
    content: dialogContent,
    buttons: {},
    default: "add",
  });

  dialog.render(true);
  Hooks.once("renderDialog", async (app) => {
    if (app instanceof Dialog && app.title === "Herald Flip") {
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
  } else if (heraldFlip_typeSelected == "Art") {
    await art.heraldFlip_renderViewFlipMiddleArt();
  } else {
    await heraldFlip_renderViewFlipMiddleToken();
    await heraldFlip_renderViewTokenFlipBottom();
  }
}

async function heraldFlip_renderViewFlipMiddleToken() {
  let flipMiddle = document.getElementById("heraldFlip-dialogFlipMiddle");
  const user = game.user;
  const folders = game.folders.filter((f) => f.type === "JournalEntry");
  const heraldFlipFolder = folders.find((f) => f.name === "Herald Flip");

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
    console.log(data);
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
        <button class="heraldFlip-flipTokenTransform">Transform</button>
        <button class="heraldFlip-flipTokenActorChange">Actor Change</button>
      </div>
      <div class="heraldFlip-flipDataRight">
        <div class="heraldFlip-flipTokenAddonButton">
          <i class="fa-solid fa-hurricane"></i>
        </div>
        <div class="heraldFlip-flipTokenEditButton">
          <i class="fa-solid fa-pen-to-square"></i>
        </div>
        <div class="heraldFlip-flipTokenDeleteButton" data-path="${data.imageUrl}">
          <i class="fa-solid fa-trash"></i>
        </div>
      </div>
    </div>
  `;
  }

  if (flipMiddle) {
    flipMiddle.innerHTML = arrToken;

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
            // ui.notifications.info(
            //   `Token profile "${pageToDelete.name}" has been deleted.`
            // );
            // await heraldFlip_renderViewFlipMiddleToken();
          }
        });
      });
  }
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
      return `<option value="${actor.id}" ${isSelected} style="">
              ${actor.name}
            </option>`;
    })
    .join("");
  if (flipBottom) {
    flipBottom.innerHTML = `
    <div id="heraldFlip-dialogFlipBottomTop" class="heraldFlip-dialogFlipBottomTop">
        <div style="width:100%;">
          <select id="heraldFlip-tokenChangeSelected" style="width:100%;background-color: #d6d2cd;" >
          ${playerCharacterOptions}
          </select>
        </div>
       <div id="heraldFlip-tokenStampLink" class="heraldFlip-tokenStampLink" style="cursor:pointer;">
         <img src="/modules/herald-flip/assets/images/tokenstamp_icon.png" alt="" class="" style="width:30px; border:none;" />
      </div>
    </div>
    <div id="heraldFlip-dialogFlipBottomBot" class="heraldFlip-dialogFlipBottomBot">
      <div class="heraldFlip-searchFlipTokenContainer">
          <input type="text" id="heraldFlip-searchFlipTokenInput" class="heraldFlip-searchFlipTokenInput" placeholder="Search..." />
      </div>
      <div id="heraldFlip-addAssetTokenFlip" class="heraldFlip-addAssetTokenFlip">
        <i class="fa-solid fa-plus"></i>
      </div>
    </div>
    `;

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
  new Dialog({
    title: "Upload Assets",
    content: `
            <form>
              <div class="form-group">
                <label for="profile-name">Profile Name:</label>
                <input type="text" id="profile-name" name="profileName" placeholder="Enter name"/>
              </div>
              <div class="form-group">
                <label for="profile-file">Upload File:</label>
                <input type="file" id="profile-file" name="profileFile"/>
              </div>
              <div>Select a Character:</div>
              <div class="form-group">
                <div class="heraldFlip-gridActorTokenFlip">
                  ${game.actors
                    .filter(
                      (actor) =>
                        actor.type === "character" &&
                        actor.ownership[game.user.id] >=
                          CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
                    )
                    .map(
                      (actor) => `
                        <div class="heraldFlip-selectActorTokenFlip" data-id="${actor.id}">
                          <div class="heraldFlip-imgActorTokenFlipWrapper">
                            <img src="${actor.img}" alt="${actor.name}" />
                            <div class="heraldFlip-labelActorTokenFlip">${actor.name}</div>
                          </div>
                        </div>
                      `
                    )
                    .join("")}
                </div>

              </div>
            </form>
          `,
    buttons: {
      save: {
        label: "Save",
        callback: async (html) => {
          const name = html.find('[name="profileName"]').val();
          const file = html.find('[name="profileFile"]')[0]?.files[0];
          const ext = file?.name?.split(".").pop().toLowerCase();
          const userName = game.user.name;
          const selected = document.querySelector(
            ".heraldFlip-selectActorTokenFlip.selected"
          );
          if (!selected) {
            ui.notifications.warn("Please select a character.");
            return;
          }
          const actorId = selected.dataset.id;

          if (game.user.isGM) {
            await heraldFlip_uploadFileDirectly(
              userName,
              heraldFlip_typeSelected,
              file,
              name
            );
            await heraldFlip_addTokentoPages(
              name,
              heraldFlip_typeSelected,
              actorId,
              ext
            );
          } else {
            await heraldFlip_sendFileToGM(
              userName,
              heraldFlip_typeSelected,
              file,
              name
            );
            await heraldFlip_addTokentoPages(
              name,
              heraldFlip_typeSelected,
              actorId,
              ext
            );
          }
        },
      },
      cancel: {
        label: "Cancel",
      },
    },
    default: "save",
  }).render(true);
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
}
async function heraldFlip_addTokentoPages(name, type, actorid, ext) {
  const user = game.user;
  const folders = game.folders.filter((f) => f.type === "JournalEntry");
  const heraldFlipFolder = folders.find((f) => f.name === "Herald Flip");

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

async function heraldFlip_uploadFileDirectly(
  userName,
  fileType,
  file,
  filename
) {
  console.log(file);
  if (!game.user.isGM) {
    ui.notifications.warn("Hanya GM yang dapat mengupload file.");
    return false;
  }
  const allowedExtensions = {
    Token: ["webp", "png", "jpg", "jpeg"],
    Art: ["webp", "png", "jpg", "jpeg"],
    Audio: ["ogg", "mp3"],
  };

  const originalExt = file.name.split(".").pop().toLowerCase();
  if (!allowedExtensions[fileType]) {
    ui.notifications.error(`Unknown fileType "${fileType}".`);
    return false;
  }
  if (!allowedExtensions[fileType].includes(originalExt)) {
    ui.notifications.error(
      `Unsupported file type for category "${fileType}". Allowed types: ${allowedExtensions[
        fileType
      ]
        .join(", ")
        .toUpperCase()}.`
    );
    return false;
  }
  const finalFilename = filename.endsWith(`.${originalExt}`)
    ? filename
    : `${filename}.${originalExt}`;
  const folderPath = `${heraldFlip_folderName}/${userName}/${fileType}`;
  try {
    const renamedFile = new File([file], finalFilename, { type: file.type });

    const result = await FilePicker.upload("data", folderPath, renamedFile);
    if (result.path) {
      ui.notifications.info(`Upload Success ${result.path}`);

      // if (fileType == "token") {
      //   await heraldFlip_renderViewFlipMiddleToken();
      // } else if (fileType == "art") {
      //   await heraldFlip_renderViewFlipMiddleArt();
      // } else {
      //   await heraldFlip_renderViewFlipMiddleAudio();
      // }
      return true;
    }
  } catch (err) {
    console.error("Upload gagal:", err);
    ui.notifications.error("Upload file gagal.");
  }

  return false;
}

async function heraldFlip_sendFileToGM(userName, fileType, file, name) {
  const base64File = await helper.heraldFlip_fileToBase64(file);
  const ext = file.name.split(".").pop();
  const finalName = name.endsWith(`.${ext}`) ? name : `${name}.${ext}`;
  await heraldFlip_socket.executeAsGM("saveFileHeraldFlip", {
    userName,
    fileType,
    fileName: finalName,
    base64: base64File,
  });
}

export { heraldFlip_renderAccessButton };
