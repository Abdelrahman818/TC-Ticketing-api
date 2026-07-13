const { Readable } = require('stream');
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

async function uploadImage(buffer, filename, folder = 'tickets') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    bufferToStream(buffer).pipe(uploadStream);
  });
}

async function deleteImage(publicId) {
  if (!publicId) {
    return null;
  }

  return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

module.exports = {
  uploadImage,
  deleteImage,
};
