const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'bnhdeqaw',
  api_key: '934761867522257',
  api_secret: 'p2gCjEAPXyXVSzshr41YR-qaQH8'
});

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

const deleteImage = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId);
};

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
           
