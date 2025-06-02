import * as helper from "./helper.js";

let heraldFlip_folderName = `Herald's-Flip`;

let heraldFlip_socket;
Hooks.once("socketlib.ready", () => {
  heraldFlip_socket = socketlib.registerModule("herald-flip");
  heraldFlip_socket.register("createFolderPlayer", async (playername) => {
    helper.heraldFLip_createFolder(heraldFlip_folderName);
    await heraldFlip_createFolderPlayer(playername);
  });

  heraldFlip_socket.register(
    "saveFileHeraldFlipBase64",
    async ({ userName, fileName, fileType, base64 }) => {
      try {
        const folderPath = `${heraldFlip_folderName}/${userName}/${fileType}`;

        const savePath = `${folderPath}/${fileName}`;

        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        await FilePicker._write(savePath, bytes, { encoding: "raw" });

        ui.notifications.info(`File saved: ${savePath}`);
        return true;
      } catch (err) {
        console.error("Error saving file:", err);
        ui.notifications.error("Failed to save file.");
        return false;
      }
    }
  );
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
      const success = await heraldFlip_saveFileFlipBase64(game.user.name);
      if (success) app.close();
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
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]); // ambil base64 tanpa header MIME
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

async function heraldFlip_saveFileFlipBase64(userName) {
  const fileInput = document.getElementById("heraldFlip-fileInput");
  const file = fileInput?.files[0];
  const selectedRadio = document.querySelector(
    'input[name="fileType"]:checked'
  );
  const selectedType = selectedRadio ? selectedRadio.value : "token";

  if (!file) {
    ui.notifications.warn("Select File");
    return false;
  }

  try {
    const base64data = await fileToBase64(file);

    await heraldFlip_socket.executeAsGM("saveFileHeraldFlipBase64", {
      userName: userName,
      fileName: file.name,
      fileType: selectedType,
      base64: base64data,
    });

    ui.notifications.info("File sent to GM successfully.");
    return true;
  } catch (err) {
    console.error("Gagal konversi file ke base64:", err);
    ui.notifications.error("Failed to process file.");
    return false;
  }
}

async function heraldFlip_saveFileFlip(username, file, selectedType) {
  if (!file) {
    ui.notifications.warn("Select File");
    return false;
  }

  const folderPath = `${heraldFlip_folderName}/${username}/${selectedType}`;

  try {
    const result = await FilePicker.upload("data", folderPath, file);
    if (result.path) {
      ui.notifications.info(`Success Upload`);
      return true;
    }
  } catch (err) {
    console.error("Gagal upload:", err);
    ui.notifications.error("Upload Unsuccessful");
  }
  return false;
}

export { heraldFlip_renderAccessButton };
