async function heraldFLip_createFolder(folder) {
  try {
    await FilePicker.createDirectory("data", folder);
    ui.notifications.info(`Folder ${folder} created successfully.`);
  } catch (error) {
    console.log(error);
    console.log("folder sudah dibuat");
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
    if (folder.name == "Herald Flip") {
      heraldFlipFolder = folder;
    }
    if (
      (folder.name == user.name && folder.folder.name == "Herald Flip") ||
      (folder.name == user.name && folder.folder.id == heraldFlipFolder.id)
    ) {
      playerFolder = folder;
    }
  }
  if (!heraldFlipFolder) {
    heraldFlipFolder = await Folder.create({
      name: "Herald Flip",
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

export {
  heraldFLip_createFolder,
  heraldFlip_fileToBase64,
  heraldFlip_createFolderJournal,
};
