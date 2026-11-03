const uploadVehicleArtifact = async (supabase, file, folderPath) => {
  if (!file || !file.buffer) {
    throw new Error("Invalid file attachment: Missing buffer data stream.");
  }

  const extension = file.originalname.split('.').pop();
  const baseName = file.originalname.substring(0, file.originalname.lastIndexOf('.'));
  const sanitizedBase = baseName.replace(/[^a-zA-Z0-9]/g, "_");
  const fullPath = `${folderPath}/${sanitizedBase}.${extension}`;

  console.log(`[STORAGE] Initiating upload stream to path: "${fullPath}"`);

  const { data, error } = await supabase.storage
    .from("vehicles")
    .upload(fullPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) {
    console.error(`[STORAGE ERROR] Failed uploading to "${fullPath}":`, error.message);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from("vehicles")
    .getPublicUrl(fullPath);

  return publicUrlData.publicUrl;
};

module.exports = {
  uploadVehicleArtifact,
};