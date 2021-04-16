const express = require("express");
const router = express.Router();
const fn = require("../middlewares/functions");
const isAuthenticated = require("../middlewares/isAuthenticated");

const Offer = require("../models/offer");

router.get("/offers/", async (req, res) => {
  const filters = {},
    sort = {},
    pagination = {
      skip: 0,
      limit: fn.getOption("resultsPerPage"),
    };

  if (req.query.title) {
    filters.product_name = new RegExp(req.query.title, "i");
  }

  if (
    req.query.priceMin &&
    !isNaN(req.query.priceMin) &&
    req.query.priceMax &&
    !isNaN(req.query.priceMax)
  ) {
    filters.product_price = {
      $gte: Number(req.query.priceMin),
      $lte: Number(req.query.priceMax),
    };
  } else if (req.query.priceMin && !isNaN(req.query.priceMin)) {
    filters.product_price = { $gte: Number(req.query.priceMin) };
  } else if (req.query.priceMax && !isNaN(req.query.priceMax)) {
    filters.product_price = { $gte: Number(req.query.priceMax) };
  }

  if (
    req.query.sort &&
    (req.query.sort === "price-desc" || req.query.sort === "price-asc")
  ) {
    sort.product_price = req.query.sort === "price-desc" ? "desc" : "asc";
  }

  const totalResults = await Offer.countDocuments(filters);
  let maxPages = Math.round(totalResults / fn.getOption("resultsPerPage"));
  if (maxPages === 0) {
    maxPages += 1;
  }

  if (req.query.page && !isNaN(req.query.page) && Number(req.query.page) > 1) {
    if (req.query.page > maxPages) {
      return res.json({ nb: 0, pages: maxPages, data: {} });
    }

    pagination.limit *= req.query.page;
    pagination.skip = pagination.limit - fn.getOption("resultsPerPage");
  }

  const results = await Offer.find(filters)
    .populate("owner", "account")
    .sort(sort)
    .skip(pagination.skip)
    .limit(pagination.limit);
  return res.json({
    nb: Object.keys(results).length,
    total: totalResults,
    pages: maxPages,
    data: results,
  });
});

router.get("/offer/:id", async (req, res) => {
  if (req.params.id && req.params.id.match(/[A-Za-z]/)) {
    try {
      const offer = await Offer.findById(req.params.id).populate(
        "owner",
        "account"
      );
      if (!offer) {
        return fn.error(res, "Offer not found");
      }
      return res.json(offer);
    } catch (error) {
      return fn.error(res, "Offer not found");
    }
  }
  fn.accesDenied(res);
});

router.post("/offer/publish", isAuthenticated, async (req, res) => {
  const {
    title,
    description,
    price,
    condition,
    city,
    brand,
    size,
    color,
  } = req.fields;

  if (
    title &&
    description &&
    price &&
    condition &&
    city &&
    brand &&
    size &&
    color
  ) {
    const picture = req.files.picture;
    if (description.length > 500) {
      return fn.error(res, "Description must be less than 500 characters.");
    } else if (title.length > 50) {
      return fn.error(res, "Title must be less than 50 characters.");
    } else if (price > 100000) {
      return fn.error(res, "Price must be under 100000.");
    } else if (!fn.isValidPicture(picture)) {
      return fn.error(res, "The picture is not valid.");
    }

    const newOffer = new Offer({
      product_name: title,
      product_description: description,
      product_price: price,
      product_details: [
        {
          MARQUE: brand,
        },
        {
          TAILLE: size,
        },
        {
          ÉTAT: condition,
        },
        {
          COULEUR: color,
        },
        {
          EMPLACEMENT: city,
        },
      ],
      product_image: {},
      owner: req.user,
    });
    try {
      const picture_uploaded = await fn
        .cloudinary()
        .uploader.upload(picture.path, {
          folder: "/vinted/offers/" + newOffer._id,
        });
      newOffer.product_image = picture_uploaded;
      await newOffer.save();
    } catch (error) {
      console.log(error.message);
    }
    return res.json(newOffer);
  }
  fn.error(res, 403);
});

router.put("/offer/update", isAuthenticated, async (req, res) => {
  const {
    id,
    title,
    description,
    price,
    condition,
    city,
    brand,
    size,
    color,
  } = req.fields;

  if (
    id &&
    title &&
    description &&
    price &&
    condition &&
    city &&
    brand &&
    size &&
    color
  ) {
    const picture = req.files.picture;
    try {
      const offer = await Offer.findOne({ _id: id, owner: req.user._id });
      if (description.length > 500) {
        return fn.error(res, "Description must be less than 500 characters.");
      } else if (title.length > 50) {
        return fn.error(res, "Title must be less than 50 characters.");
      } else if (price > 100000) {
        return fn.error(res, "Price must be under 100000.");
      }

      if (picture && !fn.isValidPicture(picture)) {
        return fn.error(res, "The picture is not valid.");
      } else if (picture && fn.isValidPicture(picture)) {
        await fn
          .cloudinary()
          .api.delete_resources(offer.product_image.public_id);
        picture_uploaded = await fn.cloudinary().uploader.upload(picture.path, {
          folder: "/vinted/offers/" + offer._id,
        });
      } else {
        picture_uploaded = offer.product_image;
      }

      const updatedOffer = {
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          {
            MARQUE: brand,
          },
          {
            TAILLE: size,
          },
          {
            ÉTAT: condition,
          },
          {
            COULEUR: color,
          },
          {
            EMPLACEMENT: city,
          },
        ],
        product_image: picture_uploaded,
      };
      await offer.updateOne(updatedOffer);
      return res.json(updatedOffer);
    } catch (error) {
      return fn.error(res, "This offer does not exist", 400);
    }
  }
});

router.delete("/offer/delete", isAuthenticated, async (req, res) => {
  if (req.fields.id) {
    try {
      const offer = await Offer.findOneAndDelete({
        _id: req.fields.id,
        owner: req.user._id,
      });
      await fn.cloudinary().api.delete_resources(offer.product_image.public_id);
      await fn.cloudinary().api.delete_folder("/vinted/offers/" + offer._id);
      return res.json("Offer deleted");
    } catch (error) {
      return fn.error(res, "This offer does not exist", 400);
    }
  }
  fn.error(res, 403);
});

module.exports = router;
