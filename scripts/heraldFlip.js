import * as helper from "./helper.js";
import * as audio from "./audio.js";
import * as art from "./art.js";

let heraldFlip_folderName = `Herald's-Flip`;
let heraldFlip_typeSelected = "token";
let heraldFlip_linkTokenStamp = "https://rolladvantage.com/tokenstamp/";

let heraldFlip_socket;
Hooks.once("socketlib.ready", () => {
  heraldFlip_socket = socketlib.registerModule("herald-flip");
  heraldFlip_socket.register("createFolderPlayer", async (playername) => {
    helper.heraldFLip_createFolder(heraldFlip_folderName);
    await heraldFlip_createFolderPlayer(playername);
  });

  heraldFlip_socket.register("saveFileHeraldFlip", async (data) => {
    if (!game.user.isGM) return;

    const { userName, fileType, fileName, base64 } = data;

    try {
      const blob = await (await fetch(base64)).blob();

      const file = new File([blob], fileName, { type: blob.type });
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
        heraldFlip_socket.executeAsGM("createFolderPlayer", user.name);
        await heraldFlip_showDialogFlip();
      });

      flip.appendChild(accessButton);
      document.body.appendChild(flip);
    })
    .catch((err) => {
      console.error("fail to render: ", err);
    });
}

async function heraldFlip_createFolderPlayer(playername) {
  helper.heraldFLip_createFolder(`${heraldFlip_folderName}/${playername}`);
  helper.heraldFLip_createFolder(
    `${heraldFlip_folderName}/${playername}/Token`
  );
  helper.heraldFLip_createFolder(`${heraldFlip_folderName}/${playername}/Art`);
  helper.heraldFLip_createFolder(
    `${heraldFlip_folderName}/${playername}/Audio`
  );
}

async function heraldFlip_showDialogFlip() {
  const user = game.user;
  let dialogContent = `
    <div id="heraldFlip-dialogFlipContainer" class="heraldFlip-dialogFlipContainer" style="padding:10px;">
      <div id="heraldFlip-dialogFLipTop" class="heraldFlip-dialogFLipTop">
        <div id="heraldFlip-typeContainer" class="heraldFlip-typeContainer">
          <button id="heraldFlip-typeSelectButton" class="heraldFlip-typeSelectButton" data-name="token">Token</button>
        </div>
        <div id="heraldFlip-typeContainer" class="heraldFlip-typeContainer">
          <button id="heraldFlip-typeSelectButton" class="heraldFlip-typeSelectButton" data-name="audio">Audio/Music</button>
        </div>
        <div id="heraldFlip-typeContainer" class="heraldFlip-typeContainer">
          <button id="heraldFlip-typeSelectButton" class="heraldFlip-typeSelectButton" data-name="art">Art</button>
        </div>
      </div>
      <div id="heraldFlip-dialogFlipMiddle" class="heraldFlip-dialogFlipMiddle">
      </div>
      <div id="heraldFlip-dialogFlipBottom" class="heraldFLip-dialogFlipBottom">
        <div id="heraldFlip-saveFlipFileContainer" class="heraldFlip-saveFlipFileContainer">
            <button id="heraldFlip-saveFlipFile" class="heraldFlip-saveFlipFile">Save</button>
        </div>
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
    await heraldFlip_renderViewFlipBottom();
  });
}

async function heraldFlip_renderFlipMiddle() {
  if (heraldFlip_typeSelected == "audio") {
    await heraldFlip_renderViewFlipMiddleAudio();
  } else if (heraldFlip_typeSelected == "art") {
    await heraldFlip_renderViewFlipMiddleArt();
  } else {
    await heraldFlip_renderViewFlipMiddleToken();
  }
}

async function heraldFlip_renderViewFlipMiddleToken() {
  let flipMiddle = document.getElementById("heraldFlip-dialogFlipMiddle");
  const userName = game.user.name;
  const folderPath = `${heraldFlip_folderName}/${userName}/Token`;

  const result = await FilePicker.browse("data", folderPath);
  let images = [];

  if (result.files) {
    const imageFiles = result.files.filter((file) =>
      /\.(webp|png|jpe?g)$/i.test(file)
    );

    images = imageFiles.map((filePath) => {
      const parts = filePath.split("/");
      const fileNameWithExt = parts[parts.length - 1];
      const nameOnly = fileNameWithExt.replace(/\.[^/.]+$/, "");
      const decodedName = decodeURIComponent(nameOnly);
      return {
        name: decodedName,
        path: filePath,
      };
    });
    console.log(images);
  }
  let arrToken = ``;
  for (let img of images) {
    arrToken += `
    <div id="heraldFlip-flipTokenContainer" class="heraldFlip-flipTokenContainer">
      <div id="heraldFlip-flipTokenLeft" class="heraldFlip-flipTokenLeft">
        <div id="heraldFlip-flipTokenImageContainer" class="heraldFlip-flipTokenImageContainer">
          <img src="${img.path}" alt="" class="heraldFlip-flipTokenImage" />
        </div>
      </div>
      <div id="heraldFlip-flipDataMiddle" class="heraldFlip-flipDataMiddle">
        <div id="heraldFlip-flipTokenName" class="heraldFlip-flipTokenName">${img.name}</div>
        <button id="heraldFlip-flipTokenTransform" class="heraldFlip-flipTokenTransform">Transform</button>
        <button id="heraldFlip-flipTokenActorChange" class="heraldFlip-flipTokenActorChange">
          Actor Change
        </button>
      </div>
      <div id="heraldFlip-flipDataRight" class="heraldFlip-flipDataRight">
        <div id="heraldFlip-flipTokenDeleteButton" class="heraldFlip-flipTokenDeleteButton">
            <i class="fa-solid fa-trash"></i>
        </div>
      </div>
    </div>`;
  }
  if (flipMiddle) {
    flipMiddle.innerHTML = arrToken;
  }
}

async function heraldFlip_renderViewFlipMiddleAudio() {
  let flipMiddle = document.getElementById("heraldFlip-dialogFlipMiddle");
  if (flipMiddle) {
    flipMiddle.innerHTML = `
      `;
  }
}

async function heraldFlip_renderViewFlipMiddleArt() {
  let flipMiddle = document.getElementById("heraldFlip-dialogFlipMiddle");

  if (flipMiddle) {
    flipMiddle.innerHTML = `
       `;
  }
}

async function heraldFlip_renderViewFlipBottom() {
  let flipBottom = document.getElementById("heraldFlip-dialogFlipBottom");
  if (flipBottom) {
    flipBottom.innerHTML = `
    <div id="heraldFlip-dialogFlipBottomTop" class="heraldFlip-dialogFlipBottomTop">
        <div class="heraldFlip-tokenChangeContainer">
         
        </div>
       <div id="heraldFlip-tokenStampLink" class="heraldFlip-tokenStampLink" style="cursor:pointer;">
         <img src="/modules/herald-flip/assets/images/tokenstamp_icon.png" alt="" class="" style="width:30px; border:none;" />
      </div>
    </div>
    <div id="heraldFlip-dialogFlipBottomBot" class="heraldFlip-dialogFlipBottomBot">
      <div class="heraldFlip-searchFlipdataContainer">
          <input type="text" id="heraldFlip-searchDataInput" class="heraldFlip-searchDataInput" placeholder="Search..." />
      </div>
      <div id="heraldFlip-addAssetFlip" class="heraldFlip-addAssetFlip">
        <i class="fa-solid fa-plus"></i>
      </div>
    </div>
    `;

    document
      .getElementById("heraldFlip-tokenStampLink")
      ?.addEventListener("click", () => {
        window.open(heraldFlip_linkTokenStamp, "_blank");
      });

    document
      .getElementById("heraldFlip-addAssetFlip")
      ?.addEventListener("click", () => {
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
            </form>
          `,
          buttons: {
            save: {
              label: "Save",
              callback: async (html) => {
                const name = html.find('[name="profileName"]').val();
                const file = html.find('[name="profileFile"]')[0]?.files[0];
                const userName = game.user.name;
                console.log(heraldFlip_typeSelected);
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
              },
            },
            cancel: {
              label: "Cancel",
            },
          },
          default: "save",
        }).render(true);
      });
  }
}

async function heraldFlip_uploadFileDirectly(
  userName,
  fileType,
  file,
  filename
) {
  if (!game.user.isGM) {
    ui.notifications.warn("Hanya GM yang dapat mengupload file.");
    return false;
  }
  const allowedExtensions = {
    token: ["webp", "png", "jpg", "jpeg"],
    art: ["webp", "png", "jpg", "jpeg"],
    audio: ["ogg", "mp3"],
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
  await heraldFlip_socket.executeAsGM("saveFileHeraldFlip", {
    userName,
    fileType,
    fileName: name,
    base64: base64File,
  });
}

export { heraldFlip_renderAccessButton };
