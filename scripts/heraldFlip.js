import * as helper from "./helper.js";

let heraldFlip_folderName = `Herald's-Flip`;

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
      await heraldFlip_uploadFileDirectly(userName, fileType, file);
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
      </div>
      <div id="heraldFlip-dialogFlipMiddle" class="heraldFlip-dialogFlipMiddle">
      </div>
      <div id="heraldFlip-dialogFlipBottom" class="heraldFlip-dialogFlipBottom">
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
      const height = 300;

      app.setPosition({
        left: (window.innerWidth - width) / 2,
        top: (window.innerHeight - height) / 2,
        width: width,
        height: height,
        scale: 1.0,
      });
    }

    let saveBtn = document.getElementById("heraldFlip-saveFlipFile");
    saveBtn.addEventListener("click", async (event) => {
      const fileInput = document.getElementById("heraldFlip-fileInput");
      const selectedType = document.querySelector(
        'input[name="fileType"]:checked'
      ).value;
      const userName = game.user.name;
      const file = fileInput.files[0];

      if (game.user.isGM) {
        await heraldFlip_uploadFileDirectly(userName, selectedType, file);
      } else {
        await heraldFlip_sendFileToGM(userName, selectedType, file);
        // await heraldFlip_uploadFileDirectly(userName, selectedType, file);
      }

      app.close();
    });
    await heraldFlip_renderViewFlipMiddle();
  });
}

async function heraldFlip_renderViewFlipMiddle() {
  let flipMiddle = document.getElementById("heraldFlip-dialogFlipMiddle");

  if (flipMiddle) {
    flipMiddle.innerHTML = `
        <div id="heraldFlip-uploadForm" style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div>
                    <label><input type="radio" class="heraldFlip-folderTypeInput" name="fileType" value="token" checked> Token</label>
                </div>
                <div>
                    <label><input type="radio" class="heraldFlip-folderTypeInput" name="fileType" value="art"> Art</label>
                </div>
                <div>
                    <label><input type="radio" class="heraldFlip-folderTypeInput" name="fileType" value="audio"> Audio</label>
                </div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
               <input type="file" id="heraldFlip-fileInput" style="padding: 4px 8px; font-size: 13px; height: 30px;" />
            </div>
        </div>`;
  }
}

async function heraldFlip_uploadFileDirectly(userName, fileType, file) {
  if (!game.user.isGM) {
    ui.notifications.warn("Hanya GM yang dapat mengupload file.");
    return false;
  }


  const folderPath = `${heraldFlip_folderName}/${userName}/${fileType}`;
  try {
    const result = await FilePicker.upload("data", folderPath, file);
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

async function heraldFlip_sendFileToGM(userName, fileType, file) {
  const base64File = await helper.heraldFlip_fileToBase64(file);
  await heraldFlip_socket.executeAsGM("saveFileHeraldFlip", {
    userName,
    fileType,
    fileName: file.name,
    base64: base64File,
  });
}

export { heraldFlip_renderAccessButton };
