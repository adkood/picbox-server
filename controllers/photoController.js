const Photo = require("../models/photoModel");
const User = require("../models/userModel");
const Count = require("../models/CountModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("../controllers/handlerFactory");
const multer = require("multer");
const fs = require("fs");
const mongoose = require("mongoose");
// const { count } = require("../models/photoModel");

exports.getAllPhotos = factory.getAll(Photo);
exports.updatePhoto = factory.updateOne(Photo);
exports.deletePhoto = factory.deleteOne(Photo);

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `photo-${req.user.id}-${Date.now()}.${ext}`);
  },
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! please upload only images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadPhotoPhoto = upload.single("img");

exports.getPhoto = catchAsync(async (req, res, next) => {
  const UserId = req.user.id;

  //filtering
  let query = Photo.find({
    author: UserId,
  });

  // pagination
  // const page = req.query.page * 1;
  // const limit = req.query.limit * 1 || l;
  // const skip = (page - 1) * limit;

  // query = query.skip(skip).limit(limit);

  const doc = await query;
  // console.log(count);

  res.status(200).json({
    status: "success",
    length: doc.length,
    data: {
      data: doc,
    },
  });
});

exports.getFivePhotos = catchAsync(async (req, res, next) => {
  let query = Photo.find();

  //paging
  let page = req.query.page * 1;
  let limit = req.query.limit * 1;
  let skip = (page - 1) * limit;
  query = query.skip(skip).limit(limit);

  let fivePhotos = await query;
  // console.log(fivePhotos);

  res.status(200).json({
    status: "success",
    length: fivePhotos.length,
    data: {
      data: fivePhotos,
    },
  });
});

exports.uploadPhoto = catchAsync(async (req, res, next) => {
  console.log("*");
  console.log(req.body);

  const doc = await Photo.create({
    title: req.body.title,
    price: req.body.price,
    size: req.body.size,
    width: req.body.width,
    height: req.body.height,
    priceDiscount: req.body.priceDiscount,
    img: {
      data: fs.readFileSync("uploads/" + req.file.filename),
    },
    author: [`${req.user.id}`],
  });

  //---------------------------handling post count-----
  const countData = await Count.findOne({});
  countData.numberOfImagesPosted += 1;
  await countData.save();
  //------------------------------------------

  res.status(201).json({
    status: "success",
    data: {
      data: doc,
    },
  });
});

exports.searchPhotos = catchAsync(async (req, res, next) => {
  var regex = new RegExp(req.params.title, "i");
  console.log(regex);

  let data = await Photo.find({ title: regex });

  console.log(data);

  res.status(200).json({
    status: "success",
    length: data.length,
    data,
  });
});

exports.sortPhoto = async (req, res) => {
  try {
    const { field, order } = req.query;
    const sortOrder = order === "asc" ? 1 : -1;
    const sortedData = await Photo.find().sort({ [field]: sortOrder });
    res.json(sortedData);
    console.log(res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "server error" });
  }
};

exports.getPhotosInBoughtImages = async (req, res) => {
  try {
    const { boughtImages } = req.body;

    const photoIds = boughtImages.map((item) => mongoose.Types.ObjectId(item._id));
    console.log(photoIds);

    const filteredPhotoModels = await Photo.find({
      _id: { $in: photoIds },
    });

    console.log(filteredPhotoModels);

    return res.status(200).json({
      success: true,
      data: {
        filteredPhotoModels,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred" });
  }
};
