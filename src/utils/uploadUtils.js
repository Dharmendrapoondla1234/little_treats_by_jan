export function compressImageFile(file, maxDimension = 700, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Couldn't load the image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadImageInChunks(dataUrl, callSheet, onProgress) {
  const [, mimeAndData] = dataUrl.split("data:");
  const mimeType = mimeAndData.split(";")[0];
  const base64 = dataUrl.split(",")[1];

  const CHUNK_SIZE = 3000;
  const chunks = [];
  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    chunks.push(base64.slice(i, i + CHUNK_SIZE));
  }

  const uploadId = "img_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

  for (let i = 0; i < chunks.length; i++) {
    const result = await callSheet({ action: "uploadImageChunk", uploadId, index: i, chunk: chunks[i] });
    if (!result.ok) throw new Error(result.error || "Upload failed partway through.");
    if (onProgress) onProgress(i + 1, chunks.length);
  }

  const final = await callSheet({ action: "finalizeImageUpload", uploadId, total: chunks.length, mimeType });
  if (!final.ok) throw new Error(final.error || "Couldn't finalize the upload.");
  return final.url;
}
