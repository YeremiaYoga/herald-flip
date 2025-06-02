async function heraldFLip_createFolder(folder) {
  console.log(folder);
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

export { heraldFLip_createFolder, heraldFlip_fileToBase64 };
