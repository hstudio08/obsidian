export function getCloudinaryThumbnail(url: string | null | undefined, width = 150): string {
  if (!url) return '';
  
  // Check if it's a cloudinary URL
  if (url.includes('res.cloudinary.com')) {
    // Cloudinary URLs typically look like:
    // https://res.cloudinary.com/cloud_name/image/upload/v1234567890/public_id.jpg
    
    // We want to insert the transformation string right after /upload/
    const uploadPath = '/image/upload/';
    const uploadIndex = url.indexOf(uploadPath);
    
    if (uploadIndex !== -1) {
      const beforeUpload = url.substring(0, uploadIndex + uploadPath.length);
      const afterUpload = url.substring(uploadIndex + uploadPath.length);
      
      // Inject transformation parameters: width, height (same as width for square), 
      // crop fill, auto quality, auto format, face detection gravity (if face exists)
      const transformation = `w_${width},h_${width},c_fill,g_face,q_auto,f_auto/`;
      
      return `${beforeUpload}${transformation}${afterUpload}`;
    }
  }
  
  // Return original if not cloudinary or format is unknown
  return url;
}
