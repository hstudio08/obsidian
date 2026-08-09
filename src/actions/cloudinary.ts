"use server";

export async function uploadToCloudinary(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (!file) throw new Error("No file provided");

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dislib3k";
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "Obsidian";

  const cloudinaryFormData = new FormData();
  cloudinaryFormData.append("file", file);
  cloudinaryFormData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: cloudinaryFormData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Cloudinary Error:", errorText);
    throw new Error(`Cloudinary upload failed`);
  }

  const data = await res.json();
  return data.secure_url;
}
