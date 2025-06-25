async function heraldFLip_createFolder(folder) {
  try {
    await FilePicker.createDirectory("data", folder);
    console.log("folder sudah dibuat");
  } catch (error) {
    console.log(error);
  }
}

function heraldFlip_fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Gagal konversi file ke base64"));
    reader.readAsDataURL(file);
  });
}

async function heraldFlip_createFolderJournal(user) {
  const folders = await game.folders.filter((f) => f.type === "JournalEntry");
  let heraldFlipFolder = "";
  let playerFolder = "";
  for (let folder of folders) {
    if (folder.name == "Herald's Flip") {
      heraldFlipFolder = folder;
    }
    if (
      (folder.name == user.name && folder.folder.name == "Herald's Flip") ||
      (folder.name == user.name && folder.folder.id == heraldFlipFolder.id)
    ) {
      playerFolder = folder;
    }
  }
  if (!heraldFlipFolder) {
    heraldFlipFolder = await Folder.create({
      name: "Herald's Flip",
      type: "JournalEntry",
    });
  }

  if (!playerFolder) {
    // const hexColor = `${user.color.toString(16).padStart(6, "0")}`;
    playerFolder = await Folder.create({
      name: user.name,
      type: "JournalEntry",
      folder: heraldFlipFolder.id,
      // color: hexColor,
    });
  }

  const journalTitles = ["Token", "Audio", "Art"];
  const existingJournals = game.journal.filter(
    (j) => j.folder?.id === playerFolder.id
  );

  for (let title of journalTitles) {
    const alreadyExists = existingJournals.some((j) => j.name === title);
    if (!alreadyExists) {
      await JournalEntry.create({
        name: title,
        folder: playerFolder.id,
        pages: [],
        ownership: { default: 3 },
      });
    }
  }
}

async function heraldFlip_createFolderPlaylist(user) {
  const audioThemes = [
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
    "Stealth",
    "Quiet Resolve",
    "Battle",
    "Boss",
    "Heroic",
    "Hopeless",
    "Last Stand",
    "Corruption",
    "Chase",
  ];

  const folderName = user.isGM
    ? "Music Library (Herald's Flip)"
    : "Herald's Flip";

  let heraldFlipFolder = game.folders.find(
    (f) => f.name === folderName && f.type === "Playlist" && !f.folder
  );

  if (!heraldFlipFolder) {
    heraldFlipFolder = await Folder.create({
      name: folderName,
      type: "Playlist",
    });
  }

  for (const theme of audioThemes) {
    const playlistName = theme;

    const existingPlaylist = game.playlists.find(
      (p) => p.name === playlistName && p.folder?.id === heraldFlipFolder.id
    );

    if (!existingPlaylist) {
      await Playlist.create({
        name: playlistName,
        folder: heraldFlipFolder.id,
      });
    }
  }
}

function heraldFlip_extractDataFromPage(page) {
  const content = page.text?.content ?? "";

  const extract = (label) => {
    const regex = new RegExp(`<strong>${label}\\s*:</strong>\\s*([^<]*)</p>`);
    const match = content.match(regex);
    return match?.[1]?.trim() || "";
  };

  const imageMatch = content.match(/<img src="([^"]+)"/);
  const imageUrl = imageMatch?.[1] || "";

  return {
    imageUrl,
    profileName: extract("Profile Name"),
    type: extract("Type"),
    actorId: extract("ActorId"),
    actorName: extract("Actor Name"),
    imageName: extract("Image Name"),
    imageExt: extract("Image Ext"),

    theme: extract("Theme"),
    audioName: extract("Audio Name"),
    audioExt: extract("Audio Ext"),
    size: Number(extract("Size")) || 1,
    effect: extract("Effect"),
    items: extract("Items"),
    message: extract("Message"),
  };
}

async function heraldFlip_uploadFileDirectly(
  userName,
  fileType,
  file,
  filename,
  folderPath
) {
  if (!game.user.isGM) {
    ui.notifications.warn("Hanya GM yang dapat mengupload file.");
    return false;
  }
  const includeMp3 = game.settings.get("herald-flip", "audioIncludeMp3");
  const allowedExtensions = {
    Token: ["webp", "png", "jpg", "jpeg"],
    Art: ["webp", "png", "jpg", "jpeg"],
    Audio: includeMp3 ? ["ogg", "mp3"] : ["ogg"],
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

export {
  heraldFLip_createFolder,
  heraldFlip_createFolderJournal,
  heraldFlip_extractDataFromPage,
  heraldFlip_fileToBase64,
  heraldFlip_uploadFileDirectly,
  heraldFlip_createFolderPlaylist,
};
