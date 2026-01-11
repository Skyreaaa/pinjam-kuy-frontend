// File: middleware/upload.js
// Menggunakan Cloudinary untuk upload gambar
const { uploadBookCover, uploadFineProof, uploadProfile, uploadAttachment, uploadReturnProof, uploadAdminRejection } = require('../utils/upload');

module.exports = {
	uploadBookCover,
	uploadFineProof,
	uploadProfile,
	uploadAttachment,
	uploadReturnProof,
	uploadAdminRejection
};