const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary con las variables de entorno
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Subir imagen desde buffer
const uploadImage = async (fileBuffer, folder = 'pym') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    const { Readable } = require('stream');
    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

// Eliminar imagen por public_id
const deleteImage = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId);
};

// Obtener URL de avatar optimizada
const getAvatarUrl = (publicId) => {
  return cloudinary.url(publicId, {
    transformation: [
      { width: 200, height: 200, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' }
    ]
  });
};

module.exports = {
  uploadImage,
  deleteImage,
  getAvatarUrl,
  cloudinary
};
