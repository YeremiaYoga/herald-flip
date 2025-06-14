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
        <button id="heraldFlip-flipTokenTransform" class="heraldFlip-flipTokenTransform" data-page-id="${page.id}">Transform</button>
        <button id="heraldFlip-flipTokenActorChange" class="heraldFlip-flipTokenActorChange" data-page-id="${page.id}">Actor Change</button>
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
            new Dialog({
              title: "Choose Target",
              content: `<p>Which actor should receive the update?</p>`,
              buttons: {
                current: {
                  label: "By Current Actor",
                  callback: () => resolve(true),
                },
                byId: {
                  label: "By Actor ID",
                  callback: () => resolve(false),
                },
              },
              default: "current",
              close: (html) => {},
            }).render(true);
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
            new Dialog({
              title: "Choose Target",
              content: `<p>Which actor should receive the update?</p>`,
              buttons: {
                current: {
                  label: "By Current Actor",
                  callback: () => resolve(true),
                },
                byId: {
                  label: "By Actor ID",
                  callback: () => resolve(false),
                },
              },
              default: "current",
              close: () => {
                return;
              },
            }).render(true);
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
          // const pageToEdit = pages[index];
          // await heraldFlip_editTokenFlip(pageToEdit);
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

// async function heraldFlip_editTokenFlip(page) {
//   const content = page.text.content;

//   const extractValue = (label) => {
//     const regex = new RegExp(`<strong>${label} :<\\/strong>\\s*(.*?)<\\/p>`);
//     const match = content.match(regex);
//     return match ? match[1] : "";
//   };

//   const currentName = extractValue("Profile Name");
//   const currentActorId = extractValue("ActorId");
//   const currentActorName = extractValue("Actor Name");

//   const dialog = new Dialog({
//     title: "Edit Token Profile",
//     content: `
//       <form>
//         <div class="form-group">
//           <label for="edit-profile-name">Profile Name:</label>
//           <input type="text" id="edit-profile-name" name="profileName" value="${currentName}" />
//         </div>
//         <div>Select a Character:</div>
//         <div class="form-group">
//           <div class="heraldFlip-gridActorTokenFlip">
//             ${game.actors
//               .filter(
//                 (actor) =>
//                   actor.type === "character" &&
//                   actor.ownership[game.user.id] >=
//                     CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
//               )
//               .map(
//                 (actor) => `
//                 <div class="heraldFlip-selectActorTokenFlip ${
//                   actor.id === currentActorId ? "selected" : ""
//                 }" data-id="${actor.id}">
//                   <div class="heraldFlip-imgActorTokenFlipWrapper">
//                     <img src="${actor.img}" alt="${actor.name}" />
//                     <div class="heraldFlip-labelActorTokenFlip">${
//                       actor.name
//                     }</div>
//                   </div>
//                 </div>
//               `
//               )
//               .join("")}
//           </div>
//         </div>
//       </form>
//     `,
//     buttons: {},
//     render: (html) => {
//       const confirmButton = $(
//         `<button type="button" class="dialog-button">Save</button>`
//       );
//       const cancelButton = $(
//         `<button type="button" class="dialog-button">Cancel</button>`
//       );
//       html
//         .closest(".app")
//         .find(".dialog-buttons")
//         .append(confirmButton, cancelButton);

//       html.find(".heraldFlip-selectActorTokenFlip").on("click", function () {
//         html.find(".heraldFlip-selectActorTokenFlip").removeClass("selected");
//         this.classList.add("selected");
//       });

//       cancelButton.on("click", () => dialog.close());

//       confirmButton.on("click", async () => {
//         const name = html.find('[name="profileName"]').val()?.trim();
//         const selected = html.find(
//           ".heraldFlip-selectActorTokenFlip.selected"
//         )[0];
//         const actorId = selected?.dataset?.id;

//         if (!name || !actorId) {
//           ui.notifications.warn(
//             "Please fill in both Profile Name and Character."
//           );
//           return;
//         }

//         const actor = game.actors.get(actorId);
//         if (!actor) {
//           ui.notifications.error("Selected actor not found.");
//           return;
//         }

//         let newContent = content
//           .replace(
//             /(<strong>Profile Name :<\/strong>\s*)(.*?)<\/p>/,
//             `$1${name}</p>`
//           )
//           .replace(
//             /(<strong>ActorId :<\/strong>\s*)(.*?)<\/p>/,
//             `$1${actor.id}</p>`
//           )
//           .replace(
//             /(<strong>Actor Name :<\/strong>\s*)(.*?)<\/p>/,
//             `$1${actor.name}</p>`
//           );

//         await page.update({
//           name: name,
//           "text.content": newContent,
//         });

//         dialog.close();
//         await heraldFlip_renderViewFlipMiddleToken();
//       });
//     },
//   });

//   dialog.render(true);
// }

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
  let dialog = new Dialog({
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

        if (game.user.isGM) {
          await heraldFlip_uploadFileDirectly(
            userName,
            heraldFlip_typeSelected,
            file,
            name
          );
        } else {
          await heraldFlip_sendFileToGM(
            userName,
            heraldFlip_typeSelected,
            file,
            name
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
