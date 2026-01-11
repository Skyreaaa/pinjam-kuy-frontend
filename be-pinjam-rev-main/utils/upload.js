const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});


// Storage untuk cover buku
const bookCoverStorage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: 'book-covers',
		allowed_formats: ['jpg', 'jpeg', 'png', 'svg'],
	},
});

// Storage untuk fine proof
const fineProofStorage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: 'fine-proofs',
		allowed_formats: ['jpg', 'jpeg', 'png', 'svg'],
	},
});

// Storage untuk profile picture
const profileStorage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: 'profile',
		allowed_formats: ['jpg', 'jpeg', 'png', 'svg'],
	},
});

// Storage untuk attachment files (PDF, Audio, Video, Presentasi)
const attachmentStorage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: 'book-attachments',
		allowed_formats: ['pdf', 'mp3', 'wav', 'mp4', 'avi', 'ppt', 'pptx', 'doc', 'docx'],
		resource_type: 'auto', // auto-detect (image, video, raw untuk pdf/docs)
	},
});

// Storage untuk return proof (bukti pengembalian buku)
const returnProofStorage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: 'return-proofs',
		allowed_formats: ['jpg', 'jpeg', 'png'],
	},
});

// Storage untuk admin rejection proof (bukti penolakan admin)
const adminRejectionStorage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: 'admin-rejection-proofs',
		allowed_formats: ['jpg', 'jpeg', 'png'],
	},
});

const uploadBookCover = multer({ storage: bookCoverStorage });
const uploadFineProof = multer({ storage: fineProofStorage });
const uploadProfile = multer({ storage: profileStorage });
const uploadAttachment = multer({ storage: attachmentStorage });
const uploadReturnProof = multer({ storage: returnProofStorage });
const uploadAdminRejection = multer({ storage: adminRejectionStorage });

module.exports = {
	uploadBookCover,
	uploadFineProof,
	uploadProfile,
	uploadAttachment,
	uploadReturnProof,
	uploadAdminRejection
};
