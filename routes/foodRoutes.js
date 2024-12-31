const express = require("express");
const { addJwt, getLogout } = require("../controllers/jwt");
const {
  getAllFoods,
  getFeaturedFood,
  getAFood,
  getMyFoods,
  getMyRequested,
  getMyPending,
  getUnavailableIds,
} = require("../controllers/getFood");
const { gateMan } = require("../middlewares/auth");
const { addUser, getUser, addUserMembership, getPremiumTime, updatePremiumTime, checkIsAdmin } = require("../controllers/users");
const { paymentIntent } = require("../controllers/payment");
const {
  addReview,
  deleteReview,
  getAllReview,
  getDashboardData,
} = require("../controllers/reviewFood");
const { addFood, deleteAFood, addRequest } = require("../controllers/postFood");
const {
  updateMyFood,
  putAllMyFoods,
  updateMyReview,
  updateRequestedStatus,
  addTime,
  updateFoodStatus,
  deleteMyRequest,
} = require("../controllers/updateFood");

const router = express.Router();

// jwt
router.post("/jwt", addJwt);
router.get("/logout", getLogout);

// getFood
router.get("/allFoods", getAllFoods);
router.get("/featured-foods", getFeaturedFood);
router.get("/food/:id", getAFood);
router.get("/myFoods", gateMan, getMyFoods);
router.get("/my-requested", gateMan, getMyRequested);
router.get("/pending-request/:id/:email", gateMan, getMyPending);
router.get("/unavailable-ids", gateMan, getUnavailableIds);

// user setup
router.put("/add-user", addUser);
router.get("/isadmin/:email", gateMan, checkIsAdmin);
router.get("/user/:email", gateMan, getUser);
router.patch("/add-user-membership/:email", gateMan, addUserMembership);

// review part
router.post("/add-review", gateMan, addReview);
router.delete("/review", gateMan, deleteReview);
router.get("/all-reviews", getAllReview);
router.get("/user-data", gateMan, getDashboardData);

// post foods
router.post("/add-food", addFood);
router.delete("/delete-food/:email/:id", gateMan, deleteAFood);
router.post("/add-request", addRequest);

// update food part
router.put("/my-all-foods/:email", gateMan, putAllMyFoods);
router.put("/update-food/:id/:email", gateMan, updateMyFood);
router.put("/add-review/:id/:email", gateMan, updateMyReview);
router.put("/requested-status/:id", updateRequestedStatus);
router.put("/add-time/:id", addTime);
router.put("/food-status/:id", updateFoodStatus);
router.delete("/my-request/:email/:id", gateMan, deleteMyRequest);

// payment intent
router.post("/create-payment-intent", paymentIntent);
router.get("/premium-time", getPremiumTime);
router.post("/update-premium-time", updatePremiumTime);

module.exports = router;
